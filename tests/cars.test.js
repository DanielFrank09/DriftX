import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Box3} from 'three';
import {CARS,wheelAnchors,createCar} from '../src/cars.js';
import {CarPhysics} from '../src/physics.js';
import {validState} from '../src/network.js';

test('all twelve distinct car meshes are finite, bounded, and stay within the low-poly budget',()=>{
 assert.equal(CARS.length,12);assert.equal(new Set(CARS.map(c=>c.id)).size,12);
 const signatures=new Set();
 for(const config of CARS){const car=createCar(config);car.updateMatrixWorld(true);const bounds=new Box3().setFromObject(car);let triangles=0;
  car.traverse(m=>{if(m.isMesh){const p=m.geometry.getAttribute('position');for(const n of p.array)assert.ok(Number.isFinite(n),config.id+' contains invalid geometry');triangles+=(m.geometry.index?.count||p.count)/3;}});
  assert.ok(triangles<6500,config.id+' triangles='+triangles);assert.ok(bounds.max.y-bounds.min.y<2.1);assert.ok(bounds.max.z-bounds.min.z<config.length+.6);
  assert.equal(car.userData.wheels.length,4);assert.deepEqual(car.userData.anchors,wheelAnchors(config));
  assert.ok(car.getObjectByName('Signature_'+config.id));signatures.add(JSON.stringify([config.cabin,config.nose,config.tail,config.aero]));
 }
 assert.equal(signatures.size,12);
});
test('batching preserves independent paint, aero, bodykit, underglow and pop-up parts',()=>{
 for(const c of CARS){const car=createCar(c,{wing:false,kit:false,neon:false,popupLights:false});for(const key of ['wing','kit','neon','popups']){assert.equal(car.userData[key].visible,false);assert.ok(car.getObjectById(car.userData[key].id));}
  let paintMeshes=0;car.traverse(m=>{if(m.material===car.userData.paint)paintMeshes++;});assert.ok(paintMeshes>0);
  assert.equal(createCar(c,{popupLights:true}).userData.popups.visible,!!c.popup);
 }
});
test('stock body heights preserve car proportions independently of optional wings',()=>{
 for(const c of CARS){const car=createCar(c,{wing:false,kit:false,popupLights:false,neon:false});car.updateMatrixWorld(true);const bounds=new Box3();car.traverseVisible(m=>{if(m.isMesh){m.geometry.computeBoundingBox();bounds.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));}});const height=bounds.max.y-bounds.min.y;assert.ok(Math.abs(height-c.height)<.075,`${c.id}: body height ${height} versus ${c.height}`);}
});
test('each car uses its own track width, wheelbase, mass and collision envelope in physics',()=>{
 const p=new CarPhysics();for(const c of CARS){p.configureCar(c);assert.equal(p.body.mass,c.mass);assert.equal(p.body.shapes.length,1);assert.ok(Math.abs(p.body.shapes[0].halfExtents.z-c.length*.43)<1e-6);
  p.reset({x:0,z:0},0);for(let i=0;i<240;i++)p.update(1/60,{throttle:i>100?1:0,steer:0,handbrake:false});
  assert.ok(p.speed>12,`${c.id} speed=${p.speed}`);assert.ok(Number.isFinite(p.body.position.y)&&p.body.position.y>.3,`${c.id} y=${p.body.position.y}`);
  wheelAnchors(c).forEach(([x,,z],i)=>{assert.equal(p.vehicle.wheelInfos[i].chassisConnectionPointLocal.x,x);assert.equal(p.vehicle.wheelInfos[i].chassisConnectionPointLocal.z,z);assert.equal(p.vehicle.wheelInfos[i].radius,c.radius);});
 }
});
test('all new car IDs can synchronize through friend rooms',()=>{
 for(const c of CARS)assert.equal(validState({p:[0,1,0],q:[0,0,0,1],v:[0,0,0],steer:0,spin:0,score:0,lap:0,best:0,time:1,car:c.id}),true);
});
