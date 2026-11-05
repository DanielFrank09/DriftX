import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CARS,wheelAnchors } from './catalog.js';
import { buildBody,buildCockpit,buildAero,conformFascia,crossSection } from './car-shapes.js';

const material=(color,roughness=.65)=>new T.MeshStandardMaterial({color,roughness,metalness:.08,flatShading:true});
function mesh(parent,geometry,mat,name){const m=new T.Mesh(geometry,mat);m.name=name||'';m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,w,h,d,x,y,z,m,name){const o=mesh(p,new T.BoxGeometry(w,h,d),m,name);o.position.set(x,y,z);return o;}
function polygon(p,points,m,normal){const v=points.map(a=>new T.Vector3(...a));const n=new T.Vector3().subVectors(v[1],v[0]).cross(new T.Vector3().subVectors(v[2],v[0]));if(n.dot(new T.Vector3(...normal))<0)v.reverse();const pos=[];for(let i=1;i<v.length-1;i++)for(const a of [v[0],v[i],v[i+1]])pos.push(a.x,a.y,a.z);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();return mesh(p,g,m);}
function bar(p,from,to,r,m){const a=new T.Vector3(...from),b=new T.Vector3(...to),delta=b.clone().sub(a);const o=mesh(p,new T.CylinderGeometry(r,r,delta.length(),5),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
function disc(p,x,y,z,r,m,depth=.035){const o=mesh(p,new T.CylinderGeometry(r,r,depth,12),m);o.rotation.x=Math.PI/2;o.position.set(x,y,z);return o;}
function feature(p,name){const g=new T.Group();g.name=name;p.add(g);return g;}
// Merge static pieces by material, preserving independently switchable part groups.
function batch(group){const buckets=new Map();for(const child of [...group.children]){if(!child.isMesh){batch(child);continue;}child.updateMatrix();let g=child.geometry.clone().applyMatrix4(child.matrix);if(g.index)g=g.toNonIndexed();g.deleteAttribute('uv');const list=buckets.get(child.material)||[];list.push(g);buckets.set(child.material,list);group.remove(child);child.geometry.dispose();}for(const [m,geos] of buckets){const combined=mergeGeometries(geos);mesh(group,combined,m);geos.forEach(g=>g.dispose());}}

function signatures(parent,c,m){
 const {paint,black,glass,lamp,red,amber,metal}=m,w=c.width,h=c.length/2,F=-h-.012,R=h+.012;
 const details=feature(parent,'Signature_'+c.id);
 const rect=(W,H,x,y,z,mat=black)=>box(details,W,H,.026,x,y,z,mat);
 const round=(x,y,z,r,mat=red)=>disc(details,x,y,z,r,mat);
 const lower=(W=w*.6,H=.16,y=-.06)=>rect(W,H,0,y,F);
 const pipes=(xs,y=-.17,r=.07)=>xs.forEach(x=>{disc(details,x,y,R+.05,r*1.24,metal,.10);disc(details,x,y,R+.11,r,black,.012);});
 const strip=(a,b,z,mat=lamp,r=.016)=>bar(details,[...a,z],[...b,z],r,mat);
 const pairLights=(width=.45,height=.10,y=c.nose-.02)=>{for(const s of [-1,1])rect(width,height,s*w*.31,y,F,lamp);};
 const sideVent=(z,wide=.65)=>{for(const s of [-1,1]){const point=(zz,y)=>[s*(crossSection(c,zz).half+.008),y,zz];polygon(details,[point(z-wide/2,-.10),point(z-wide/2+.16,c.deck-.04),point(z+wide/2,c.deck+.01),point(z+wide/2,-.08)],black,[s,0,0]);}};
 const louver=(start,count=5)=>{for(let i=0;i<count;i++){const z=start+i*.13,o=box(details,w*.60,.018,.035,0,crossSection(c,z).y+.04,z,black);o.userData.surfaceFitted=true;}};
 if(c.id==='m4'){
  for(const s of [-1,1]){const center=s*.22;polygon(details,[[center-.12,.29,F-.022],[center+.12,.29,F-.022],[center+.175,.18,F-.022],[center+.16,-.19,F-.022],[center-.16,-.19,F-.022],[center-.175,.18,F-.022]],black,[0,0,-1]);for(let i=0;i<4;i++)rect(.27,.012,center,-.12+i*.105,F-.04,glass);rect(.33,.15,s*w*.36,-.13,F);rect(.43,.12,s*w*.31,c.nose-.02,F,glass);for(const dx of [-.11,.11]){strip([s*w*.31+dx-.05,c.nose+.005],[s*w*.31+dx,c.nose-.055],F-.025);strip([s*w*.31+dx,c.nose-.055],[s*w*.31+dx+.05,c.nose+.005],F-.025);}strip([s*.83,c.tail-.05],[s*.43,c.tail-.05],R,red,.025);strip([s*.83,c.tail-.05],[s*.83,c.tail-.14],R,red,.025);box(details,.035,.07,.32,s*w*.5,c.deck-.12,-.91,black);}
  pipes([-.65,-.47,.47,.65]);
 }else if(c.id==='r8'){
  polygon(details,[[-.70,.20,F],[-.49,.30,F],[.49,.30,F],[.70,.20,F],[.59,-.19,F],[-.59,-.19,F]],black,[0,0,-1]);
  for(const s of [-1,1]){rect(.32,.20,s*w*.40,-.04,F);rect(.46,.08,s*w*.31,c.nose,F,lamp);polygon(details,[[s*crossSection(c,.40).half,-.06,.40],[s*w*.40,c.cabin[4]-.08,.40],[s*w*.39,c.cabin[4]-.11,.76],[s*crossSection(c,1.10).half,.24,1.10],[s*crossSection(c,1.05).half,-.10,1.05]],black,[s,0,0]);rect(.54,.08,s*w*.30,c.tail-.05,R,red);rect(.55,.17,s*w*.29,.05,R);round(s*.65,-.16,R+.025,.12,black);}
  box(details,w*.56,.025,.80,0,c.tail+.028,1.52,glass);louver(1.22,5);pipes([-.65,.65],-.16,.10);
 }else if(c.id==='huracan'){
  for(const s of [-1,1]){polygon(details,[[s*.35,.25,F],[s*.80,.19,F],[s*.74,.10,F],[s*.42,.13,F]],glass,[0,0,-1]);strip([s*.44,.19],[s*.65,.17],F-.025);strip([s*.65,.17],[s*.76,.22],F-.025);strip([s*.65,.17],[s*.74,.12],F-.025);polygon(details,[[s*.37,.02,F],[s*.82,.06,F],[s*.78,-.18,F],[s*.29,-.18,F]],black,[0,0,-1]);strip([s*.39,c.tail-.06],[s*.79,c.tail-.06],R,red,.022);strip([s*.65,c.tail-.06],[s*.77,c.tail-.13],R,red,.018);}
  sideVent(.72,.8);rect(w*.86,.16,0,.08,R);louver(1.10,6);pipes([-.67,-.49,.49,.67]);
 }else if(c.id==='r32'){
  pairLights(.49,.14,c.nose-.015);rect(.48,.12,0,c.nose-.02,F);lower(.97,.19,-.10);for(const s of [-1,1]){rect(.21,.11,s*.69,-.12,F,amber);rect(.66,.26,s*.45,c.tail-.10,R);for(const x of [.32,.60])round(s*x,c.tail-.10,R+.025,.103);}for(const side of [-1,1]){const a=-c.wheelbase/2+c.axleOffset,b=c.wheelbase/2+c.axleOffset;for(const [start,end]of [[-h+.15,a-.42],[a+.42,b-.42],[b+.42,h-.15]])box(details,.018,.04,end-start,side*(w*.5+.01),-.02,(start+end)/2,black);}pipes([-.64],-.16,.10);
 }else if(c.id==='r35'){
  lower(1.12,.34,.02);for(const s of [-1,1]){polygon(details,[[s*.43,.41,F],[s*.82,.47,F],[s*.83,.26,F],[s*.50,.22,F]],black,[0,0,-1]);polygon(details,[[s*.48,.39,F-.025],[s*.79,.43,F-.025],[s*.78,.31,F-.025],[s*.55,.27,F-.025]],lamp,[0,0,-1]);rect(.18,.08,s*.77,-.14,F,lamp);round(s*.65,c.tail-.10,R,.14);round(s*.32,c.tail-.10,R,.112);box(details,.02,.17,.28,s*w*.501,.16,-.98,black);box(details,.16,.02,.25,s*.34,c.deck-.07,-1.31,black);}pipes([-.69,-.49,.49,.69],-.16,.08);
 }else if(c.id==='gt3rs'){
  for(const s of [-1,1]){const headlight=new T.Group();headlight.position.set(s*.64,.385,F+.13);headlight.rotation.x=.58;details.add(headlight);disc(headlight,0,0,0,.17,black);disc(headlight,0,0,-.024,.14,lamp);for(const dx of [-1,1])for(const dy of [-1,1])disc(headlight,dx*.05,dy*.057,-.047,.024,black);rect(.4,.18,s*.61,-.08,F);for(let i=0;i<3;i++){const z=-1.43+i*.12,o=box(details,.22,.015,.035,s*.64,crossSection(c,z).y+crossSection(c,z).shoulder*.75+.027,z,black);o.userData.surfaceFitted=true;}box(details,.035,.12,.40,s*w*.505,.10,1.2,black);}
  lower(.64,.14,-.09);rect(w*.83,.035,0,c.tail-.03,R,red);louver(1.36,4);pipes([-.15,.15],-.17,.075);
 }else if(c.id==='supra'){
  for(const s of [-1,1]){rect(.51,.16,s*.51,c.nose,F,black);for(let i=0;i<3;i++)round(s*(.34+i*.15),c.nose,F-.025,.058,lamp);rect(.69,.20,s*.44,c.tail-.09,R);for(const x of [.24,.43,.61,.75])round(s*x,c.tail-.09,R+.025,x>.6?.057:.072,x>.7?amber:red);}
  lower(1.15,.20,-.10);sideVent(.99,.40);pipes([-.62],-.16,.105);
 }else if(c.id==='rx7'){
  lower(1.04,.16,-.12);for(const s of [-1,1])rect(.32,.05,s*.60,.07,F,lamp);rect(w*.91,.21,0,c.tail-.08,R);for(const s of [-1,1])for(const x of [.31,.57])round(s*x,c.tail-.08,R+.025,.092);sideVent(.86,.32);pipes([-.55,-.38],-.16,.07);
 }else if(c.id==='c8'){
  for(const s of [-1,1]){polygon(details,[[s*.35,.24,F],[s*.78,.34,F],[s*.71,.20,F],[s*.45,.13,F]],lamp,[0,0,-1]);polygon(details,[[s*.33,.00,F],[s*.85,.07,F],[s*.75,-.18,F],[s*.19,-.18,F]],black,[0,0,-1]);for(const dx of [0,.22]){strip([s*(.32+dx),c.tail-.13],[s*(.44+dx),c.tail-.03],R,red,.025);strip([s*(.44+dx),c.tail-.03],[s*(.55+dx),c.tail-.07],R,red,.025);}}
  sideVent(.56,1.02);box(details,w*.52,.03,.65,0,c.tail+.02,1.5,glass);louver(1.32,4);pipes([-.73,-.55,.55,.73],-.16,.07);
 }else if(c.id==='mustang'){
  polygon(details,[[-.64,.30,F],[.64,.30,F],[.51,-.04,F],[-.51,-.04,F]],black,[0,0,-1]);for(const s of [-1,1]){rect(.36,.12,s*.70,c.nose-.03,F,glass);for(let i=0;i<3;i++)strip([s*(.59+i*.07),c.nose+.015],[s*(.63+i*.07),c.nose-.06],F-.03);rect(.64,.29,s*.46,c.tail-.1,R);for(let i=0;i<3;i++)rect(.09,.21,s*(.28+i*.18),c.tail-.1,R+.025,red);box(details,.25,.02,.38,s*.38,c.deck+.03,-1.17,black);}
  lower(1.20,.1,-.19);pipes([-.64,.64],-.16,.10);
 }else if(c.id==='f40'){
  for(const s of [-1,1]){rect(.43,.12,s*.63,c.nose-.12,F,glass);rect(.15,.09,s*.70,c.nose-.12,F-.025,lamp);rect(.12,.09,s*.51,c.nose-.12,F-.025,amber);round(s*.64,c.tail-.06,R+.025,.10);round(s*.39,c.tail-.06,R+.025,.10,amber);}
  lower(1.11,.13,-.13);rect(w*.91,.24,0,c.tail-.06,R,black);for(const s of [-1,1]){round(s*.64,c.tail-.06,R+.04,.10);round(s*.39,c.tail-.06,R+.04,.10,amber);}sideVent(.73,.65);louver(1.1,7);pipes([-.18,0,.18],-.16,.065);
 }else if(c.id==='mx5'){
  lower(.83,.15,-.10);for(const s of [-1,1]){rect(.32,.07,s*.55,.08,F,amber);rect(.47,.17,s*.48,c.tail-.06,R,red);round(s*.43,c.tail-.06,R+.025,.06,lamp);}pipes([.55],-.16,.07);
 }
 return details;
}

export function createCar(c=CARS[0],tuning={}){
 const root=new T.Group();root.name='Car_'+c.id;const shell=new T.Group();root.add(shell);
 const paint=material(tuning.color||c.color,.5),black=material('#17242b'),glass=material('#294653',.24),metal=material('#a8b5bb',.3),lamp=material('#f8f5dd'),red=material('#ed4d48'),amber=material('#e99c48');lamp.emissive.set('#fff0b9').multiplyScalar(.28);red.emissive.set('#e73928').multiplyScalar(.16);
 const mats={paint,black,glass,metal,lamp,red,amber};const ctx={mesh,box,polygon,bar,disc,feature};buildBody(shell,c,paint,ctx);buildCockpit(shell,c,paint,glass,black,ctx);const detailGroup=signatures(shell,c,mats);conformFascia(detailGroup,c);
 const wing=buildAero(shell,c,paint,black,ctx);wing.visible=tuning.wing!==false;
 const kit=feature(shell,'Bodykit_'+c.id);box(kit,c.width*.94,.065,.30,0,-.28,-c.length*.47,black);box(kit,c.width*.90,.09,.30,0,-.25,c.length*.46,black);for(const s of [-1,1])box(kit,.065,.08,c.wheelbase-.70,s*(c.width*.50),-.28,0,black);for(let i=-2;i<=2;i++)box(kit,.035,.14,.30,i*.22,-.23,c.length*.46,black);kit.visible=tuning.kit!==false;
 const neon=feature(shell,'Underglow');box(neon,c.width*.77,.012,c.length*.70,0,-.30,0,material('#9bf7cd'));neon.visible=!!tuning.neon;
 const popups=feature(shell,'Popups_'+c.id);if(c.popup){for(const s of [-1,1]){const z=-c.length/2+.55;box(shell,.40,.025,.36,s*c.width*.30,c.nose-c.frontDrop+.085,z,paint);box(popups,.39,.23,.33,s*c.width*.30,c.nose-c.frontDrop+.19,z,paint);box(popups,.32,.15,.02,s*c.width*.30,c.nose-c.frontDrop+.20,z-.18,black);box(popups,.26,.10,.025,s*c.width*.30,c.nose-c.frontDrop+.20,z-.195,lamp);}}popups.visible=!!c.popup&&tuning.popupLights!==false;
 const wheels=[];for(const [i,anchor]of wheelAnchors(c).entries()){
  const g=new T.Group();g.name=['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR'][i];g.position.fromArray(anchor);root.add(g);const r=c.radius,tw=c.tireWidth*(i>=2?1.05:1),rimR=r*c.rimRatio;
  const profile=[[r*.82,-tw/2],[r*.96,-tw*.46],[r,-tw*.30],[r,tw*.30],[r*.96,tw*.46],[r*.82,tw/2]].map(([x,y])=>new T.Vector2(x,y));const tire=mesh(g,new T.LatheGeometry(profile,14),black);tire.rotation.z=Math.PI/2;
  for(const side of [-1,1]){const face=new T.Group();face.position.x=side*(tw/2+.007);g.add(face);const rim=mesh(face,new T.CylinderGeometry(rimR,rimR,.015,12),metal);rim.rotation.z=Math.PI/2;const recess=mesh(face,new T.CylinderGeometry(rimR*.82,rimR*.82,.02,12),black);recess.rotation.z=Math.PI/2;for(let j=0;j<c.spokes;j++){const a=j/c.spokes*Math.PI*2;bar(face,[side*.018,Math.sin(a)*rimR*.21,Math.cos(a)*rimR*.21],[side*.018,Math.sin(a)*rimR*.90,Math.cos(a)*rimR*.90],c.spokes>7?.014:.021,metal);}const hub=mesh(face,new T.CylinderGeometry(rimR*.20,rimR*.20,.028,8),metal);hub.rotation.z=Math.PI/2;}
  batch(g);wheels.push(g);
 }
 batch(shell);root.userData={shell,wheels,paint,wing,kit,neon,popups,config:c,anchors:wheelAnchors(c),features:c.features};return root;
}
