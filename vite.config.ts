import { defineConfig } from 'vite';
export default defineConfig({base:'./',build:{outDir:'dist-web',rollupOptions:{input:{game:'index.html',preview:'asset-preview.html'}}}});
