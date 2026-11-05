import * as T from 'three';
import {QUARTER_MILE} from './drag-race.js';
export function createDragTrack(scene,config){
 const group=new T.Group();scene.add(group);const material=color=>new T.MeshStandardMaterial({color,roughness:1,flatShading:true});
 const box=(name,x,y,z,w,h,d,color)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.name=name;m.position.set(x,y,z);m.receiveShadow=true;group.add(m);return m;};
 box('Left drag lane',-4.5,.022,-295,8.8,.045,710,config.road);box('Right drag lane',4.5,.022,-295,8.8,.045,710,config.road);
 for(const x of [-9.2,0,9.2])box('Lane stripe',x,.065,-295,.14,.008,710,'#eee8cb');
 for(const z of [0,-QUARTER_MILE])for(let i=0;i<18;i++)box('Timing line',i-8.5,.075,z,.98,.012,.65,i%2?'#eee8cb':'#233e40');
 const lights=[];for(let i=0;i<3;i++){const m=box('Countdown amber',0,2.4+i*.4,6,.3,.27,.18,'#af8547');lights.push(m);}const green=box('Launch green',0,2,6,.34,.25,.18,'#3b7052');box('Christmas tree post',0,1.4,6,.1,2.8,.1,'#3a4d4c');
 for(const x of [-10.4,10.4])box('Concrete safety barrier',x,.55,-295,.6,1.1,710,'#c1c6b7');
 for(const z of [-100,-200,-300,-QUARTER_MILE]){box('Distance board',11.5,1.3,z,.18,1.5,1,'#e7c07b');}
 for(const z of [0,-QUARTER_MILE]){for(const x of [-11,11])box('Timing gantry support',x,3,z,.25,6,.25,'#54726b');box(z===0?'START gantry':'FINISH gantry',0,5.8,z,22.5,.65,.45,z===0?'#365b56':'#d7a563');}
 const curve=new T.LineCurve3(new T.Vector3(0,.045,0),new T.Vector3(0,.045,-QUARTER_MILE));
 return {group,config,width:18,length:QUARTER_MILE,curve,samples:curve.getPoints(360),nearest(p){return {distance:Math.hypot(Math.max(0,Math.abs(p.x)),p.z>60?p.z-60:p.z< -650?-650-p.z:0),progress:T.MathUtils.clamp(-p.z/QUARTER_MILE,0,1)};},spawn(slot=0){slot??=0;return {position:new T.Vector3(slot%2?4.5:-4.5,.045,3.5+Math.floor(slot/2)*7),yaw:0,progress:0};},isOutOfBounds:p=>Math.abs(p.x)>130||p.z>120||p.z< -750,setLights(phase,count=0){lights.forEach((m,i)=>{m.material.emissive.set(phase==='countdown'&&3-count>=i?'#e5a53c':'#000000');});green.material.emissive.set(['ready','racing','finished'].includes(phase)?'#4cf078':'#000000');}};
}
