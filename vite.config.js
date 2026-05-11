import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/stats': {
          target: 'https://rentapi-b6gc.onrender.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/stats/, '/api/v1/stats'),
          headers: { 'x-api-key': env.RENTAPI_KEY },
        },
        '/api/geo': {
          target: 'https://rentapi-b6gc.onrender.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/geo/, '/api/v1/geo'),
          headers: { 'x-api-key': env.RENTAPI_KEY },
        },
        '/api/pisos': {
          target: 'https://rentapi-b6gc.onrender.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/pisos/, '/api/v1/pisos'),
          headers: { 'x-api-key': env.RENTAPI_KEY },
      },
      }
    }
  }
})