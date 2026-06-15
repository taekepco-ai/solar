import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // .env.local의 KMA_SERVICE_KEY를 dev 프록시에 주입 (Vercel 환경변수와 동일한 이름)
  const env = loadEnv(mode, process.cwd(), '')
  const kmaKey = env.KMA_SERVICE_KEY ?? ''

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/kma': {
          target: 'https://apis.data.go.kr',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => {
            const [, qs] = path.split('?')
            const base = '/1360000/VilageFcstInfoService_2.0/getVilageFcst'
            if (!kmaKey) return `${base}${qs ? '?' + qs : ''}`
            const keyParam = kmaKey.includes('%') ? kmaKey : encodeURIComponent(kmaKey)
            return `${base}?serviceKey=${keyParam}${qs ? '&' + qs : ''}`
          },
        },
      },
    },
  }
})
