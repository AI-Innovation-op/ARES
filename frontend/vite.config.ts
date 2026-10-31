import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.ARES_DEV_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.ARES_DEV_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
