const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function newJudge(){return {total:0,combo:0,multiplier:1,lost:0,foul:'',proximity:1};}
// Inputs are meters, m/s, radians and seconds. No network or rendering dependencies.
export function judgeDrift(state,frame,dt){
 dt=clamp(Number.isFinite(dt)?dt:0,0,.1);const angle=Math.abs(frame.slip||0)*180/Math.PI,speed=Math.max(0,frame.speed||0),spin=angle>90&&speed<8;
 const foul=frame.collision?'Barrier collision':frame.hitLead?'Contact with lead car':spin?'Spinout':'';
 if(foul){state.combo=0;state.multiplier=1;state.lost=0;state.foul=foul;state.proximity=1;return {points:0,...state};}
 state.foul='';const valid=(frame.role!=='chase'||(frame.lead&&(frame.lead.headingDot??1)>.7))&&frame.grounded!==false&&angle>=15&&angle<=85&&speed>=8&&frame.inZone!==false;
 if(!valid){state.lost+=dt;if(state.lost>1.2){state.combo=Math.max(0,state.combo-dt*250);state.multiplier=Math.max(1,state.multiplier-dt*1.2);}state.proximity=1;return {points:0,...state};}
 state.lost=0;const anglePoints=angle<35?(angle-15)/20:angle<=60?1:(85-angle)/25,speedPoints=clamp((speed-8)/17,0,1);
 let proximity=1;if(frame.role==='chase'&&frame.lead){const l=frame.lead;const sameDirection=(l.headingDot??1)>.7,matched=Math.abs(speed-l.speed)<8,beside=Math.abs(l.longitudinal??0)<4;if(sameDirection&&matched&&beside&&l.doorDistance<3)proximity=1+2*clamp((3-l.doorDistance)/3,0,1);}
 const clipping=1+.6*clamp(1-(frame.clipDistance??Infinity)/4,0,1);state.multiplier=Math.min(5,state.multiplier+dt*.08);state.proximity=proximity;const points=dt*120*anglePoints*speedPoints*clipping*proximity*state.multiplier;state.combo+=points;state.total+=points;return {points,...state};
}
