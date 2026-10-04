import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

const apiProxy: Record<string, string | ProxyOptions> = { '/api': 'http://localhost:8010' };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: apiProxy },
  preview: { port: 4173, proxy: apiProxy },
});
