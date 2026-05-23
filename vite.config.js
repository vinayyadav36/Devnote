import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('prismjs')) return 'vendor-prism';
            if (id.includes('vue')) return 'vendor-vue';
            return 'vendor-core';
          }
        },
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/chunk-[hash].js',
        assetFileNames: 'assets/[hash].[ext]'
      }
    },
    sourcemap: false,
    reportCompressedSize: false
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia']
  }
});

