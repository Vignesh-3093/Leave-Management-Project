// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { // Any request starting with /api
        target: 'http://localhost:5000', // Proxy to your backend server
        changeOrigin: true, // Needed for virtual hosted sites
        rewrite: (path) => path.replace(/^\/api/, '/api'), // Rewrite /api to /api (optional, often not needed if backend path matches)
      },
    },
  },
});