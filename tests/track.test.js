import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {createTrack,createEnvironment,TRACKS} from '../src/track.js';
import {iceConfiguration,safeIceServers} from '../api/ice.js';
test('all three maps have valid roads, unique grid positions and matching dockyard collision data',()=>{
 for(let i=0;i<3;i++){const scene=new Scene(),track=createTrack(scene,i),env=createEnvironment(scene,i,track);assert.ok(track.length>350&&track.length<1000);const points=new Set();for(let slot=0;slot<8;slot++){const spawn=track.spawn(slot);assert.ok(track.nearest(spawn.position).distance<track.width/2);points.add(spawn.position.toArray().join(','));}assert.equal(points.size,8);if(TRACKS[i].theme==='dockyard')assert.ok(env.userData.colliders.length>=18);}
});
test('nearest-track query projects onto segments continuously',()=>{
 const track=createTrack(new Scene(),0);for(let i=0;i<100;i++){const p=track.curve.getPointAt(i/100),n=track.nearest(p);assert.ok(n.distance<.25);assert.ok(n.progress>=0&&n.progress<=1);}
});
test('TURN configuration never exposes the provider API key and degrades to STUN when not configured',async()=>{
 const direct=await iceConfiguration({});assert.equal(direct.relayConfigured,false);assert.ok(direct.iceServers.length);assert.equal(safeIceServers([{urls:'https://invalid.example'}]),false);
 const relay=await iceConfiguration({METERED_DOMAIN:'example.metered.live',METERED_API_KEY:'test-private-key'},async()=>({ok:true,json:async()=>[{urls:'turns:relay.example:443',username:'expiring',credential:'value'}]}));assert.equal(relay.relayConfigured,true);assert.ok(!JSON.stringify(relay).includes('test-private-key'));
});
