import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  build: { outDir: 'dist-onprem', rollupOptions: { input: 'onprem.html' } },
  server: {
    host: '127.0.0.1', port: 18092,
    proxy: { '/api': { target: 'http://127.0.0.1:18091' } },
  },
});
