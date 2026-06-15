import { useState, useEffect } from 'react'
import { generateMockData } from '../utils/mockData'
import { solarElevation } from '../utils/solar'

function fmt(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function fetchOpenMeteo(location, date) {
  const dateStr = fmt(date)
  const todayStr = fmt(new Date())
  const daysAgo = Math.floor((new Date(todayStr) - new Date(dateStr)) / 86400000)

  // 3일 이상 지난 과거 → archive API / 나머지(오늘·내일·최근) → forecast API
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
      temperature:   +(h.temperature_2m[i]        ?? 0).toFixed(1),
      humidity:      Math.round(h.relative_humidity_2m[i] ?? 0),
      windSpeed:     +(h.wind_speed_10m[i]         ?? 0).toFixed(1),
      cloudCover:    Math.round((h.cloud_cover[i]  ?? 0) / 10),  // % → 0~10
      irradiance:    Math.round(h.shortwave_radiation[i]  ?? 0), // W/m²
      solarElevation: Math.round(elev * 10) / 10,
      isDemoData: false,
    }
  })
}

export function useWeatherData(location, date) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!location || !date) return
    setLoading(true)
    setError(null)

    const run = async () => {
      try {
        setData(await fetchOpenMeteo(location, date))
      } catch (e) {
        setError(`날씨 데이터 오류 (${e.message}) — 데모 데이터로 표시합니다.`)
        setData(generateMockData(location.lat, date))
      }
      setLoading(false)
    }

    run()
  }, [location?.stnId, date?.toDateString()])

  return { data, loading, error }
}
