import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // dev 서버: Vercel Function과 동일한 경로를 ASOS API로 직접 포워딩
      '/api/asos': {
        target: 'https://apis.data.go.kr',
        changeOrigin: true,
        secure: false,
        rewrite: (path) =>
          path.replace(/^\/api\/asos/, '/1360000/AsosHourlyInfoService/getWthrDataList'),
      },
    },
  },
})
