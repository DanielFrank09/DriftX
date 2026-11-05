import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Rooms} from '../src/network.js';
import {SnapshotBuffer,remotePose} from '../src/snapshots.js';
const flush=()=>new Promise(r=>setImmediate(r));
class Connection extends EventEmitter{
 constructor(peer){super();this.peer=peer;this.open=false;this.dataChannel={bufferedAmount:0};}
 send(packet){if(!this.open)throw new Error('Closed channel');queueMicrotask(()=>{if(this.other.open)this.other.emit('data',structuredClone(packet));});}
 close(){if(!this.open)return;this.open=false;this.emit('close');if(this.other.open){this.other.open=false;this.other.emit('close');}}
}
class FakePeer extends EventEmitter{
 static peers=new Map();static next=0;
 constructor(id){super();this.id=id||'guest-'+(++FakePeer.next);this.connections=[];queueMicrotask(()=>{if(FakePeer.peers.has(this.id)){this.emit('error',{type:'unavailable-id'});return;}FakePeer.peers.set(this.id,this);this.emit('open',this.id);});}
 connect(id){const a=new Connection(id),target=FakePeer.peers.get(id);this.connections.push(a);queueMicrotask(()=>{if(!target){this.emit('error',{type:'peer-unavailable'});return;}const b=new Connection(this.id);target.connections.push(b);a.other=b;b.other=a;target.emit('connection',b);a.open=b.open=true;b.emit('open');a.emit('open');});return a;}
 destroy(){this.destroyed=true;if(FakePeer.peers.get(this.id)===this)FakePeer.peers.delete(this.id);for(const c of this.connections)c.close();}
 reconnect(){}
}
const state=(time=0,car='m4')=>({time,p:[time/1000,1,0],q:[0,0,0,1],v:[1,0,0],steer:0,spin:time/10,score:0,lap:0,best:0,car,track:0,teleport:1});
test('three-player room broadcasts every player atomically without relay packet loss; leave cleans roster',async()=>{
 let now=0;const received=[new Map(),new Map(),new Map()],removed=[[],[],[]],options={PeerClass:FakePeer,now:()=>now,timeout:500};
 const rooms=received.map((map,i)=>new Rooms((id,s)=>map.set(id,s),()=>{},id=>{map.delete(id);removed[i].push(id);},options));
 try{const code=await rooms[0].open();await rooms[1].open(code);await rooms[2].open(code);assert.equal(rooms[1].slot,1);assert.equal(rooms[2].slot,2);
  for(let i=0;i<20;i++){now+=40;rooms[1].send(state(now,'r8'),now);rooms[2].send(state(now,'gt3rs'),now);await flush();rooms[0].send(state(now),now);await flush();}
  for(const map of received)assert.equal(map.size,2);assert.equal(received[1].get(rooms[2].peer.id).time,now);assert.equal(received[2].get(rooms[1].peer.id).car,'r8');
  const leaving=rooms[1].peer.id;rooms[1].close();await flush();now+=40;rooms[0].send(state(now),now);await flush();assert.equal(received[2].has(leaving),false);assert.ok(removed[2].includes(leaving));assert.equal(received[0].size,1);
 }finally{rooms.forEach(r=>r.close());}
});
test('joining a nonexistent room fails and clears connection state',async()=>{
 const room=new Rooms(()=>{},()=>{},()=>{},{PeerClass:FakePeer,timeout:100});await assert.rejects(room.open('ABC234'),/Room not found/);assert.equal(room.connected,false);assert.equal(room.code,null);assert.equal(room.peer,null);
});
test('full rooms reject a ninth client, and a stale close event cannot destroy a replacement room',async()=>{
 const opts={PeerClass:FakePeer,timeout:500},host=new Rooms(()=>{},()=>{},()=>{},opts),guests=[];try{const code=await host.open();for(let i=0;i<7;i++){const r=new Rooms(()=>{},()=>{},()=>{},opts);guests.push(r);await r.open(code);}const ninth=new Rooms(()=>{},()=>{},()=>{},opts);await assert.rejects(ninth.open(code),/Room full/);const old=guests[0].peer;await guests[0].open();old.emit('error',{type:'network'});assert.equal(guests[0].connected,true);}finally{host.close();guests.forEach(r=>r.close());}
});
test('snapshot interpolation tolerates clock offsets, rejects old frames and snaps resets',()=>{
 const b=new SnapshotBuffer(),out=remotePose();b.push(state(1000),9000);b.push(state(1040),9044);assert.equal(b.push(state(1030),9050),false);b.sample(9130,out);assert.ok(out.p.x>1&&out.p.x<1.04);const reset={...state(1080),p:[80,1,0],teleport:2};b.push(reset,9081);b.sample(9200,out);assert.ok(out.p.x>=80&&out.p.x<80.2);assert.equal(b.frames.length,1);
});
