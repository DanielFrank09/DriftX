const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const PARTS={
 engine:{stock:{name:'Factory engine'},i4:{name:'NA inline-four',power:205,redline:7600,cylinders:4,sound:'i4'},i6:{name:'Turbo inline-six',power:340,redline:7800,cylinders:6,sound:'i6'},v8:{name:'High-rev V8',power:470,redline:8500,cylinders:8,sound:'v8'}},
 turbo:{none:{name:'Naturally aspirated',boost:0,spool:0},street:{name:'Street turbo',boost:.85,spool:.48},race:{name:'Large turbo',boost:1.4,spool:.95}},
 diff:{open:{name:'Open differential',accel:0,decel:0},lsd15:{name:'1.5-way LSD',accel:.7,decel:.3},lsd2:{name:'2-way LSD',accel:.8,decel:.8},welded:{name:'Welded spool',accel:1,decel:1}},
 angle:{stock:{name:'35° factory lock',degrees:35},sport:{name:'50° angle kit',degrees:50},drift:{name:'65° angle kit',degrees:65}}
};
export const DEFAULT_BUILD={engine:'stock',turbo:'none',diff:'lsd15',angle:'stock',frontCamber:-2,rearCamber:-1,damper:.62,frontAero:.3,rearAero:1.05};
const ranges={frontCamber:[-8,0],rearCamber:[-8,0],damper:[.3,1.1],frontAero:[0,2],rearAero:[0,3]};
export function sanitizeBuild(input={}){const b={...DEFAULT_BUILD};if(!input||typeof input!=='object')return b;for(const k of Object.keys(PARTS))if(Object.hasOwn(PARTS[k],input[k]))b[k]=input[k];for(const [k,[a,z]]of Object.entries(ranges))if(Number.isFinite(input[k]))b[k]=clamp(input[k],a,z);return b;}
export function resolveBuild(car,tune={}){const b=sanitizeBuild(tune.build),e=PARTS.engine[b.engine],turbo=PARTS.turbo[b.turbo];const nativeCylinders=/V10/.test(car.engine)?10:/V8/.test(car.engine)?8:/I4/.test(car.engine)?4:6;return {build:b,power:e.power||car.power,redline:e.redline||(/V10|ROTOR/.test(car.engine)?8500:7200),cylinders:e.cylinders||nativeCylinders,sound:e.sound||(nativeCylinders>=8?'v8':nativeCylinders===4?'i4':'i6'),boost:turbo.boost,spool:turbo.spool,lock:PARTS.diff[b.diff],steeringLock:PARTS.angle[b.angle].degrees*Math.PI/180,spring:(tune.stiffness||32)*1000,rest:tune.rideHeight||.3,damperRatio:b.damper,frontCamber:b.frontCamber*Math.PI/180,rearCamber:b.rearCamber*Math.PI/180,frontAero:b.frontAero,rearAero:tune.wing===false?0:b.rearAero};}
export function encodeBuild(build){return 'v1:'+JSON.stringify(sanitizeBuild(build));}
export function decodeBuild(text){if(typeof text!=='string'||text.length>2048||!text.startsWith('v1:'))throw new Error('Unsupported build link');return sanitizeBuild(JSON.parse(decodeURIComponent(text.slice(3))));}
