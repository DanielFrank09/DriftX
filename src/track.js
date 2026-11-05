import * as THREE from 'three';
export const TRACKS=[{name:'Alpine Circuit',tag:'ALPINE / 01',subtitle:'A little altitude. A lot of attitude.',length:'0.65 KM',difficulty:'FLOWING',points:[[-68,42],[-75,-30],[-43,-65],[15,-59],[47,-34],[68,-45],[87,-10],[66,27],[25,16],[12,52],[-29,68]]},{name:'Coastal Loop',tag:'COASTAL / 02',subtitle:'Long sweepers. Endless possibilities.',length:'0.66 KM',difficulty:'FAST',points:[[-75,40],[-85,-20],[-47,-67],[25,-67],[76,-40],[87,20],[49,59],[10,36],[-21,67]]},{name:'Drift Playground',tag:'PLAYGROUND / 03',subtitle:'Find your angle. Make your own line.',length:'0.54 KM',difficulty:'TECHNICAL',points:[[-60,40],[-65,-29],[-27,-50],[8,-25],[46,-50],[70,-8],[36,15],[50,53],[4,63],[-15,26]]}];
const flat=(color)=>new THREE.MeshStandardMaterial({color,flatShading:true,roughness:1});
export function createTrack(scene,index=0){
 const group=new THREE.Group();scene.add(group);const config=TRACKS[index];
 const curve=new THREE.CatmullRomCurve3(config.points.map(([x,z])=>new THREE.Vector3(x,.035,z)),true,'catmullrom',.38);
 const samples=curve.getSpacedPoints(520),tangents=samples.map((_,i)=>curve.getTangentAt(i/520));
 function ribbon(width,offset,material,y){const pos=[],ids=[];for(let i=0;i<samples.length;i++){const p=samples[i],t=tangents[i],n=new THREE.Vector3(-t.z,0,t.x);for(const d of [offset-width/2,offset+width/2])pos.push(p.x+n.x*d,y,p.z+n.z*d);if(i<samples.length-1){const a=i*2;ids.push(a,a+1,a+2,a+1,a+3,a+2);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(ids);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;group.add(mesh);return mesh;}
 ribbon(16,0,flat('#c8d0c0'),.012);ribbon(13,0,flat('#687978'),.035);
 ribbon(.16,-6.25,flat('#ecedda'),.046);ribbon(.16,6.25,flat('#ecedda'),.046);
 const curbGeo=new THREE.BoxGeometry(1,.1,1);const curbMats=[flat('#f4e7d2'),flat('#d98f79')];
 const curbs=curbMats.map(m=>new THREE.InstancedMesh(curbGeo,m,174)),counts=[0,0],tile=new THREE.Object3D();
 for(let i=0;i<samples.length-1;i+=3){for(const side of [-1,1]){const p=samples[i],t=tangents[i],color=Math.floor(i/3)%2;tile.position.set(p.x-t.z*6.8*side,.065,p.z+t.x*6.8*side);tile.rotation.y=Math.atan2(t.x,t.z);tile.scale.set(.75,1,curve.getLength()/520*3+.05);tile.updateMatrix();curbs[color].setMatrixAt(counts[color]++,tile.matrix);}}
 curbs.forEach((m,i)=>{m.count=counts[i];group.add(m);});
 // Checkerboard start line.
 const p=samples[0],t=tangents[0];for(let x=0;x<12;x++)for(let z=0;z<2;z++){const m=new THREE.Mesh(new THREE.BoxGeometry(1,.015,.65),flat((x+z)%2?'#34494a':'#f6f1dc'));m.position.set(p.x-t.z*(x-5.5)+t.x*(z-.5)*.65,.065,p.z+t.x*(x-5.5)+t.z*(z-.5)*.65);m.rotation.y=Math.atan2(t.x,t.z);group.add(m);}
 const gate=new THREE.Group();gate.position.copy(p);gate.rotation.y=Math.atan2(t.x,t.z);group.add(gate);
 for(const x of [-8,8]){const post=new THREE.Mesh(new THREE.BoxGeometry(.45,6,.45),flat('#e2e9cf'));post.position.set(x,3,0);gate.add(post);}const beam=new THREE.Mesh(new THREE.BoxGeometry(16.5,1,.5),flat('#344e4c'));beam.position.y=5.7;gate.add(beam);
 const cv=document.createElement('canvas');cv.width=512;cv.height=64;const ctx=cv.getContext('2d');ctx.fillStyle='#344e4c';ctx.fillRect(0,0,512,64);ctx.fillStyle='#e8efcb';ctx.textAlign='center';ctx.font='bold 36px sans-serif';ctx.fillText('A P E X   /   D R I F T   C L U B',256,46);const sign=new THREE.Mesh(new THREE.PlaneGeometry(14,.78),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),side:THREE.DoubleSide}));sign.position.set(0,5.7,.27);gate.add(sign);
 function nearest(pos){let distance=Infinity,idx=0;for(let i=0;i<samples.length-1;i++){const d=(samples[i].x-pos.x)**2+(samples[i].z-pos.z)**2;if(d<distance){distance=d;idx=i;}}return {distance:Math.sqrt(distance),progress:idx/(samples.length-1)};}
 return {group,curve,samples,config,nearest,spawn:()=>({position:curve.getPointAt(.965),yaw:Math.atan2(-curve.getTangentAt(.965).x,-curve.getTangentAt(.965).z)})};
}
export function createEnvironment(scene){
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(2500,2500),flat('#a8bba0'));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);
 const hillMats=['#899f91','#91a798','#a1b3a0'].map(flat);
 let seed=8;function rand(){seed=(seed*16807)%2147483647;return seed/2147483647;}
 for(let i=0;i<36;i++){const a=i/36*Math.PI*2,r=210+rand()*150,h=30+rand()*90;const m=new THREE.Mesh(new THREE.ConeGeometry(45+rand()*65,h,5),hillMats[i%3]);m.position.set(Math.cos(a)*r,h/2-3,Math.sin(a)*r);m.rotation.y=rand()*5;scene.add(m);if(i%3===0){const cap=new THREE.Mesh(new THREE.ConeGeometry(15,h*.3,5),flat('#e1e6d9'));cap.position.copy(m.position);cap.position.y=h*.86;scene.add(cap);}}
 const treeGeo=new THREE.ConeGeometry(2.2,7,5),treeMat=flat('#4f7969'),trunkMat=flat('#7d7761');const trees=new THREE.InstancedMesh(treeGeo,treeMat,260),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.23,.35,2.5,5),trunkMat,260);const dummy=new THREE.Object3D();
 for(let i=0;i<260;i++){const a=rand()*Math.PI*2,r=105+rand()*100,x=Math.cos(a)*r,z=Math.sin(a)*r,s=.6+rand();dummy.position.set(x,3.8*s,z);dummy.scale.setScalar(s);dummy.rotation.y=rand()*6;dummy.updateMatrix();trees.setMatrixAt(i,dummy.matrix);dummy.position.y=1.2*s;dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);}trees.castShadow=true;scene.add(trees,trunks);
 // A few trackside rocks and infield trees.
 for(let i=0;i<24;i++){const a=rand()*6.28,r=12+rand()*15;const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1+rand()*2,0),flat('#c2ccbb'));rock.position.set(Math.cos(a)*r,.5,Math.sin(a)*r);rock.scale.y=.65;scene.add(rock);}
}
