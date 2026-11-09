import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// BASE lets the same build run at the domain root (Android app, custom domain)
// or under a sub-path such as GitHub Pages (/Mateen/).
export default defineConfig({
  base: process.env.BASE ?? '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app/index.html'),
        identity: resolve(__dirname, 'identity/index.html'),
      },
    },
  },
});
