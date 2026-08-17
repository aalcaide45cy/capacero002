import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('@codemirror') ||
              id.includes('@uiw') ||
              id.includes('highlight.js') ||
              id.includes('turndown') ||
              id.includes('katex') ||
              id.includes('react-markdown') ||
              id.includes('remark') ||
              id.includes('rehype')
            ) {
              return 'vendor-editor';
            }
            if (id.includes('xlsx') || id.includes('read-excel-file')) {
              return 'vendor-excel';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
});
