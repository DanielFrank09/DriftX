import { defineConfig } from 'vite';
export default defineConfig({build:{rollupOptions:{input:{game:'index.html',lineup:'lineup.html'},output:{manualChunks:{three:['three'],physics:['cannon-es'],network:['peerjs']}}}}});
