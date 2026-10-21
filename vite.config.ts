/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173 },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'charts';
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'react';
          if (id.includes('@tanstack') || id.includes('axios')) return 'query';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/components/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    css: false,
  },
});
