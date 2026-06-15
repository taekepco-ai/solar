// Vercel Serverless Function — KMA 단기예보 API 프록시
// /api/kma?serviceKey=...&... → apis.data.go.kr VilageFcstInfoService_2.0/getVilageFcst
export default async function handler(req, res) {
  const { serviceKey, ...rest } = req.query

  if (!serviceKey) {
    return res.status(400).json({ error: 'serviceKey 없음' })
  }

  // req.query is already URL-decoded by Node.js → re-encode with URLSearchParams
  const params = new URLSearchParams({ serviceKey, ...rest })
  const kmaUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?${params}`

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
