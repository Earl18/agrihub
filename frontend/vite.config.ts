import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const proxyTarget = new URL(apiBaseUrl).origin;

  return {
    envDir: '../',
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
