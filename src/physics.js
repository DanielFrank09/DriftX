import * as C from 'cannon-es';
import { wheelAnchors } from './catalog.js';
export const DEFAULT_TUNE={power:1,grip:1,rearGrip:.87,stiffness:32,rideHeight:.3,camber:2,topSpeed:210,assist:true,wing:true,kit:true,neon:false,popupLights:true,color:'#e2ed87'};
export function slipAngle(localVelocity){return Math.atan2(localVelocity.x,Math.max(Math.abs(localVelocity.z),2));}
export function tractionCurve(angle,base,handbrake){const slip=Math.min(1,Math.abs(angle)/.7);return Math.max(.45,base*(1-slip*.48)*(handbrake?.25:1));}
export class CarPhysics{
 constructor(){
  this.world=new C.World({gravity:new C.Vec3(0,-19.62,0)});this.world.broadphase=new C.SAPBroadphase(this.world);
  const ground=new C.Body({mass:0,shape:new C.Plane()});ground.quaternion.setFromEuler(-Math.PI/2,0,0);ground.updateAABB();this.world.addBody(ground);
  this.body=new C.Body({mass:1150,shape:new C.Box(new C.Vec3(.88,.3,2.1)),linearDamping:.12,angularDamping:.48});
  this.vehicle=new C.RaycastVehicle({chassisBody:this.body,indexRightAxis:0,indexUpAxis:1,indexForwardAxis:2});
  for(let i=0;i<4;i++)this.vehicle.addWheel({radius:.37,directionLocal:new C.Vec3(0,-1,0),axleLocal:new C.Vec3(-1,0,0),chassisConnectionPointLocal:new C.Vec3(i%2===0?-.96:.96,-.05,i<2?-1.42:1.42),suspensionStiffness:32,suspensionRestLength:.3,frictionSlip:3.6,dampingRelaxation:3.2,dampingCompression:4.8,maxSuspensionForce:40000,rollInfluence:.025,maxSuspensionTravel:.25,customSlidingRotationalSpeed:-25,useCustomSlidingRotationalSpeed:true});
  this.vehicle.addToWorld(this.world);this.steer=0;this.slip=0;this.speed=0;this.tune={...DEFAULT_TUNE};this.car={torque:3000,grip:1,drive:'RWD'};this.localVelocity=new C.Vec3();
 }
 configureCar(config){
  this.car=config;this.body.mass=config.mass;
  for(const shape of [...this.body.shapes])this.body.removeShape(shape);
  this.body.addShape(new C.Box(new C.Vec3(config.width*.43,.25,config.length*.43)));
  this.body.updateMassProperties();this.body.updateBoundingRadius();this.body.aabbNeedsUpdate=true;
  wheelAnchors(config).forEach(([x,,z],i)=>{const wheel=this.vehicle.wheelInfos[i];wheel.chassisConnectionPointLocal.set(x,-.05,z);wheel.radius=config.radius;});
 }
 reset(position,yaw){this.body.position.set(position.x,(this.car.radius||.37)+.27,position.z);this.body.quaternion.setFromEuler(0,yaw,0);this.body.velocity.setZero();this.body.angularVelocity.setZero();this.body.force.setZero();this.body.torque.setZero();this.body.aabbNeedsUpdate=true;this.steer=0;}
 update(dt,input,offroad=false){
  const b=this.body,t=this.tune;b.vectorToLocalFrame(b.velocity,this.localVelocity);const v=this.localVelocity;
  this.speed=Math.hypot(v.x,v.z)*3.6;this.slip=slipAngle(v);
  const steerLimit=.48/(1+this.speed/125),assist=t.assist?Math.max(-.16,Math.min(.16,this.slip*.24)):0;
  const target=input.steer*steerLimit+assist;this.steer+=(target-this.steer)*(1-Math.exp(-dt*9));
  const forward=-v.z,throttle=input.throttle;const opposing=throttle!==0&&Math.sign(throttle)!==Math.sign(forward)&&Math.abs(forward)>1.5;
  const force=opposing?0:throttle*this.car.torque*t.power*Math.max(0,1-(this.speed/t.topSpeed)**2);
  const grounded=this.vehicle.wheelInfos.some(w=>w.isInContact);
  for(let i=0;i<4;i++){
   const w=this.vehicle.wheelInfos[i],rear=i>=2;w.suspensionStiffness=t.stiffness;w.suspensionRestLength=t.rideHeight;
   w.frictionSlip=tractionCurve(rear?this.slip:0,3.8*t.grip*this.car.grip*(rear?t.rearGrip:1)*(offroad?.55:1),rear&&input.handbrake);
   this.vehicle.setSteeringValue(i<2?this.steer:0,i);
   this.vehicle.applyEngineForce(rear?force:(this.car.drive==='AWD'?force*.35:0),i);
   this.vehicle.setBrake(opposing?32:(rear&&input.handbrake?25:(!throttle?1:0)),i);
  }
  if(grounded){
   if(input.handbrake&&this.speed>15)b.torque.y+=input.steer*1800;
   if(t.assist)b.torque.y-=b.angularVelocity.y*220;
   b.applyForce(new C.Vec3(0,-(t.wing?.8:.25)*this.speed*this.speed,0));
  }
  this.world.step(1/60,Math.min(dt,.05),3);
  // Cannon clears isInContact during the render-transform update; retain the solver result.
  for(let i=0;i<4;i++){const w=this.vehicle.wheelInfos[i],contact=w.isInContact;this.vehicle.updateWheelTransform(i);w.isInContact=contact;}
 }
}
