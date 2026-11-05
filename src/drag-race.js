export const QUARTER_MILE=402.336;
export class DragRace{
 reset(z=3.5,now=0){this.phase='countdown';this.greenAt=now+3;this.previousZ=z;this.previousTime=now;this.startedAt=0;this.elapsed=0;this.trap=0;this.reaction=0;return this;}
 update(z,speed,now,inLane=true){
  let event=null;if(this.phase==='countdown'&&now>=this.greenAt){this.phase='ready';event='go';}
  const crossTime=line=>{const u=(this.previousZ-line)/Math.max(1e-8,this.previousZ-z);return this.previousTime+(now-this.previousTime)*Math.max(0,Math.min(1,u));};
  if(this.phase==='ready'&&this.previousZ>0&&z<=0){this.startedAt=crossTime(0);this.reaction=Math.max(0,this.startedAt-this.greenAt);this.phase='racing';event='start';}
  if(this.phase==='racing'){this.elapsed=Math.max(0,now-this.startedAt);if(!inLane){this.phase='invalid';event='invalid';}else if(this.previousZ>-QUARTER_MILE&&z<=-QUARTER_MILE){this.elapsed=crossTime(-QUARTER_MILE)-this.startedAt;this.trap=speed;this.phase='finished';event='finish';}}
  this.previousZ=z;this.previousTime=now;return event;
 }
 get locked(){return this.phase==='countdown';}
 get countdown(){return Math.max(0,Math.ceil(this.greenAt-this.previousTime));}
}
