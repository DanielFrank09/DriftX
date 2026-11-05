import {Vector3} from 'three';

// Transport the rig with the rendered chassis before damping its offset.
// Damping world position alone adds speed-dependent distance and visible fore/aft swimming.
export class FollowCamera {
 constructor(){this.anchor=new Vector3();this.delta=new Vector3();this.initialized=false;}
 update(position,look,anchor,target,targetLook,dt,snap=false){
  this.delta.subVectors(anchor,this.anchor);
  if(snap||!this.initialized||this.delta.lengthSq()>144){position.copy(target);look.copy(targetLook);}
  else{position.add(this.delta).lerp(target,1-Math.exp(-dt*7));look.add(this.delta).lerp(targetLook,1-Math.exp(-dt*8));}
  this.anchor.copy(anchor);this.initialized=true;
 }
}
