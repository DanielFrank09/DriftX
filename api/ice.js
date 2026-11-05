const DEFAULT_ICE=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}];
export function safeIceServers(value){return Array.isArray(value)&&value.length<=12&&value.every(s=>s&&[s.urls].flat().length>0&&[s.urls].flat().length<=5&&[s.urls].flat().every(u=>typeof u==='string'&&/^(stun|turn|turns):[^\s]+$/.test(u))&&(s.username===undefined||typeof s.username==='string')&&(s.credential===undefined||typeof s.credential==='string'));}
let cache=null,expires=0;
export async function iceConfiguration(env=process.env,fetcher=fetch){
 if(env.TURN_ICE_SERVERS){try{const servers=JSON.parse(env.TURN_ICE_SERVERS);if(safeIceServers(servers))return {iceServers:[...DEFAULT_ICE,...servers],relayConfigured:servers.some(s=>[s.urls].flat().some(u=>/^turns?:/.test(u)))};}catch{}}
 if(env.METERED_DOMAIN&&env.METERED_API_KEY&&/^[a-z0-9-]+\.metered\.live$/i.test(env.METERED_DOMAIN)){
  const response=await fetcher('https://'+env.METERED_DOMAIN+'/api/v1/turn/credentials?apiKey='+encodeURIComponent(env.METERED_API_KEY),{signal:AbortSignal.timeout(3500)});if(!response.ok)throw new Error('Relay provider unavailable');const servers=await response.json();if(!safeIceServers(servers))throw new Error('Invalid relay response');return {iceServers:servers,relayConfigured:true};
 }
 return {iceServers:DEFAULT_ICE,relayConfigured:false};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, max-age=60');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 try{if(!cache||Date.now()>expires){cache=await iceConfiguration();expires=Date.now()+60000;}return res.status(200).json(cache);}catch{return res.status(200).json({iceServers:DEFAULT_ICE,relayConfigured:false});}
}
