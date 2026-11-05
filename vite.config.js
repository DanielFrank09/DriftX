import { defineConfig } from 'vite';
export default defineConfig({build:{target:'es2022',rollupOptions:{input:{game:'index.html',lineup:'lineup.html'},output:{manualChunks:{three:['three'],rapier:['@dimforge/rapier3d-compat'],network:['peerjs']}}}}});
