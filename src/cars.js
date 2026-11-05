import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { CARS, wheelAnchors } from './catalog.js';
export { createCar } from './car-models.js';

/** Blender: meters, Y-up glTF export, car nose -Z. Use these exact node prefixes. */
export async function loadModularGLTF(url){
 const {scene}=await new GLTFLoader().loadAsync(url);
 const parts={wings:[],bodykits:[],wheels:[],exhausts:[]};
 scene.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}for(const [key,prefix] of Object.entries({wings:'Wing_',bodykits:'Bodykit_',wheels:'Wheel_',exhausts:'Exhaust_'})){if(node.name.startsWith(prefix))parts[key].push(node);}});
 return {scene,parts,select(category,name){const list=parts[category];if(!list)throw new Error('Unknown part category');if(name!==null&&!list.some(p=>p.name===name))throw new Error('Part not found');list.forEach(p=>p.visible=p.name===name);}};
}
