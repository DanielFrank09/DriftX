import {BoxGeometry,CylinderGeometry,Mesh,MeshStandardMaterial,Euler,Quaternion} from 'three';
export function addGymkhana(group,colliders){
 const foam=new MeshStandardMaterial({color:'#de9c77',flatShading:true,roughness:1}),metal=new MeshStandardMaterial({color:'#637d79',flatShading:true,roughness:1});
 const add=(name,p,half,material,pitch=0)=>{const m=new Mesh(new BoxGeometry(...half.map(n=>n*2)),material);m.name=name;m.position.set(...p);m.rotation.x=pitch;group.add(m);colliders.push({position:p,half,pitch,yaw:0});};
 for(const x of [-11,11]){const pole=new Mesh(new CylinderGeometry(.16,.2,5,6),metal);pole.position.set(x,2.5,0);group.add(pole);colliders.push({position:[x,2.5,0],half:[.2,2.5,.2]});}
 for(const x of [-9,9])add('FigureEightContainer',[x,1.2,12],[3,1.2,1.2],metal);
 for(let i=0;i<5;i++)add('FoamClipBlock',[-8+i*4,.45,-18],[1.5,.45,.6],foam);
 add('JumpRamp',[0,.43,5],[2.5,.15,4],metal,-.12);
}
