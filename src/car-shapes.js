import * as T from 'three';

const lerp=T.MathUtils.lerp;
export function bodyDrop(c,z){const f=T.MathUtils.clamp((z+c.length/2)/c.length,0,1);return f<.35?lerp(c.frontDrop,c.deckDrop,f/.35):lerp(c.deckDrop,c.tailDrop,(f-.35)/.65);}
export function crossSection(c,z){
 const f=(z+c.length/2)/c.length,axles=[-c.wheelbase/2+c.axleOffset,c.wheelbase/2+c.axleOffset];
 const swell=Math.max(...axles.map(a=>Math.exp(-(((z-a)/.43)**2))));
 const taper=f<.23?lerp(c.noseWidth,1,f/.23):f>.77?lerp(1,c.tailWidth,(f-.77)/.23):1;
 const waist=lerp(c.waist,1,swell);
 let y=f<.35?lerp(c.nose,c.deck,f/.35):lerp(c.deck,c.tail,(f-.35)/.65);
 y-=bodyDrop(c,z);
 if(['gt3rs','supra','rx7','mx5'].includes(c.id))y-=swell*.025;
 const rise={gt3rs:.16,r35:.085,r8:.025,huracan:.05,supra:.045,rx7:.025,c8:.04,mx5:.035,m4:.025,mustang:.02,r32:0,f40:.015}[c.id];
 const shoulder=c.haunch*swell+rise*Math.exp(-((f/.13)**2));
 const half=c.width/2*taper*waist;
 let bottom=-.27;const arch=c.radius+.055;
 for(const axle of axles){const d=Math.abs(z-axle);if(d<arch)bottom=Math.max(bottom,-.22+Math.sqrt(arch*arch-d*d));}
 return {half,y,shoulder,bottom,contour:[[0,y+.018],[half*.48,y+.028],[half*.78,y+.013+shoulder*.7],[half*.95,y-.025+shoulder],[half,y-.105+shoulder*.8],[half*.985,Math.max(bottom+.012,y-.225+shoulder*.4)],[half*(bottom>-.26?1:.93),bottom]]};
}
export function fasciaSetback(c,x,z){
 const lateral=Math.max(0,(Math.abs(x)/(c.width/2)-.43)/.57);
 const front=1-T.MathUtils.clamp((z+c.length/2)/.34,0,1);
 const rear=1-T.MathUtils.clamp((c.length/2-z)/.28,0,1);
 return c.roundness*lateral*lateral*(front-rear*.7);
}
export function buildBody(parent,c,paint,ctx){
 const {polygon}=ctx,half=c.length/2,stations=new Set([-half,half,...c.roof]);
 for(let i=0;i<=28;i++)stations.add(-half+c.length*i/28);
 for(const a of [-c.wheelbase/2+c.axleOffset,c.wheelbase/2+c.axleOffset])for(let i=0;i<=10;i++)stations.add(a+Math.cos(i/10*Math.PI)*(c.radius+.055));
 const rows=[...stations].filter(z=>z>=-half&&z<=half).sort((a,b)=>a-b).map(z=>({z,...crossSection(c,z)}));
 const point=(r,p,side)=>[side*p[0],p[1],r.z+fasciaSetback(c,p[0],r.z)];
 for(let i=0;i<rows.length-1;i++){
  const a=rows[i],b=rows[i+1],mid=(a.z+b.z)/2,open=c.id==='mx5'&&mid>c.roof[0]&&mid<c.roof[4];
  for(const side of [-1,1])for(let k=0;k<a.contour.length-1;k++){
   if(open&&k<2)continue;
   polygon(parent,[point(a,a.contour[k],side),point(b,b.contour[k],side),point(b,b.contour[k+1],side),point(a,a.contour[k+1],side)],paint,k<3?[side*.3,1,0]:[side,0,0]);
  }
 }
 for(const [r,normal]of [[rows[0],[0,0,-1]],[rows.at(-1),[0,0,1]]]){
  const outline=[...r.contour.slice().reverse().map(p=>point(r,p,-1)),...r.contour.slice(1).map(p=>point(r,p,1))];
  polygon(parent,outline,paint,normal);
 }
}

