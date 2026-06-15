import { useState, useEffect } from 'react'
import { generateMockData } from '../utils/mockData'
import { solarElevation, clearSkyIrradiance, cloudFactor } from '../utils/solar'

function fmt(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtKMA(date) {
  return fmt(date).replace(/-/g, '')
}

function skyToCloud(skyStr) {
  const v = parseInt(skyStr, 10)
  if (v === 1) return 2  // 맑음
  if (v === 3) return 6  // 구름많음
  return 9               // 흐림 (4)
}

async function fetchKMA(location, date) {
  const yesterday = new Date(date)
  yesterday.setDate(yesterday.getDate() - 1)

  // serviceKey는 서버(api/kma.js)에서 환경변수로 주입 — 클라이언트에서 전송하지 않음
  const params = new URLSearchParams({
    numOfRows: '1000',
    pageNo: '1',
    dataType: 'JSON',
    base_date: fmtKMA(yesterday),
    base_time: '2300',
    nx: String(location.nx),
    ny: String(location.ny),
  })

  const res = await fetch(`/api/kma?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const json = await res.json()
  const header = json.response?.header
  if (header?.resultCode !== '00') throw new Error(header?.resultMsg ?? 'KMA 오류')

  const items = json.response?.body?.items?.item ?? []
  const todayStr = fmtKMA(date)
  const todayItems = items.filter(it => it.fcstDate === todayStr)
  if (todayItems.length === 0) throw new Error('NO_DATA')

  const byHour = {}
  for (const item of todayItems) {
    const hour = parseInt(item.fcstTime.slice(0, 2), 10)
    if (!byHour[hour]) byHour[hour] = {}
    byHour[hour][item.category] = item.fcstValue
  }

  let lastSky = '1', lastTmp = '15', lastReh = '50', lastWsd = '0'
  return Array.from({ length: 24 }, (_, hour) => {
    const h = byHour[hour] ?? {}
    if (h.SKY !== undefined) lastSky = h.SKY
    if (h.TMP !== undefined) lastTmp = h.TMP
    if (h.REH !== undefined) lastReh = h.REH
    if (h.WSD !== undefined) lastWsd = h.WSD

    const cloudCover = skyToCloud(lastSky)
    const elev = solarElevation(location.lat, date, hour + 0.5)
    const irradiance = Math.round(
      Math.max(0, clearSkyIrradiance(elev)) * cloudFactor(cloudCover)
    )
    return {
      hour,
      time: `${String(hour).padStart(2, '0')}:00`,
      temperature: parseFloat(lastTmp),
      humidity: parseInt(lastReh, 10),
      windSpeed: parseFloat(lastWsd),
      cloudCover,
      irradiance,
      solarElevation: Math.round(elev * 10) / 10,
      isDemoData: false,
    }
  })
}

async function fetchOpenMeteo(location, date) {
  const dateStr = fmt(date)
  const todayStr = fmt(new Date())
  const daysAgo = Math.floor((new Date(todayStr) - new Date(dateStr)) / 86400000)

  const base = daysAgo > 3
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast'

  const params = new URLSearchParams({
    latitude:  location.lat,
    longitude: location.lon,
    start_date: dateStr,
    end_date:   dateStr,
    hourly: 'shortwave_radiation,temperature_2m,cloud_cover,wind_speed_10m,relative_humidity_2m',
    timezone: 'Asia/Seoul',
  })

  const res = await fetch(`${base}?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const json = await res.json()
  const h = json.hourly

  return h.time.map((t, i) => {
    const hour = new Date(t).getHours()
    const elev = solarElevation(location.lat, date, hour + 0.5)
    return {
      hour,
      time: `${String(hour).padStart(2, '0')}:00`,
      temperature:    +(h.temperature_2m[i]           ?? 0).toFixed(1),
      humidity:       Math.round(h.relative_humidity_2m[i] ?? 0),
      windSpeed:      +(h.wind_speed_10m[i]            ?? 0).toFixed(1),
      cloudCover:     Math.round((h.cloud_cover[i]     ?? 0) / 10),
      irradiance:     Math.round(h.shortwave_radiation[i]   ?? 0),
      solarElevation: Math.round(elev * 10) / 10,
      isDemoData: false,
    }
  })
}

export function useWeatherData(location, date) {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [dataSource, setDataSource] = useState('openmeteo')

  useEffect(() => {
    if (!location || !date) return
    setLoading(true)
    setError(null)

    const isToday = fmt(date) === fmt(new Date())

    const run = async () => {
      // 오늘 날짜: KMA 단기예보 우선 시도 (서버 환경변수에 키가 없으면 자동 fallback)
      if (isToday) {
        try {
          setData(await fetchKMA(location, date))
          setDataSource('kma')
          setLoading(false)
          return
        } catch {
          // 환경변수 미설정(dev) 또는 API 오류 → Open-Meteo로 조용히 전환
        }
      }

      try {
        setData(await fetchOpenMeteo(location, date))
        setDataSource('openmeteo')
      } catch (e) {
        setError(`날씨 데이터 오류 (${e.message}) — 데모 데이터로 표시합니다.`)
        setData(generateMockData(location.lat, date))
        setDataSource('demo')
      }
      setLoading(false)
    }

    run()
  }, [location?.stnId, date?.toDateString()])

  return { data, loading, error, dataSource }
}
