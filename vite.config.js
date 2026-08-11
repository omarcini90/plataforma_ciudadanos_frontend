import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  // VPS ~2 GiB: menos paralelismo y sin gzip report (suele colgar en "rendering chunks").
  build: {
    sourcemap: false,
    reportCompressedSize: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      maxParallelFileOps: 1,
    },
  },
});
