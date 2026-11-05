import Peer from 'peerjs';
import { CAR_IDS } from './catalog.js';
export function validState(s){return !!s&&Array.isArray(s.p)&&s.p.length===3&&s.p.every(n=>Number.isFinite(n)&&Math.abs(n)<10000)&&Array.isArray(s.q)&&s.q.length===4&&s.q.every(n=>Number.isFinite(n)&&Math.abs(n)<=1.01)&&Math.abs(s.q.reduce((a,n)=>a+n*n,0)-1)<.1&&Array.isArray(s.v)&&s.v.length===3&&s.v.every(n=>Number.isFinite(n)&&Math.abs(n)<500)&&Number.isFinite(s.steer)&&Math.abs(s.steer)<2&&Number.isFinite(s.spin)&&Math.abs(s.spin)<1e9&&Number.isFinite(s.score)&&s.score>=0&&s.score<1e9&&Number.isInteger(s.lap)&&s.lap>=0&&s.lap<10000&&Number.isFinite(s.best)&&s.best>=0&&s.best<1e7&&Number.isFinite(s.time)&&typeof s.car==='string'&&CAR_IDS.has(s.car);}
export class Rooms{
 constructor(onState,onStatus,onRemove){this.onState=onState;this.onStatus=onStatus;this.onRemove=onRemove;this.links=new Map();this.lastSend=0;this.host=false;}
 close(){if(this.peer)this.peer.destroy();for(const id of this.links.keys())this.onRemove(id);this.links.clear();this.peer=null;this.code=null;this.onStatus('OFFLINE');}
 async open(code){
  this.close();this.host=!code;this.code=code?.toUpperCase()||Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
  if(!/^[A-Z2-9]{6}$/.test(this.code))throw new Error('Use a six-character room code.');
  const peer=new Peer(this.host?'apex-drift-v1-'+this.code:undefined,{debug:0});this.peer=peer;this.onStatus('CONNECTING');
  peer.on('error',e=>this.onStatus(e.type==='peer-unavailable'?'ROOM NOT FOUND':`CONNECTION ERROR: ${e.type}`));
  peer.on('disconnected',()=>this.onStatus('DISCONNECTED'));
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Signaling timed out. Try again.')),12000);peer.once('open',()=>{clearTimeout(timer);resolve();});peer.once('error',e=>{clearTimeout(timer);reject(e);});});
  if(this.host){peer.on('connection',c=>{if(this.links.size>=7){c.on('open',()=>c.close());return;}this.bind(c);});this.onStatus('ROOM '+this.code);}
  else this.bind(peer.connect('apex-drift-v1-'+this.code,{reliable:false,serialization:'json'}));
  return this.code;
 }
 bind(c){this.links.set(c.peer,c);let last=0;c.on('open',()=>this.onStatus('ROOM '+this.code));c.on('data',packet=>{
  const now=performance.now();if(now-last<20)return;last=now;
  if(packet?.type==='state'&&validState(packet.state)){
   const id=this.host?c.peer:packet.id;if(typeof id!=='string'||id===this.peer.id||id.length>120)return;
   this.onState(id,packet.state,!this.host&&id===c.peer);if(this.host)for(const other of this.links.values())if(other!==c&&other.open)other.send({type:'state',id,state:packet.state});
  }else if(!this.host&&packet?.type==='leave'&&typeof packet.id==='string')this.onRemove(packet.id);
 });c.on('close',()=>{this.links.delete(c.peer);this.onRemove(c.peer);if(this.host){for(const other of this.links.values())if(other.open)other.send({type:'leave',id:c.peer});}else this.close();});c.on('error',()=>this.onStatus('CONNECTION LOST'));}
 send(state,now){if(!this.peer||now-this.lastSend<40)return;this.lastSend=now;const packet={type:'state',id:this.peer.id,state};for(const c of this.links.values())if(c.open)c.send(packet);}
}
