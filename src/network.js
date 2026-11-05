import {TRACKS} from './track-catalog.js';
import * as PeerPackage from 'peerjs';
const Peer=PeerPackage.Peer||PeerPackage.default?.Peer||PeerPackage.default;
const util=PeerPackage.util||PeerPackage.default?.util;
import { CAR_IDS } from './catalog.js';
export const ROOM_PROTOCOL=3;
export function validState(s){return !!s&&Array.isArray(s.p)&&s.p.length===3&&s.p.every(n=>Number.isFinite(n)&&Math.abs(n)<10000)&&Array.isArray(s.q)&&s.q.length===4&&s.q.every(n=>Number.isFinite(n)&&Math.abs(n)<=1.01)&&Math.abs(s.q.reduce((a,n)=>a+n*n,0)-1)<.1&&Array.isArray(s.v)&&s.v.length===3&&s.v.every(n=>Number.isFinite(n)&&Math.abs(n)<500)&&Number.isFinite(s.steer)&&Math.abs(s.steer)<2&&Number.isFinite(s.spin)&&Math.abs(s.spin)<1e9&&Number.isFinite(s.score)&&s.score>=0&&s.score<1e9&&Number.isInteger(s.lap)&&s.lap>=0&&s.lap<10000&&Number.isFinite(s.best)&&s.best>=0&&s.best<1e7&&Number.isFinite(s.time)&&CAR_IDS.has(s.car)&&(s.track===undefined||(Number.isInteger(s.track)&&s.track>=0&&s.track<TRACKS.length))&&(s.mode===undefined||['ready','driving','paused','garage'].includes(s.mode))&&(s.paint===undefined||/^#[a-f0-9]{6}$/i.test(s.paint))&&(s.teleport===undefined||(Number.isSafeInteger(s.teleport)&&s.teleport>=0))&&(s.susp===undefined||(Array.isArray(s.susp)&&s.susp.length===4&&s.susp.every(n=>Number.isFinite(n)&&n>=-.1&&n<=1)))&&['rpm','throttle','boost','slipVelocity','redline','cylinders'].every(k=>s[k]===undefined||(Number.isFinite(s[k])&&Math.abs(s[k])<15000))&&['wing','kit','popupLights'].every(k=>s[k]===undefined||typeof s[k]==='boolean');}
const codePattern=/^[A-HJ-NP-Z2-9]{6}$/;
export class Rooms{
 constructor(onState,onStatus,onRemove,options={}){this.onState=onState;this.onStatus=onStatus;this.onRemove=onRemove;this.PeerClass=options.PeerClass||Peer;this.now=options.now||(()=>performance.now());this.timeout=options.timeout||25000;this.links=new Map();this.players=new Map();this.known=new Set();this.generation=0;this.localState=null;this.lastSend=-Infinity;this.sequence=0;this.slot=0;this.connected=false;this.host=false;this.peer=null;this.code=null;this.pendingReject=null;this.options=options;}
 status(message){this.onStatus(message);}
 close(message='OFFLINE'){
  ++this.generation;const peer=this.peer;this.peer=null;this.code=null;this.connected=false;const reject=this.pendingReject;this.pendingReject=null;reject?.(new Error('Connection cancelled.'));
  for(const id of this.known)this.onRemove(id);this.known.clear();for(const link of this.links.values())clearInterval(link.helloTimer);this.links.clear();this.players.clear();peer?.destroy();this.status(message);
 }
 safeSend(c,packet){if(!c?.open||c.dataChannel?.bufferedAmount>65536)return false;try{c.send(packet);return true;}catch{return false;}}
 async open(code){
  this.close();const generation=this.generation;this.host=!code;this.slot=0;this.lastSend=-Infinity;this.sequence=0;this.lastSnapshot=-1;
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';this.code=code?code.trim().toUpperCase():Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>alphabet[n%alphabet.length]).join('');
  if(!codePattern.test(this.code)){this.code=null;throw new Error('Use the six-character code from the host.');}
  this.status('CONNECTING');
  let iceServers=this.options.iceServers;
  if(!iceServers&&typeof import.meta.env?.VITE_ICE_SERVERS==='string'){try{iceServers=JSON.parse(import.meta.env.VITE_ICE_SERVERS);}catch{}}
  if(!iceServers&&this.PeerClass===Peer&&typeof window!=='undefined'){try{const response=await fetch('/api/ice',{signal:AbortSignal.timeout(4000)}),config=await response.json();if(Array.isArray(config.iceServers)){iceServers=config.iceServers;this.relayConfigured=!!config.relayConfigured;}}catch{}}
  if(generation!==this.generation)throw new Error('Connection cancelled.');
  const baseIce=util.defaultConfig.iceServers;const tcpIce=baseIce.filter(s=>[s.urls].flat().some(u=>u.startsWith('turn:'))).map(s=>({...s,urls:[s.urls].flat().filter(u=>u.startsWith('turn:')).map(u=>u+'?transport=tcp')}));
  const peer=new this.PeerClass(this.host?'driftx-v3-'+this.code:undefined,{debug:0,config:{...util.defaultConfig,iceServers:[...baseIce,...tcpIce,...(iceServers||[])]}});this.peer=peer;
  try{
   await new Promise((resolve,reject)=>{let finished=false;const timer=setTimeout(()=>finish(new Error('Connection timed out. The host must be online; a restrictive network may need TURN.')),this.timeout);const finish=error=>{if(finished)return;finished=true;clearTimeout(timer);this.pendingReject=null;error?reject(error):resolve();};this.pendingReject=error=>finish(error);
    peer.on('error',error=>{if(generation!==this.generation)return;const message=error.type==='peer-unavailable'?'Room not found. Check the code and keep the host tab open.':error.type==='unavailable-id'?'That room code is already in use. Create another room.':'Connection failed: '+(error.type||error.message||'network error');if(!this.connected)finish(new Error(message));else this.status(message);});
    peer.on('disconnected',()=>{if(generation!==this.generation)return;this.status(this.connected?'SIGNALING RECONNECTING':'DISCONNECTED');if(!peer.destroyed)peer.reconnect?.();});
    peer.on('open',()=>{if(generation!==this.generation)return;if(this.host){this.connected=true;peer.on('connection',c=>this.bind(c,generation));finish();this.status('ROOM '+this.code);}else{const c=peer.connect('driftx-v3-'+this.code,{reliable:false,serialization:'json'});this.bind(c,generation,finish);}});
   });return this.code;
  }catch(error){if(generation===this.generation)this.close('OFFLINE');throw error;}
 }
 bind(c,generation,finish){
  if(generation!==this.generation){c.close();return;}
  if(this.host&&this.links.size>=7){c.on('open',()=>{this.safeSend(c,{type:'reject',reason:'Room full (8 drivers).'});setTimeout(()=>c.close(),80);});return;}
  const used=new Set([...this.links.values()].map(x=>x.slot));let slot=1;while(used.has(slot))slot++;const link={connection:c,slot,ready:false,lastReceive:this.now()};this.links.set(c.peer,link);
  const welcome=()=>this.safeSend(c,{type:'welcome',protocol:ROOM_PROTOCOL,hostId:this.peer.id,slot:link.slot});
  c.on('iceStateChanged',state=>{if(generation!==this.generation)return;link.iceState=state;if(!this.host&&!this.connected)this.status('CONNECTING · '+state.toUpperCase());});
  c.on('open',()=>{if(generation!==this.generation)return;if(this.host){if(link.ready)welcome();}else{this.status('CONNECTING · HANDSHAKE');const hello=()=>{if(generation===this.generation&&!link.ready)this.safeSend(c,{type:'hello',protocol:ROOM_PROTOCOL});};hello();link.helloTimer=setInterval(hello,300);}});
  c.on('data',packet=>{
   if(generation!==this.generation||!packet||typeof packet!=='object')return;link.lastReceive=this.now();
   if(this.host){
    if(packet.type==='hello'&&packet.protocol===ROOM_PROTOCOL){link.ready=true;welcome();return;}
    if(packet.type==='state'&&link.ready&&Number.isSafeInteger(packet.seq)&&packet.seq>=0&&validState(packet.state)){
     const old=this.players.get(c.peer);if(old&&packet.seq<=old.seq)return;
     this.players.set(c.peer,{id:c.peer,seq:packet.seq,state:packet.state,slot:link.slot});this.known.add(c.peer);this.onState(c.peer,packet.state,false,link.slot);
    }
   }else{
    if(packet.type==='welcome'&&packet.protocol===ROOM_PROTOCOL&&packet.hostId===c.peer&&Number.isInteger(packet.slot)&&packet.slot>=1&&packet.slot<=7){link.ready=true;clearInterval(link.helloTimer);this.connected=true;this.slot=packet.slot;finish?.();this.status('ROOM '+this.code);return;}
    if(packet.type==='reject'){finish?.(new Error(typeof packet.reason==='string'?packet.reason:'Room unavailable.'));return;}
    if(packet.type!=='snapshot'||!link.ready||!Number.isSafeInteger(packet.seq)||packet.seq<=this.lastSnapshot||!Array.isArray(packet.players)||packet.players.length>8)return;this.lastSnapshot=packet.seq;
    const present=new Set();for(const entry of packet.players){if(!entry||typeof entry.id!=='string'||entry.id.length>120||entry.id===this.peer.id||!Number.isSafeInteger(entry.seq)||!validState(entry.state))continue;present.add(entry.id);const old=this.players.get(entry.id);if(old&&entry.seq<=old.seq)continue;this.players.set(entry.id,entry);this.known.add(entry.id);this.onState(entry.id,entry.state,entry.id===c.peer,entry.slot);}
    for(const id of this.known)if(!present.has(id)){this.known.delete(id);this.players.delete(id);this.onRemove(id);}
   }
  });
  const lost=()=>{if(generation!==this.generation)return;clearInterval(link.helloTimer);this.links.delete(c.peer);this.players.delete(c.peer);if(this.known.delete(c.peer))this.onRemove(c.peer);if(!this.host){finish?.(new Error('The host disconnected.'));this.close('HOST DISCONNECTED');}};
  c.on('close',lost);c.on('error',lost);
 }
 send(state,now){
  this.localState=state;if(!this.peer||!this.connected||now-this.lastSend<40)return;this.lastSend=now;const seq=++this.sequence;
  if(this.host){this.players.set(this.peer.id,{id:this.peer.id,seq,state,slot:0});for(const [id,link]of this.links){if(now-link.lastReceive>20000){link.connection.close();continue;}if(link.ready)this.safeSend(link.connection,{type:'snapshot',seq,players:[...this.players.values()]});}}
  else{const link=[...this.links.values()][0];if(link?.ready)this.safeSend(link.connection,{type:'state',seq,state});}
 }
}
