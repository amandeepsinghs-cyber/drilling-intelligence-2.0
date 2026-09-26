import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': `http://localhost:${process.env.DI2_API_PORT ?? '8765'}`,
      '/ws': { target: `ws://localhost:${process.env.DI2_API_PORT ?? '8765'}`, ws: true },
    },
  },
  // @ts-expect-error vitest config
  test: {
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
});