export function buildCockpit(parent,c,paint,glass,black,ctx){
 const {polygon,bar,box,mesh}=ctx,w=c.width,[front,rfront,mid,rrear,rear]=c.roof,base=c.deck-c.deckDrop+.025,top=c.height-.22-c.radius;
 if(c.id==='mx5'){
  polygon(parent,[[-w*.395,base,front],[w*.395,base,front],[w*.335,top-.025,rfront],[-w*.335,top-.025,rfront]],glass,[0,1,-1]);
  for(const side of [-1,1]){bar(parent,[side*w*.395,base,front],[side*w*.335,top,rfront],.025,paint);box(parent,.41,.08,.80,side*.355,base-.035,.32,black);box(parent,.35,.27,.13,side*.355,base+.11,.69,black);box(parent,.19,.13,.11,side*.355,base+.27,.69,black);box(parent,.14,.09,.20,side*(w*.5+.02),base+.11,front+.13,paint);}
  bar(parent,[-w*.335,top,rfront],[w*.335,top,rfront],.025,paint);box(parent,w*.72,.06,1.17,0,base-.075,.35,black);box(parent,w*.68,.11,.20,0,base+.015,-.23,black);
  const steering=mesh(parent,new T.TorusGeometry(.115,.018,5,12),black);steering.position.set(-.355,base+.14,-.04);steering.rotation.x=.5;return;
 }
 const round=['gt3rs','supra','rx7'].includes(c.id),lo=w*.425,hi=w*c.roofWidth;
 // Five primary stations plus a rear transition give each model its own canopy.
 const rings=[{z:front,y:base,x:lo},{z:rfront,y:top-.045,x:hi},{z:mid,y:top,x:hi*.99},{z:rrear,y:top-.035,x:hi},{z:lerp(rrear,rear,.55),y:lerp(top-.035,base,round?.32:.55),x:lerp(hi,lo,.55)},{z:rear,y:base,x:lo}];
 for(let i=0;i<rings.length-1;i++){
  const a=rings[i],b=rings[i+1],mat=i===0||i>=3?glass:(c.id==='m4'?black:paint);
  // Three roof facets create a crown instead of a flat rectangular cap.
  for(const side of [-1,1]){
   polygon(parent,[[0,a.y,a.z],[side*a.x*.80,a.y-.012,a.z],[side*b.x*.80,b.y-.012,b.z],[0,b.y,b.z]],mat,[0,1,0]);
   polygon(parent,[[side*a.x*.80,a.y-.012,a.z],[side*a.x,a.y-.045,a.z],[side*b.x,b.y-.045,b.z],[side*b.x*.80,b.y-.012,b.z]],mat,[side*.5,1,0]);
  }
 }
 for(const side of [-1,1]){
  const outside=[[side*lo,base,front],...rings.slice(1,-1).map(r=>[side*r.x,r.y-.045,r.z]),[side*lo,base,rear]];
  polygon(parent,outside,glass,[side,0,0]);
  const sill=base+.055,innerFront=front+.15,innerRear=rear-(c.id==='r32'?.18:.28);
  for(let i=1;i<rings.length-2;i++){const a=rings[i],b=rings[i+1];bar(parent,[side*a.x,a.y-.044,a.z],[side*b.x,b.y-.044,b.z],.018,paint);}
  bar(parent,[side*lo,base+.01,front+.04],[side*lo,base+.01,rear-.04],.018,paint);
  const pillar=lerp(rfront,rrear,c.id==='r8'||c.id==='c8'?.86:.68),bottom=lerp(innerFront,innerRear,.72);
  if(c.id!=='f40')bar(parent,[side*hi,top-.063,pillar],[side*lo,sill,bottom],c.id==='r32'?.028:.018,black);
  bar(parent,[side*lo,base+.025,front+.035],[side*hi,top-.045,rfront],.024,paint);
  bar(parent,[side*hi,top-.07,rrear],[side*lo,base,rear-.01],c.id==='r35'?.065:.045,paint);
  box(parent,.13,.085,.20,side*(w*.50+.025),base+.12,front+.17,paint);
 }
}

export function buildAero(parent,c,paint,black,ctx){
 const {feature,box,bar,polygon}=ctx,g=feature(parent,'Wing_'+c.aero),w=c.width,z=c.length*.39,H=c.wingHeight,tail=c.tail-c.tailDrop;
 if(c.id==='f40'){
  for(const side of [-1,1])polygon(g,[[side*w*.47,tail-.02,z-.24],[side*w*.47,H,z-.24],[side*w*.47,H,z+.30],[side*w*.47,tail-.02,z+.30]],paint,[side,0,0]);
  box(g,w*.96,.055,.39,0,H,z+.01,paint);return g;
 }
 if(['lip','ducktail'].includes(c.aero)){
  const lip=box(g,w*.84,c.aero==='lip'?.035:.065,.14,0,tail+.045,c.length*.455,paint);lip.rotation.x=-.22;return g;
 }
 for(const side of [-1,1]){
  if(c.id==='gt3rs'){bar(g,[side*.48,tail,z-.18],[side*.48,H+.07,z-.20],.024,black);bar(g,[side*.48,H+.07,z-.20],[side*.48,H+.07,z+.08],.024,black);}
  else if(c.id==='supra'){polygon(g,[[side*w*.39,tail,z-.12],[side*w*.43,H,z-.1],[side*w*.36,H,z+.13],[side*w*.33,tail,z+.17]],paint,[side,0,0]);}
  else bar(g,[side*w*.34,tail,z],[side*w*.33,H,z-.03],c.id==='r32'?.035:.025,c.id==='r8'||c.id==='c8'?black:paint);
 }
 const wingMat=c.id==='r32'||c.id==='r35'||c.id==='supra'?paint:black;
 box(g,w*(c.id==='gt3rs'?1.08:.88),.045,c.id==='gt3rs'?.40:.24,0,H,z,wingMat);
 if(c.id==='gt3rs'){box(g,w*1.08,.035,.17,0,H+.10,z+.09,black);for(const side of [-1,1])box(g,.025,.17,.44,side*w*.545,H+.045,z,black);}
 return g;
}

export function conformFascia(group,c){
 group.updateMatrixWorld(true);
 group.traverse(m=>{if(!m.isMesh)return;const transform=group.matrixWorld.clone().invert().multiply(m.matrixWorld),inverse=transform.clone().invert(),positions=m.geometry.attributes.position,p=new T.Vector3();for(let i=0;i<positions.count;i++){
  p.fromBufferAttribute(positions,i).applyMatrix4(transform);const front=p.z<(-c.length/2+.20),rear=p.z>(c.length/2-.15);if(!m.userData.surfaceFitted&&(front||rear||p.y<c.deck+.10))p.y-=bodyDrop(c,p.z)*T.MathUtils.smoothstep(p.y,-.27,.15);p.z+=fasciaSetback(c,p.x,p.z)+(front?-.047:rear?.025:0);
  if(Math.abs(p.x)>c.width*.46&&Math.abs(p.z)<c.length/2-.32&&p.y<c.deck-.08)p.x=Math.sign(p.x)*(crossSection(c,p.z).half+.006);
  p.applyMatrix4(inverse);positions.setXYZ(i,p.x,p.y,p.z);
 }positions.needsUpdate=true;m.geometry.computeVertexNormals();});
}
