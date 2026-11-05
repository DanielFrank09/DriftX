import * as T from 'three';
export function addMapDetails(group,colliders,c,track){
 const materials=new Map(),batches=new Map();
 const mat=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.9,flatShading:true}));const m=materials.get(color);if(c.theme==='city'&&['#e6b976','#72c6ca','#f0c782','#79cfd0'].includes(color)){m.emissive.set(color);m.emissiveIntensity=.8;}return m;};
 const box=(color,p,s,yaw=0,solid=false)=>{const list=batches.get(color)||[];list.push({p,s,yaw});batches.set(color,list);if(solid)colliders.push({position:p,half:s.map(n=>n/2),yaw});};
 const cone=(color,p,r,h,n=6)=>{const m=new T.Mesh(new T.ConeGeometry(r,h,n),mat(color));m.position.set(...p);group.add(m);return m;};
 if(c.theme==='drag'){
  for(const x of [-10.4,10.4])colliders.push({position:[x,.55,-295],half:[.3,.55,355]});
  for(const side of [-1,1])for(let i=0;i<6;i++){const z=-25-i*55;box('#728b84',[side*23,1.3,z],[12,2.6,36]);box('#d0cbb2',[side*24,3.1,z],[11,.25,35]);for(let j=0;j<3;j++)box(j%2?'#b19a72':'#6d8a81',[side*(18+j*3),1+j*.7,z],[2,.5,35]);}
  for(const z of [20,-90,-200,-310,-420,-540,-640])for(const side of [-1,1]){box('#59736b',[side*15,4,z],[.15,8,.15]);box('#eee1a4',[side*13.9,7.8,z],[2.4,.15,.6]);}
  for(let i=0;i<5;i++)box('#c5c7b7',[35,2.2,25-i*15],[12,4.4,10],0,true);
  box('#5c7871',[0,.02,42],[45,.03,25]);
 }else if(c.theme==='desert'){
  for(let i=0;i<30;i++){const a=i/30*Math.PI*2,r=125+(i%4)*12,h=10+(i%5)*5;cone(i%2?'#b98260':'#a36d54',[Math.cos(a)*r,h/2-1,Math.sin(a)*r],12+i%4*3,h,5);}
  for(let i=0;i<60;i++){const a=i*2.39996,r=35+(i%8)*12,x=Math.cos(a)*r,z=Math.sin(a)*r;if(track.nearest({x,z}).distance<c.width/2+5)continue;const h=2+i%3;box('#5f8060',[x,h/2,z],[.45,h,.45]);box('#5f8060',[x+.6,h*.65,z],[1.4,.3,.3]);box('#5f8060',[x+1.15,h*.85,z],[.3,h*.4,.3]);}
  for(const x of [-20,20])box('#bf9067',[x,4,-104],[3,8,3]);box('#b17e58',[0,7.6,-104],[43,2,4]);
 }else if(c.theme==='city'){
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2,r=117+(i%4)*13,x=Math.cos(a)*r,z=Math.sin(a)*r,h=10+(i*17%32);box(i%3?'#3b5964':'#496e77',[x,h/2,z],[11,h,11],a,true);for(let y=4;y<h;y+=5)box(i%2?'#e6b976':'#72c6ca',[x,y,z],[11.06,.32,11.06],a);}
  for(let i=0;i<track.samples.length-1;i+=30){const p=track.samples[i],t=track.curve.getTangentAt(i/360),side=i%60?-1:1,x=p.x-t.z*side*(c.width/2+3),z=p.z+t.x*side*(c.width/2+3);box('#3f5c65',[x,3.5,z],[.15,7,.15]);box('#f0c782',[x,6.8,z],[1.7,.16,.65]);}
  box('#4b7b80',[0,4,0],[6,8,6],Math.PI/4,true);cone('#79cfd0',[0,10,0],4,5,4);
 }else if(c.theme==='alpine'){
  box('#a18467',[-6,2.5,-97],[18,5,9],0,true);box('#4c6861',[-6,5.4,-97],[21,.6,12]);for(const x of [-12,-6,0])box('#e1d8b0',[x,2.6,-92.45],[2,1.8,.08]);
  box('#77918a',[91,2.2,65],[9,4.4,7],0,true);cone('#cfbb96',[91,5.8,65],7,3,4);
 }else if(c.theme==='coastal'){
  const tower=new T.Mesh(new T.CylinderGeometry(1.8,2.6,15,8),mat('#e5debd'));tower.position.set(103,7.5,82);group.add(tower);cone('#bd7e62',[103,16.4,82],3,3,8);box('#7ccbd0',[103,14.6,82],[3.6,1,3.6]);colliders.push({position:[103,7.5,82],half:[2.4,7.5,2.4]});
  box('#ad9873',[-100,.15,69],[28,.3,5]);for(let x=-112;x<-86;x+=5)box('#796e57',[x,-.8,69],[.3,1.8,4]);
 }else if(c.theme==='dockyard'){
  for(const x of [-97,97]){box('#b79d6f',[x,7,8],[1,14,1],0,true);box('#b79d6f',[x,13.5,8],[1,1,30]);box('#627b76',[x,9.5,20],[.14,8,.14]);box('#627b76',[x,5.4,20],[2,.5,1]);}
 }
 for(const [color,list]of batches){const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mat(color),list.length),dummy=new T.Object3D();list.forEach((b,i)=>{dummy.position.set(...b.p);dummy.scale.set(...b.s);dummy.rotation.set(0,b.yaw,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.name='Landmarks_'+c.theme;group.add(mesh);}
}
