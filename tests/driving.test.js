import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CarPhysics} from '../src/physics.js';
import {ackermann,Powertrain} from '../src/powertrain.js';
import {CARS} from '../src/catalog.js';
import {LapTracker} from '../src/laps.js';
import {Vector3,Quaternion} from 'three';
test('all cars stay grounded and never reverse direction under sustained forward input',()=>{
 for(const car of CARS){const p=new CarPhysics();p.configureCar(car);p.reset({x:0,z:0},0);for(let i=0;i<1800;i++){p.update(i%3===0?1/30:1/120,{throttle:1,steer:0});if(i>120){assert.ok(p.localVelocity.z<=.01,car.id+' reversed');assert.ok(p.body.position.y>.3&&p.body.position.y<.7,car.id+' bounced');}}}
});
test('fixed-timestep handling produces the same trajectory at 30, 60 and 144 render FPS',()=>{
 const runs=[30,60,144].map(fps=>{const p=new CarPhysics();p.configureCar(CARS[0]);p.reset({x:0,z:0},0);for(let i=0;i<fps*6;i++)p.update(1/fps,{throttle:1,steer:.25,handbrake:false});return p;});
 for(const p of runs.slice(1)){assert.ok(p.body.position.distanceTo(runs[0].body.position)<1e-5);assert.ok(Math.abs(p.speed-runs[0].speed)<1e-5);}
});
test('render interpolation converts Cannon quaternions into finite Three transforms at all frame rates',()=>{
 for(const fps of [30,60,144]){const p=new CarPhysics();p.configureCar(CARS[0]);p.reset({x:0,z:0},1.2);const position=new Vector3(),rotation=new Quaternion();for(let i=0;i<fps*3;i++){p.update(1/fps,{throttle:1,steer:.4,handbrake:i>fps*2});const alpha=p.renderPose(position,rotation);for(const n of [...position.toArray(),...rotation.toArray()])assert.ok(Number.isFinite(n));assert.ok(Math.abs(rotation.length()-1)<1e-6);for(let w=0;w<4;w++){p.renderWheel(w,position,rotation,alpha);assert.ok(rotation.toArray().every(Number.isFinite));}}p.reset({x:40,z:20},-1);p.renderPose(position,rotation);assert.ok(rotation.toArray().every(Number.isFinite));}
});
test('Ackermann inside wheel turns more than the outside wheel in either direction',()=>{
 const left=ackermann(.3,2.8,1.6),right=ackermann(-.3,2.8,1.6);assert.ok(left[0]>left[1]);assert.ok(Math.abs(right[1])>Math.abs(right[0]));assert.deepEqual(ackermann(0,2.8,1.6),[0,0]);
});
test('counter-steer assist points toward the velocity instead of amplifying a slide',()=>{
 const p=new CarPhysics();p.configureCar(CARS[0]);p.reset({x:0,z:0},0);p.body.velocity.set(5,0,-20);p.update(1/60,{throttle:0,steer:0,handbrake:false});assert.ok(p.steer<0);assert.ok(Number.isFinite(p.body.position.x));
});
test('automatic gear changes use RPM; manual mode preserves the chosen gear',()=>{
 const p=new Powertrain(),t={power:1,manualGear:false};for(let i=0;i<180;i++)p.update(1/60,45,1,CARS[0],t);assert.ok(p.gear>1);const gear=p.gear;for(let i=0;i<180;i++)p.update(1/60,5,1,CARS[0],{...t,manualGear:true});assert.equal(p.gear,gear);p.shift(-1);assert.equal(p.gear,gear-1);assert.ok(p.rpm>=950);
});
test('lap timing starts on the line and requires ordered checkpoints; teleports invalidate a lap',()=>{
 const t=new LapTracker();let result;t.reset(.96);for(const [p,s]of [[.99,1],[.02,2],[.1,3],[.2,4],[.27,5],[.36,6],[.45,7],[.53,8],[.62,9],[.71,10],[.79,11],[.88,12],[.96,13],[.02,14]]){result=t.update(p,true,s);}assert.equal(result.completed,true);assert.equal(result.time,12);t.update(.8,true,15);assert.equal(t.active,false);
});
