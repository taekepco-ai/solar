import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/kma': {
        target: 'https://apis.data.go.kr',
        changeOrigin: true,
        secure: false,
        rewrite: (path) =>
          path.replace(/^\/api\/kma/, '/1360000/VilageFcstInfoService_2.0/getVilageFcst'),
      },
    },
  },
})
