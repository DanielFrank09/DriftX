import {readFile,writeFile,mkdir,copyFile,stat} from 'node:fs/promises';
import path from 'node:path';
const [command,argument]=process.argv.slice(2);
if(command==='search'){
 const token=process.env.FREESOUND_API_KEY;if(!token)throw new Error('Set FREESOUND_API_KEY in your shell, never in VITE_* or tracked files.');
 const url=new URL('https://freesound.org/apiv2/search/text/');url.searchParams.set('query',argument||'car engine loop');url.searchParams.set('filter','license:"Creative Commons 0" duration:[1 TO 20]');url.searchParams.set('fields','id,name,username,license,url,previews');url.searchParams.set('page_size','12');
 const response=await fetch(url,{headers:{Authorization:'Token '+token}});if(!response.ok)throw new Error('Sound search failed: '+response.status);const data=await response.json();console.log(JSON.stringify(data.results,null,2));
}else if(command==='import'){
 const catalog=JSON.parse(await readFile(argument,'utf8')),root=path.resolve('public/audio'),manifest={version:1,profiles:{},events:{},assets:[]};await mkdir(root,{recursive:true});
 for(const item of catalog.assets||[]){
  if(!/^[a-z0-9_-]+$/.test(item.id)||!['CC0-1.0','CC-BY-4.0','Sonniss-GDC'].includes(item.license)||!item.source||!item.creator)throw new Error('Each asset needs a safe ID, source URL, creator and supported license.');
  const ext=path.extname(item.file).toLowerCase();if(!['.wav','.ogg','.mp3'].includes(ext))throw new Error('Unsupported audio format');if((await stat(item.file)).size>8*1024*1024)throw new Error('Trim/compress clips below 8 MB before importing.');
  const filename=item.id+ext;await copyFile(item.file,path.join(root,filename));manifest.assets.push({id:item.id,url:'/audio/'+filename,creator:item.creator,source:item.source,license:item.license,licenseUrl:item.licenseUrl||''});
 }
 for(const [profile,layers]of Object.entries(catalog.profiles||{})){if(!/^[a-z0-9_-]+$/.test(profile)||layers.length!==3)throw new Error('Profiles require exactly three layers.');manifest.profiles[profile]=layers.map(layer=>{const asset=manifest.assets.find(a=>a.id===layer.id);if(!asset||!Number.isFinite(layer.rpm)||layer.rpm<400||layer.rpm>12000)throw new Error('Invalid layer asset or RPM');return {url:asset.url,rpm:layer.rpm};});}
 for(const [event,id]of Object.entries(catalog.events||{})){const asset=manifest.assets.find(a=>a.id===id);if(!asset)throw new Error('Missing event asset');manifest.events[event]=asset.url;}
 await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');await writeFile(path.join(root,'ATTRIBUTION.md'),manifest.assets.map(a=>`- ${a.id} — ${a.creator} — ${a.license} — ${a.source}`).join('\n')+'\n');console.log('Imported '+manifest.assets.length+' licensed assets.');
}else console.log('node scripts/audio-assets.mjs search "car engine loop"\nnode scripts/audio-assets.mjs import work/audio-catalog.json');
