import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error ESM Vite plugin without @types/node
import { liveSyncPlugin } from './server/liveSyncPlugin.mjs';

export default defineConfig({
  // Relative base so the app works seamlessly on both GitHub Pages (/repo-name/) and Vercel (/)
  base: './',
  plugins: [react(), liveSyncPlugin()],
  server: {
    port: 5174,
    host: true,
  },
  preview: {
    port: 5174,
    host: true,
  },
});
