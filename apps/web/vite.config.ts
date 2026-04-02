import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('/@tiptap/')) return 'vendor-tiptap';
          if (id.includes('/lowlight/') || id.includes('/highlight.js/')) return 'vendor-lowlight';
          if (id.includes('/@tanstack/')) return 'vendor-tanstack';
          if (id.includes('/@dnd-kit/')) return 'vendor-dnd-kit';
          if (id.includes('/lucide-react/')) return 'vendor-lucide';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('/zustand/')
          ) {
            return 'vendor-react';
          }

          return 'vendor-misc';
        },
      },
    },
  },
});
