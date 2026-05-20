import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    proxy: {
      '/auth': 'http://localhost:8787',
      '/video': 'http://localhost:8787',
      '/storage': 'http://localhost:8787',
      '/v1': 'http://localhost:8787',
      '/admin': 'http://localhost:8787',
    },
  },
});
