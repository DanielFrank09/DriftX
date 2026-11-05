const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const GEAR_RATIOS=[3.25,2.10,1.48,1.13,.90,.72];
export function ackermann(steer,wheelbase,track){if(Math.abs(steer)<1e-5)return [0,0];const radius=wheelbase/Math.tan(Math.abs(steer)),inner=Math.atan(wheelbase/Math.max(.5,radius-track/2)),outer=Math.atan(wheelbase/(radius+track/2));return steer>0?[inner,outer]:[-outer,-inner];}
export class Powertrain{
 constructor(){this.gear=1;this.rpm=950;this.shiftTimer=0;this.throttle=0;}
 reset(){this.gear=1;this.rpm=950;this.shiftTimer=0;this.throttle=0;}
 shift(direction){const next=clamp(this.gear+direction,1,GEAR_RATIOS.length);if(next!==this.gear){this.gear=next;this.shiftTimer=.18;}}
 update(dt,forward,throttle,car,tune){
  this.shiftTimer=Math.max(0,this.shiftTimer-dt);this.throttle+=(throttle-this.throttle)*(1-Math.exp(-dt*8));
  const redline=car.engine?.includes('V10')?8500:car.engine?.includes('ROTOR')?9000:7200;
  const wheelRPM=Math.abs(forward)/(car.radius||.35)*60/(Math.PI*2),shaftRPM=wheelRPM*GEAR_RATIOS[this.gear-1]*3.7;
  if(!tune.manualGear&&this.shiftTimer===0&&forward>1){if(shaftRPM>redline*.86&&this.gear<6)this.shift(1);else if(shaftRPM<redline*.31&&this.gear>1)this.shift(-1);}
  const targetRPM=clamp(shaftRPM+Math.abs(this.throttle)*420,950,redline);this.rpm+=(targetRPM-this.rpm)*(1-Math.exp(-dt*14));
  const normalized=this.rpm/redline,curve=clamp(1.04-1.7*(normalized-.57)**2,.45,1),peakTorque=(car.power||400)*745.7/(redline*.76*Math.PI*2/60)*1.08;
  const raw=peakTorque*GEAR_RATIOS[this.gear-1]*3.7*.86/(car.radius||.35)*curve*(this.shiftTimer>0?.18:1),cap=(car.mass||1150)*9.81*(car.drive==='AWD'?1.05:.72);
  return Math.min(raw,cap)*tune.power;
 }
}
