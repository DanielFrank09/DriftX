export class QualityController{
 constructor(renderer,sun){this.renderer=renderer;this.sun=sun;this.level=0;this.total=0;this.count=0;this.changedAt=performance.now();this.mode='auto';this.set('auto');}
 set(mode){this.mode=mode;this.level=mode==='low'?2:mode==='medium'?1:0;this.apply();}
 apply(){const ratios=[1.35,1,.8];this.renderer.setPixelRatio(Math.min(devicePixelRatio,ratios[this.level]));this.renderer.setSize(innerWidth,innerHeight);this.sun.castShadow=this.level===0;this.renderer.shadowMap.enabled=this.level===0;this.renderer.shadowMap.needsUpdate=true;}
 tick(dt,now){if(this.mode!=='auto'||document.hidden)return;this.total+=dt;this.count++;if(this.count<180)return;const average=this.total/this.count;this.total=0;this.count=0;if(average>.023&&this.level<2&&now-this.changedAt>5000){this.level++;this.changedAt=now;this.apply();}}
}
