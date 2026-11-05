import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CarPhysics,slipAngle,tractionCurve} from '../src/physics.js';
import {validState} from '../src/network.js';
test('slip angle and rear traction respond to sideways motion and handbrake',()=>{
 assert.equal(slipAngle({x:0,z:-20}),0);
 assert.ok(slipAngle({x:10,z:-20})>.4);
 assert.ok(tractionCurve(.5,4,false)<tractionCurve(0,4,false));
 assert.ok(tractionCurve(.5,4,true)<tractionCurve(.5,4,false));
});
test('raycast suspension settles and forward/reverse inputs propel in the right direction',()=>{
 const p=new CarPhysics();p.reset({x:0,z:0},0);
 for(let i=0;i<180;i++)p.update(1/60,{throttle:0,steer:0,handbrake:false});
 assert.ok(p.body.position.y>.4&&p.body.position.y<1.3,`settled y=${p.body.position.y}`);
 assert.ok(p.vehicle.wheelInfos.every(w=>w.isInContact));
 for(let i=0;i<240;i++)p.update(1/60,{throttle:1,steer:0,handbrake:false});
 assert.ok(p.body.position.z<-15,`forward z=${p.body.position.z}`);
 assert.ok(p.speed>35,`speed=${p.speed}`);
 p.reset({x:0,z:0},0);
 for(let i=0;i<180;i++)p.update(1/60,{throttle:-1,steer:0,handbrake:false});
 assert.ok(p.body.position.z>10,`reverse z=${p.body.position.z}`);
});
test('left steering turns left and handbrake reduces rear traction',()=>{
 const p=new CarPhysics();p.reset({x:0,z:0},0);
 for(let i=0;i<180;i++)p.update(1/60,{throttle:1,steer:0,handbrake:false});
 for(let i=0;i<90;i++)p.update(1/60,{throttle:1,steer:1,handbrake:false});
 assert.ok(p.body.position.x<0,`left x=${p.body.position.x}`);
 const before=p.vehicle.wheelInfos[2].frictionSlip;
 p.update(1/60,{throttle:1,steer:1,handbrake:true});
 assert.ok(p.vehicle.wheelInfos[2].frictionSlip<before);
 assert.ok(Number.isFinite(p.body.position.x));
});
test('network state rejects nonfinite values, malformed arrays and invalid rotations',()=>{
 const s={p:[1,2,3],q:[0,0,0,1],v:[0,0,0],steer:0,spin:0,score:0,lap:0,best:0,time:1,car:'m4'};
 assert.equal(validState(s),true);
 for(const bad of [{...s,p:[NaN,0,0]},{...s,q:[0,0,0,0]},{...s,v:[0,Infinity,0]},{...s,car:'invalid'},{...s,lap:-1},{...s,p:[1,2]}])assert.equal(validState(bad),false);
});
