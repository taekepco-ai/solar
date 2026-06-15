// Vercel Serverless Function — ASOS API 프록시
// /api/asos?serviceKey=...&... → apis.data.go.kr/1360000/AsosHourlyInfoService/getWthrDataList
export default async function handler(req, res) {
  const { serviceKey, ...rest } = req.query

  if (!serviceKey) {
    return res.status(400).json({ error: 'serviceKey 없음' })
  }

  // req.query는 Node.js가 이미 URL 디코딩한 값 → URLSearchParams로 재인코딩
  const params = new URLSearchParams({ serviceKey, ...rest })
  const asosUrl = `https://apis.data.go.kr/1360000/AsosHourlyInfoService/getWthrDataList?${params}`

  try {
    const upstream = await fetch(asosUrl, {
      headers: { 'Accept': 'application/json, text/plain, */*' },
    })
    const text = await upstream.text()

    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(upstream.status).send(text)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
