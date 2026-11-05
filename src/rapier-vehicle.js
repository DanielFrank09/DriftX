import RAPIER from '@dimforge/rapier3d-compat';
import {Vector3,Quaternion,Euler} from 'three';
import {CARS,wheelAnchors} from './catalog.js';
import {DEFAULT_TUNE} from './physics.js';
import {GEAR_RATIOS,ackermann} from './powertrain.js';
import {resolveBuild} from './parts.js';
import {tireForces} from './tire-model.js';
let initialization;
export function initVehiclePhysics(){return initialization??=RAPIER.init();}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),pose=()=>({p:new Vector3(),q:new Quaternion()});
const copy=(a,b)=>{a.p.copy(b.p);a.q.copy(b.q);};
export class RapierCarPhysics {
 constructor(){
  this.world=new RAPIER.World({x:0,y:-9.81,z:0});this.world.timestep=1/120;this.world.numSolverIterations=6;
  this.ground=this.world.createCollider(RAPIER.ColliderDesc.cuboid(1500,.25,1500).setTranslation(0,-.25,0).setFriction(.6));
  this.rigidBody=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false).setLinearDamping(.018).setAngularDamping(.38).setCcdEnabled(true));
  this.body={position:new Vector3(),quaternion:new Quaternion(),velocity:new Vector3(),angularVelocity:new Vector3()};this.tune={...DEFAULT_TUNE};this.car=CARS[0];
  this.vehicle={wheelInfos:Array.from({length:4},()=>({radius:.35,suspensionLength:.3,isInContact:false,rotation:0,omega:0,normalLoad:0,alpha:0,kappa:0,slipVelocity:0,frictionSlip:1,worldTransform:{position:new Vector3(),quaternion:new Quaternion()}}))};
  this.fixedStep=1/120;this.accumulator=0;this.teleport=0;this.steer=0;this.speed=0;this.slip=0;this.boost=0;this.throttle=0;this.engineRPM=950;this.gearIndex=1;this.shiftTimer=0;this.collision=false;this.rearSlipVelocity=0;
  this.previous=pose();this.current=pose();this.wheelPrevious=Array.from({length:4},pose);this.wheelCurrent=Array.from({length:4},pose);
  this.up=new Vector3();this.forward=new Vector3();this.right=new Vector3();this.point=new Vector3();this.normal=new Vector3();this.force=new Vector3();this.velocity=new Vector3();this.axis=new Vector3();this.localVelocity=new Vector3();this.inverse=new Quaternion();this.steerQ=new Quaternion();this.spinQ=new Quaternion();this.camberQ=new Quaternion();this.zAxis=new Vector3(0,0,1);this.euler=new Euler();this.yAxis=new Vector3(0,1,0);this.xAxis=new Vector3(1,0,0);this.configureCar(this.car);this.reset({x:0,z:0},0);
 }
 configureCar(car){this.car=car;if(this.collider)this.world.removeCollider(this.collider,true);this.collider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(car.width*.43,.23,car.length*.43).setTranslation(0,-.07,0).setMass(car.mass).setFriction(.35).setRestitution(.04),this.rigidBody);this.anchors=wheelAnchors(car).map(([x,,z])=>new Vector3(x,.04,z));this.vehicle.wheelInfos.forEach(w=>w.radius=car.radius);this.gearIndex=1;}
 sync(){const b=this.body,r=this.rigidBody;b.position.copy(r.translation());b.quaternion.copy(r.rotation());b.velocity.copy(r.linvel());b.angularVelocity.copy(r.angvel());this.inverse.copy(b.quaternion).invert();this.localVelocity.copy(b.velocity).applyQuaternion(this.inverse);this.speed=Math.hypot(this.localVelocity.x,this.localVelocity.z)*3.6;this.slip=Math.atan2(this.localVelocity.x,Math.max(Math.abs(this.localVelocity.z),2));}
 reset(p,yaw){this.rigidBody.setTranslation({x:p.x,y:this.car.radius+.27,z:p.z},true);this.steerQ.setFromAxisAngle(this.yAxis,yaw);this.rigidBody.setRotation(this.steerQ,true);this.rigidBody.setLinvel({x:0,y:0,z:0},true);this.rigidBody.setAngvel({x:0,y:0,z:0},true);this.rigidBody.resetForces(true);this.rigidBody.resetTorques(true);this.accumulator=0;this.teleport++;this.steer=this.boost=this.throttle=0;this.engineRPM=950;this.gearIndex=1;this.collision=false;this.sync();for(const w of this.vehicle.wheelInfos){w.omega=w.rotation=0;w.suspensionLength=this.tune.rideHeight;w.isInContact=false;}this.capture();copy(this.previous,this.current);for(let i=0;i<4;i++)copy(this.wheelPrevious[i],this.wheelCurrent[i]);}
 setObstacles(specs=[]){for(const c of this.obstacles||[])this.world.removeCollider(c,true);this.obstacles=specs.map(s=>{const q=new Quaternion().setFromEuler(new Euler(s.pitch||0,s.yaw||0,0));return this.world.createCollider(RAPIER.ColliderDesc.cuboid(...s.half).setTranslation(...s.position).setRotation(q).setFriction(.5));});}
 shiftGear(d){if(this.tune.manualGear){this.gearIndex=clamp(this.gearIndex+d,1,6);this.shiftTimer=.18;}}
 update(dt,input,offroad=false){if(!Number.isFinite(dt)||dt<=0)return;this.accumulator+=Math.min(dt,.1);let steps=0;this.collision=false;while(this.accumulator+1e-10>=this.fixedStep&&steps++<12){copy(this.previous,this.current);for(let i=0;i<4;i++)copy(this.wheelPrevious[i],this.wheelCurrent[i]);this.step(input,offroad);this.capture();this.accumulator-=this.fixedStep;}this.sync();}
 step(input,offroad){
  const dt=this.fixedStep,r=this.rigidBody,b=this.body,t=this.tune,c=this.car,p=this.parameters=resolveBuild(c,t);this.sync();r.resetForces(true);r.resetTorques(true);
  const forwardSpeed=-this.localVelocity.z,speed=b.velocity.length(),gas=clamp(input.throttle||0,-1,1),turn=clamp(input.steer||0,-1,1),opposing=gas!==0&&gas*forwardSpeed<-.8;
  this.throttle+=(gas-this.throttle)*(1-Math.exp(-dt*9));const spoolTarget=Math.abs(this.throttle)>.6&&this.engineRPM>2600?p.boost:0;this.boost+=(spoolTarget-this.boost)*(1-Math.exp(-dt/Math.max(.12,p.spool)));
  this.shiftTimer=Math.max(0,this.shiftTimer-dt);const shaft=Math.abs(forwardSpeed)/c.radius*60/(Math.PI*2)*GEAR_RATIOS[this.gearIndex-1]*3.7;
  if(!t.manualGear&&!this.shiftTimer&&forwardSpeed>2){if(shaft>p.redline*.87&&this.gearIndex<6){this.gearIndex++;this.shiftTimer=.18;}else if(shaft<p.redline*.3&&this.gearIndex>1){this.gearIndex--;this.shiftTimer=.18;}}
  this.engineRPM+=(clamp(shaft+Math.abs(this.throttle)*500,900,p.redline)-this.engineRPM)*(1-Math.exp(-dt*14));
  const peakTorque=p.power*745.7/(p.redline*.76*Math.PI*2/60)*1.08,curve=clamp(1.04-1.7*(this.engineRPM/p.redline-.57)**2,.45,1),torque=peakTorque*curve*GEAR_RATIOS[this.gearIndex-1]*3.7*.86*t.power*(1+this.boost*.65)*(this.shiftTimer?.2:1),cap=gas<0?35:t.topSpeed,taper=clamp(1-(speed*3.6/cap)**4,0,1);
  const lock=p.lock[gas?'accel':'decel'],wheels=this.vehicle.wheelInfos,omegas=wheels.map(w=>w.omega),target=turn*p.steeringLock/(1+(speed*3.6/105)**1.3)+(t.assist&&forwardSpeed>2?clamp(-this.slip*.45,-.22,.22):0);this.steer+=(target-this.steer)*(1-Math.exp(-dt*9));const angles=ackermann(this.steer,c.wheelbase,c.width-.23);
  this.up.set(0,1,0).applyQuaternion(b.quaternion);this.euler.setFromQuaternion(b.quaternion);let slipSum=0;
  for(let i=0;i<4;i++){
   const w=wheels[i],rear=i>=2;this.point.copy(this.anchors[i]).applyQuaternion(b.quaternion).add(b.position);const ray=new RAPIER.Ray(this.point,{x:-this.up.x,y:-this.up.y,z:-this.up.z}),hit=this.world.castRayAndGetNormal(ray,p.rest+.2+c.radius,true,undefined,undefined,this.collider,this.rigidBody);
   w.isInContact=!!hit&&hit.normal.y>.2;w.normalLoad=0;w.suspensionLength=p.rest+.15;if(!w.isInContact){w.rotation+=w.omega*dt;continue;}
   w.suspensionLength=clamp(hit.timeOfImpact-c.radius,.04,p.rest+.2);this.normal.copy(hit.normal);this.point.addScaledVector(this.up,-hit.timeOfImpact);this.velocity.copy(r.velocityAtPoint(this.point));
   const compression=p.rest-w.suspensionLength,damping=2*Math.sqrt(p.spring*c.mass/4)*p.damperRatio;
   w.normalLoad=clamp(p.spring*compression-damping*this.velocity.dot(this.up),0,c.mass*9.81*1.2);this.force.copy(this.normal).multiplyScalar(w.normalLoad);r.addForceAtPoint(this.force,this.point,true);
   this.forward.set(0,0,-1).applyAxisAngle(this.yAxis,rear?0:angles[i]).applyQuaternion(b.quaternion).addScaledVector(this.normal,-this.forward.dot(this.normal)).normalize();this.right.crossVectors(this.forward,this.normal).normalize();const vx=this.velocity.dot(this.forward),vy=this.velocity.dot(this.right);w.alpha=Math.atan2(vy,Math.max(Math.abs(vx),2));w.slipVelocity=Math.abs(vy);
   const mu=1.15*t.grip*c.grip*(rear?t.rearGrip:1)*(offroad?.62:1),lateral=tireForces({alpha:w.alpha,kappa:0,load:w.normalLoad,mu,front:!rear,camber:rear?p.rearCamber:p.frontCamber,roll:this.euler.z,handbrake:rear&&input.handbrake});w.frictionSlip=mu*(rear&&input.handbrake?.74:1);
   let share=c.drive==='AWD'?(rear?.3:.2):(rear?.5:0);if(p.build.diff==='open'&&rear)share*=Math.min(1,(wheels[rear?(i===2?3:2):i].normalLoad||w.normalLoad)/Math.max(1,c.mass*9.81/4));
   const driveTorque=opposing?0:torque*this.throttle*taper*share,brake=opposing?1800:rear&&input.handbrake?2400:Math.abs(gas)<.01?12:0,inertia=1.8;
   let omega=w.omega+(driveTorque+lock*(omegas[i^1]-omegas[i])*inertia*18)*dt/inertia;omega-=clamp(omega,-brake*dt/inertia,brake*dt/inertia);if(rear&&input.handbrake)omega=0;
   const denominator=Math.max(Math.abs(vx),3),stiffness=w.normalLoad*10,available=Math.sqrt(Math.max(0,lateral.limit*lateral.limit-lateral.lateral*lateral.lateral));
   const fx=clamp(stiffness*(omega*c.radius-vx)/denominator/(1+stiffness*c.radius*c.radius*dt/(inertia*denominator)),-available,available);w.omega=rear&&input.handbrake?0:omega-fx*c.radius*dt/inertia;w.omega=clamp(w.omega,-p.redline*Math.PI/30/(GEAR_RATIOS[this.gearIndex-1]*3.7)*1.03,p.redline*Math.PI/30/(GEAR_RATIOS[this.gearIndex-1]*3.7)*1.03);w.kappa=(w.omega*c.radius-vx)/denominator;w.rotation+=w.omega*dt;
   this.force.copy(this.forward).multiplyScalar(fx).addScaledVector(this.right,lateral.lateral);r.addForceAtPoint(this.force,this.point,true);if(rear)slipSum+=w.slipVelocity;
  }
  this.rearSlipVelocity=slipSum/2;
  // Axle anti-roll bars exchange spring load without adding net vertical force.
  for(const left of [0,2]){const a=wheels[left],z=wheels[left+1];if(!a.isInContact||!z.isInContact)continue;const transfer=clamp((z.suspensionLength-a.suspensionLength)*p.spring*.5,-Math.min(a.normalLoad,z.normalLoad)*.6,Math.min(a.normalLoad,z.normalLoad)*.6);for(const [i,sign]of [[left,1],[left+1,-1]]){this.point.copy(this.anchors[i]).applyQuaternion(b.quaternion).add(b.position);this.force.copy(this.up).multiplyScalar(transfer*sign);r.addForceAtPoint(this.force,this.point,true);}}
  if(input.handbrake&&speed>6&&wheels.filter(w=>w.isInContact).length>=3)r.addTorque({x:0,y:turn*c.mass*.65,z:0},true);
  for(const [z,coefficient]of [[-c.wheelbase/2,p.frontAero],[c.wheelbase/2,p.rearAero]]){this.point.set(0,0,z).applyQuaternion(b.quaternion).add(b.position);this.force.set(0,-coefficient*speed*speed,0);r.addForceAtPoint(this.force,this.point,true);}
  this.force.copy(b.velocity).multiplyScalar(-speed*(offroad?1.8:.42));r.addForce(this.force,true);this.world.step();this.world.contactPairsWith(this.collider,other=>{if(other.handle!==this.ground.handle&&speed>2)this.collision=true;});this.sync();
 }
 capture(){const b=this.body;this.current.p.copy(b.position);this.current.q.copy(b.quaternion);for(let i=0;i<4;i++){const w=this.vehicle.wheelInfos[i];w.worldTransform.position.copy(this.anchors[i]).addScaledVector(this.yAxis,-w.suspensionLength).applyQuaternion(b.quaternion).add(b.position);this.steerQ.setFromAxisAngle(this.yAxis,i<2?this.steer:0);this.spinQ.setFromAxisAngle(this.xAxis,-w.rotation);this.camberQ.setFromAxisAngle(this.zAxis,(i%2===0?1:-1)*(i<2?(this.parameters?.frontCamber||0):(this.parameters?.rearCamber||0)));w.worldTransform.quaternion.copy(b.quaternion).multiply(this.steerQ).multiply(this.camberQ).multiply(this.spinQ);this.wheelCurrent[i].p.copy(w.worldTransform.position);this.wheelCurrent[i].q.copy(w.worldTransform.quaternion);}}
 renderPose(position,quaternion){const a=clamp(this.accumulator/this.fixedStep,0,1);position.copy(this.previous.p).lerp(this.current.p,a);quaternion.copy(this.previous.q).slerp(this.current.q,a);return a;}
 renderWheel(i,position,quaternion,a){position.copy(this.wheelPrevious[i].p).lerp(this.wheelCurrent[i].p,a);quaternion.copy(this.wheelPrevious[i].q).slerp(this.wheelCurrent[i].q,a);}
 get gear(){return this.speed<1?'N':this.localVelocity.z>1?'R':this.gearIndex;}
 get rpm(){return this.engineRPM;}
 dispose(){this.world.free();}
}
