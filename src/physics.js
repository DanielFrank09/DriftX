import * as C from 'cannon-es';
import { wheelAnchors } from './catalog.js';
import { Powertrain,ackermann } from './powertrain.js';
export const DEFAULT_TUNE={power:1,grip:1,rearGrip:.92,stiffness:32,rideHeight:.3,camber:2,topSpeed:210,assist:true,wing:true,kit:true,neon:false,popupLights:true,manualGear:false,color:'#e2ed87'};
export function slipAngle(v){return Math.atan2(v.x,Math.max(Math.abs(v.z),2));}
export function tractionCurve(angle,base,handbrake){const x=Math.min(1,Math.abs(angle)/.9);return Math.max(.55,base*(1-x*.37)*(handbrake?.36:1));}
const pose=()=>({p:new C.Vec3(),q:new C.Quaternion()});
const copyPose=(to,from)=>{to.p.copy(from.p);to.q.copy(from.q);};
// Cannon stores public x/y/z/w; Three's slerp reads private _x/_y/_z/_w.
// Blend the scalar components explicitly instead of passing a Cannon quaternion to Three.
export function interpolateRotation(out,a,b,t){const sign=a.x*b.x+a.y*b.y+a.z*b.z+a.w*b.w<0?-1:1;out.set(a.x+(b.x*sign-a.x)*t,a.y+(b.y*sign-a.y)*t,a.z+(b.z*sign-a.z)*t,a.w+(b.w*sign-a.w)*t).normalize();return out;}
export class CarPhysics{
 constructor(){
  this.world=new C.World({gravity:new C.Vec3(0,-9.81,0)});this.world.broadphase=new C.SAPBroadphase(this.world);
  const ground=new C.Body({mass:0,shape:new C.Plane()});ground.quaternion.setFromEuler(-Math.PI/2,0,0);ground.updateAABB();this.world.addBody(ground);
  this.body=new C.Body({mass:1150,shape:new C.Box(new C.Vec3(.88,.25,2.1)),linearDamping:.015,angularDamping:.55});
  this.vehicle=new C.RaycastVehicle({chassisBody:this.body,indexRightAxis:0,indexUpAxis:1,indexForwardAxis:2});
  for(let i=0;i<4;i++)this.vehicle.addWheel({radius:.37,directionLocal:new C.Vec3(0,-1,0),axleLocal:new C.Vec3(-1,0,0),chassisConnectionPointLocal:new C.Vec3(i%2===0?-.96:.96,.04,i<2?-1.42:1.42),suspensionStiffness:32,suspensionRestLength:.3,frictionSlip:3.6,dampingRelaxation:3.5,dampingCompression:4.7,maxSuspensionForce:40000,rollInfluence:.025,maxSuspensionTravel:.20,useCustomSlidingRotationalSpeed:false});
  this.vehicle.addToWorld(this.world);this.steer=0;this.slip=0;this.speed=0;this.tune={...DEFAULT_TUNE};this.car={torque:3000,power:400,mass:1150,wheelbase:2.84,width:1.9,radius:.37,grip:1,drive:'RWD'};
  this.localVelocity=new C.Vec3();this.localAngular=new C.Vec3();this.force=new C.Vec3();this.torque=new C.Vec3();this.powertrain=new Powertrain();this.accumulator=0;this.fixedStep=1/60;this.teleport=0;
  this.previous=pose();this.current=pose();this.wheelPrevious=Array.from({length:4},pose);this.wheelCurrent=Array.from({length:4},pose);
 }
 configureCar(config){this.car=config;this.body.mass=config.mass;for(const shape of [...this.body.shapes])this.body.removeShape(shape);this.body.addShape(new C.Box(new C.Vec3(config.width*.43,.25,config.length*.43)));this.body.updateMassProperties();this.body.updateBoundingRadius();this.body.aabbNeedsUpdate=true;wheelAnchors(config).forEach(([x,,z],i)=>{const w=this.vehicle.wheelInfos[i];w.chassisConnectionPointLocal.set(x,.04,z);w.radius=config.radius;});this.powertrain.reset();}
 capture(){this.current.p.copy(this.body.position);this.current.q.copy(this.body.quaternion);for(let i=0;i<4;i++){const w=this.vehicle.wheelInfos[i],contact=w.isInContact;this.vehicle.updateWheelTransform(i);w.isInContact=contact;this.wheelCurrent[i].p.copy(w.worldTransform.position);this.wheelCurrent[i].q.copy(w.worldTransform.quaternion);}}
 reset(position,yaw){const b=this.body;b.position.set(position.x,(this.car.radius||.37)+.27,position.z);b.quaternion.setFromEuler(0,yaw,0);b.velocity.setZero();b.angularVelocity.setZero();b.force.setZero();b.torque.setZero();b.aabbNeedsUpdate=true;this.steer=0;this.speed=0;this.slip=0;this.accumulator=0;this.teleport++;this.powertrain.reset();for(const w of this.vehicle.wheelInfos){w.rotation=0;w.deltaRotation=0;w.suspensionLength=this.tune.rideHeight;w.isInContact=false;}this.capture();copyPose(this.previous,this.current);for(let i=0;i<4;i++)copyPose(this.wheelPrevious[i],this.wheelCurrent[i]);}
 shiftGear(direction){if(this.tune.manualGear)this.powertrain.shift(direction);}
 setObstacles(specs=[]){for(const b of this.obstacles||[])this.world.removeBody(b);this.obstacles=specs.map(s=>{const b=new C.Body({mass:0,shape:new C.Box(new C.Vec3(...s.half))});b.position.set(...s.position);b.quaternion.setFromEuler(0,s.yaw||0,0);b.updateAABB();this.world.addBody(b);return b;});}
 update(dt,input,offroad=false){
  if(!Number.isFinite(dt)||dt<=0)return;this.accumulator+=Math.min(dt,.1);let steps=0;
  while(this.accumulator+1e-9>=this.fixedStep&&steps<6){copyPose(this.previous,this.current);for(let i=0;i<4;i++)copyPose(this.wheelPrevious[i],this.wheelCurrent[i]);this.step(input,offroad);this.capture();this.accumulator-=this.fixedStep;steps++;}
  this.body.vectorToLocalFrame(this.body.velocity,this.localVelocity);this.speed=Math.hypot(this.localVelocity.x,this.localVelocity.z)*3.6;this.slip=slipAngle(this.localVelocity);
 }
 step(input,offroad){
  const b=this.body,t=this.tune,dt=this.fixedStep;b.vectorToLocalFrame(b.velocity,this.localVelocity);const v=this.localVelocity,forward=-v.z,speed=Math.hypot(v.x,v.z),throttle=Math.max(-1,Math.min(1,input.throttle||0)),steering=Math.max(-1,Math.min(1,input.steer||0)),handbrake=!!input.handbrake;
  const slip=slipAngle(v),limit=.52/(1+(speed*3.6/70)**1.35),assist=t.assist&&forward>2?Math.max(-.16,Math.min(.16,-slip*.32)):0;
  const target=steering*limit+assist;this.steer+=(target-this.steer)*(1-Math.exp(-dt*8));const [left,right]=ackermann(this.steer,this.car.wheelbase||2.84,(this.car.width||1.9)-.23);
  const opposing=throttle!==0&&Math.sign(throttle)!==Math.sign(forward)&&Math.abs(forward)>1.3;
  const engine=this.powertrain.update(dt,forward,throttle,this.car,t),direction=opposing?0:Math.sign(this.powertrain.throttle),cap=direction<0?35:t.topSpeed,taper=Math.max(0,1-(speed*3.6/cap)**4),drive=direction*Math.abs(this.powertrain.throttle)*engine*taper;
  let contacts=0;for(const w of this.vehicle.wheelInfos)if(w.isInContact)contacts++;const grounded=contacts>=2;
  for(let i=0;i<4;i++){
   const w=this.vehicle.wheelInfos[i],rear=i>=2;w.suspensionStiffness=t.stiffness;w.suspensionRestLength=t.rideHeight;
   w.frictionSlip=tractionCurve(rear?slip:0,2.05*t.grip*this.car.grip*(rear?t.rearGrip:1)*(offroad?.64:1),rear&&handbrake);
   this.vehicle.setSteeringValue(i===0?left:i===1?right:0,i);
   const share=this.car.drive==='AWD'?(rear?.30:.20):(rear?.5:0);this.vehicle.applyEngineForce(drive*share*(handbrake&&rear?.28:1),i);
   const brake=opposing?b.mass*9.81*.85/240:rear&&handbrake?b.mass*9.81*.65/120:Math.abs(throttle)<.01?.45:0;this.vehicle.setBrake(brake,i);
  }
  if(grounded){
   if(handbrake&&speed>6)b.torque.y+=steering*b.mass*.8;
   b.vectorToLocalFrame(b.angularVelocity,this.localAngular);this.torque.set(-this.localAngular.x*b.mass*.22,-this.localAngular.y*b.mass*(t.assist?.15:.03),-this.localAngular.z*b.mass*.40);b.vectorToWorldFrame(this.torque,this.torque);b.torque.vadd(this.torque,b.torque);
   this.force.set(-b.velocity.x*speed*.42,-(t.wing?1.05:.30)*speed*speed,-b.velocity.z*speed*.42);b.applyForce(this.force);
  }
  this.world.step(dt);
 }
 renderPose(position,quaternion){const a=Math.max(0,Math.min(1,this.accumulator/this.fixedStep));position.copy(this.previous.p).lerp(this.current.p,a);interpolateRotation(quaternion,this.previous.q,this.current.q,a);return a;}
 renderWheel(i,position,quaternion,alpha){position.copy(this.wheelPrevious[i].p).lerp(this.wheelCurrent[i].p,alpha);interpolateRotation(quaternion,this.wheelPrevious[i].q,this.wheelCurrent[i].q,alpha);}
 get gear(){return this.speed<1?'N':this.localVelocity.z>1?'R':this.powertrain.gear;}
 get rpm(){return this.powertrain.rpm;}
}
