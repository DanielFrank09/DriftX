import {Vector3,Quaternion} from 'three';
export function remotePose(){return {p:new Vector3(),q:new Quaternion(),steer:0,spin:0,susp:[.25,.25,.25,.25]};}
export class SnapshotBuffer{
 constructor(){this.frames=[];this.offset=null;this.lastSender=-Infinity;this.teleport=-1;}
 push(state,arrival){
  if(state.time<=this.lastSender&&state.teleport===this.teleport)return false;
  const last=this.frames.at(-1),jump=last&&Math.hypot(...state.p.map((x,i)=>x-last.state.p[i]))>18;
  if(jump||state.teleport!==this.teleport){this.frames.length=0;this.offset=null;}
  this.teleport=state.teleport;this.lastSender=state.time;const offset=arrival-state.time;this.offset=this.offset===null?offset:Math.min(this.offset+.25,offset);this.frames.push({at:state.time+this.offset,state});if(this.frames.length>24)this.frames.shift();return true;
 }
 sample(now,out){
  if(!this.frames.length)return false;const t=now-110;while(this.frames.length>2&&this.frames[1].at<t)this.frames.shift();
  const a=this.frames[0],b=this.frames[1]||a,duration=Math.max(1,b.at-a.at),u=Math.max(0,Math.min(1,(t-a.at)/duration));
  out.p.fromArray(a.state.p);for(let i=0;i<3;i++)out.p.setComponent(i,a.state.p[i]+(b.state.p[i]-a.state.p[i])*u);
  if(t>b.at){const extra=Math.min(.10,(t-b.at)/1000);for(let i=0;i<3;i++)out.p.setComponent(i,out.p.getComponent(i)+b.state.v[i]*extra);}
  out.q.fromArray(a.state.q).normalize();this.q??=new Quaternion();this.q.fromArray(b.state.q).normalize();out.q.slerp(this.q,u);out.steer=a.state.steer+(b.state.steer-a.state.steer)*u;out.spin=a.state.spin+(b.state.spin-a.state.spin)*u;
  for(let i=0;i<4;i++)out.susp[i]=a.state.susp?.[i]??.25;return true;
 }
}
