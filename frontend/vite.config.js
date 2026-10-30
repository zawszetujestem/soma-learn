import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
  return {
    plugins: [react()],
    define: {
      'import.meta.env.FRONTEND_BASE_URL': JSON.stringify(env.FRONTEND_BASE_URL || ''),
    },
    server: {
      proxy: Object.fromEntries(['/api', '/_allauth', '/accounts'].map((path) => [path, { target, changeOrigin: true }])),
    },
    test: {
      environment: 'jsdom',
      setupFiles: './tests/setup.js',
      clearMocks: true,
    },
  }
})