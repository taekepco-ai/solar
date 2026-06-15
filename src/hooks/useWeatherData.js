import { useState, useEffect } from 'react'
import { generateMockData } from '../utils/mockData'

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

async function fetchAsos(stnId, date, apiKey) {
  const dateStr = toDateStr(date)
  const rawKey  = apiKey.trim()

  // URLSearchParams는 %를 %25로 다시 인코딩해 이중 인코딩이 발생함.
  // 서비스 키만 URL 문자열에 직접 삽입:
  // - 인코딩 키(%2B, %3D 포함): 그대로 삽입 → 서버가 한 번 디코딩해 올바른 값 수신
  // - 디코딩 키(+, = 포함): encodeURIComponent로 1회 인코딩 후 삽입
  const keyForUrl = rawKey.includes('%') ? rawKey : encodeURIComponent(rawKey)

  const otherParams = new URLSearchParams({
    numOfRows: 24,
    pageNo: 1,
    dataType: 'JSON',
    dataCd: 'ASOS',
    dateCd: 'HR',
    startDt: dateStr,
    startHh: '00',
    endDt: dateStr,
    endHh: '23',
    stnIds: stnId,
  })

  const url = `/api/asos?serviceKey=${keyForUrl}&${otherParams}`
  console.log('[ASOS] →', url.replace(/serviceKey=[^&]+/, 'serviceKey=***'))

  const res = await fetch(url)
  const body = await res.text()

  if (!res.ok) {
    // XML 형식: <returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg>
    const xmlCode = body.match(/returnAuthMsg>([^<]+)/)?.[1]
    const xmlMsg  = body.match(/errMsg>([^<]+)/)?.[1]
    // JSON 형식: {"resultCode":"30","resultMsg":"..."}
    const jsonCode = body.match(/"resultCode"\s*:\s*"([^"]+)"/)?.[1]
    const jsonMsg  = body.match(/"resultMsg"\s*:\s*"([^"]+)"/)?.[1]
    const code = xmlCode ?? jsonCode ?? ''
    const msg  = xmlMsg  ?? jsonMsg  ?? body.slice(0, 150)
    throw new Error(`HTTP ${res.status}${code ? ` [${code}]` : ''} — ${msg}`)
  }

  const json = JSON.parse(body)
  const items = json?.response?.body?.items?.item
  if (!items?.length) throw new Error('데이터 없음 (오늘 날짜는 몇 시간 전 데이터까지만 제공됩니다)')

  return items.map((item, i) => ({
    hour: i,
    time: `${String(i).padStart(2, '0')}:00`,
    temperature: parseFloat(item.ta) || 0,
    humidity: parseFloat(item.hm) || 0,
    windSpeed: parseFloat(item.ws) || 0,
    cloudCover: parseFloat(item.dc10Tca) || 0,
    // icsr: MJ/m²/h → W/m² (÷ 0.0036)
    irradiance: Math.round((parseFloat(item.icsr) || 0) / 0.0036),
    precipitation: parseFloat(item.rn) || 0,
    isDemoData: false,
  }))
}

export function useWeatherData(location, date, apiKey) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!location || !date) return
    setLoading(true)
    setError(null)

    const run = async () => {
      if (apiKey?.trim()) {
        try {
          const result = await fetchAsos(location.stnId, date, apiKey.trim())
          setData(result)
        } catch (e) {
          const msg = `API 오류: ${e.message} — 데모 데이터로 표시합니다. (브라우저 콘솔 F12에서 자세한 내용 확인)`
          setError(msg)
          setData(generateMockData(location.lat, date))
        }
      } else {
        await new Promise(r => setTimeout(r, 300))
        setData(generateMockData(location.lat, date))
      }
      setLoading(false)
    }

    run()
  }, [location?.stnId, date?.toDateString(), apiKey])

  return { data, loading, error }
}
