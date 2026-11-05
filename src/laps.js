export class LapTracker{
 reset(progress=.965){this.previous=progress;this.checkpoint=0;this.active=false;this.startedAt=0;}
 constructor(){this.reset();}
 update(progress,onRoad,elapsed){
  const last=this.previous;this.previous=progress;let delta=progress-last;if(delta<-.5)delta+=1;if(delta>.5)delta-=1;
  if(Math.abs(delta)>.1){this.active=false;this.checkpoint=0;return null;}
  if(!onRoad||delta<=0)return null;
  const section=Math.floor(progress*4);if(this.active&&section===this.checkpoint+1)this.checkpoint=section;
  if(last>.9&&progress<.1){const result=this.active&&this.checkpoint===3?{completed:true,time:elapsed-this.startedAt}:{started:true};this.active=true;this.checkpoint=0;this.startedAt=elapsed;return result;}return null;
 }
}
