import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {FollowCamera} from '../src/follow-camera.js';

test('chase distance stays constant through acceleration, braking and reversal at different frame rates',()=>{
 for(const fps of [30,60,144]){
  const rig=new FollowCamera(),position=new Vector3(),look=new Vector3(),anchor=new Vector3(),target=new Vector3(),targetLook=new Vector3(),offset=new Vector3(0,3.6,9);
  for(let i=0;i<fps*12;i++){
   const t=i/fps;anchor.set(0,.53,-40*Math.sin(t*.5));target.copy(anchor).add(offset);targetLook.copy(anchor).add(new Vector3(0,.65,-6));
   rig.update(position,look,anchor,target,targetLook,1/fps);
   assert.ok(position.distanceTo(target)<1e-8,'camera must not stretch its following distance with speed');
   assert.ok(look.distanceTo(targetLook)<1e-8);
  }
  anchor.set(120,.53,-80);target.copy(anchor).add(offset);targetLook.copy(anchor);rig.update(position,look,anchor,target,targetLook,1/fps,true);assert.ok(position.distanceTo(target)<1e-8);
 }
});

test('turning still damps camera offset while following chassis translation',()=>{
 const rig=new FollowCamera(),p=new Vector3(),look=new Vector3(),a=new Vector3(),target=new Vector3(0,3,9),targetLook=new Vector3();rig.update(p,look,a,target,targetLook,1/60);
 a.set(1,0,0);target.set(10,3,0);rig.update(p,look,a,target,targetLook,1/60);assert.ok(p.x>1&&p.x<10);assert.ok(p.z>0&&p.z<9);
});
