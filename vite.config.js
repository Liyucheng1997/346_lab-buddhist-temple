import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: { port: 5188, host: '127.0.0.1' },
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), statues: resolve(import.meta.dirname, 'statues.html') },
    },
  },
});
