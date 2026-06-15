// Vercel Serverless Function — KMA 단기예보 API 프록시
// API 키는 서버 환경변수 KMA_SERVICE_KEY에서만 읽음 (클라이언트 노출 없음)
export default async function handler(req, res) {
  const key = process.env.KMA_SERVICE_KEY
  if (!key) {
    return res.status(500).json({ error: 'KMA_SERVICE_KEY 환경변수 미설정' })
  }

  // 키는 이미 URL 인코딩된 형태로 저장돼 있을 수 있으므로 직접 주입
  const keyParam = key.includes('%') ? key : encodeURIComponent(key)
  const rest = new URLSearchParams(req.query)
  const kmaUrl =
    `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst` +
    `?serviceKey=${keyParam}&${rest}`

  try {
    const upstream = await fetch(kmaUrl, {
      headers: { Accept: 'application/json, text/plain, */*' },
    })
    const text = await upstream.text()
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(upstream.status).send(text)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
