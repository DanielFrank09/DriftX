const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Continuous brush envelope, peak at 8 degrees, predictable kinetic plateau.
export function frictionEnvelope(slip,peak=8*Math.PI/180,kinetic=.76){const u=Math.abs(slip)/peak;return u<=1?Math.sin(u*Math.PI/2):kinetic+(1-kinetic)*Math.exp(-(u-1)*2);}
export function tireForces({alpha,kappa,load,mu=1.1,front=false,camber=0,roll=0,handbrake=false}){
 const patch=clamp(Math.cos(camber+roll),.75,1),limit=Math.max(0,load)*mu*patch;
 let lateral=-Math.sign(alpha)*frictionEnvelope(alpha,8*Math.PI/180,front?.8:.66)*limit*(front?1.06:handbrake?.28:1),longitudinal=Math.sign(kappa)*frictionEnvelope(kappa,.12,.82)*limit;
 const magnitude=Math.hypot(lateral,longitudinal);if(magnitude>limit&&magnitude>0){lateral*=limit/magnitude;longitudinal*=limit/magnitude;}return {lateral,longitudinal,limit};
}
