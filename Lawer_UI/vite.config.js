import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/law': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/law/, ''),
      },
      '/social': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/social/, ''),
      },
      '/rag': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/rag/, ''),
      },
    },
  },
});
