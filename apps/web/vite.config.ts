import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Wrangler dev server (apps/api) is pinned to this port via its `dev` script.
const apiOrigin = process.env.BYGA_API_ORIGIN ?? 'http://127.0.0.1:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: apiOrigin, changeOrigin: false }
    }
  },
  build: { sourcemap: false, target: 'es2022' }
});
