function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date - start) / 86400000)
}

function declination(doy) {
  return 23.45 * Math.sin((2 * Math.PI / 365) * (284 + doy))
}

export function solarElevation(latitude, date, hour) {
  const doy = dayOfYear(date)
  const decl = declination(doy)
  const hourAngle = (15 * (hour - 12)) * (Math.PI / 180)
  const latRad = latitude * (Math.PI / 180)
  const declRad = decl * (Math.PI / 180)

  const sinElev =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle)

  return Math.asin(Math.max(-1, Math.min(1, sinElev))) * (180 / Math.PI)
}

export function clearSkyIrradiance(elevation) {
  if (elevation <= 0) return 0
  const elevRad = elevation * (Math.PI / 180)
  return 1361 * 0.7 * Math.pow(0.7, 1 / Math.sin(elevRad)) * Math.sin(elevRad)
}

export function cloudFactor(cloudCover) {
  const f = cloudCover / 10
  return 1 - 0.75 * Math.pow(f, 3.4)
}

// capacityKw: 설치 용량(kWp), irradiance: W/m², temperature: °C
export function calcPower(capacityKw, irradiance, temperature) {
  if (irradiance <= 0) return 0
  // NOCT cell temperature
  const T_cell = temperature + (45 - 20) / 800 * irradiance
  // 표준 온도 계수 -0.4%/°C
  const tempFactor = Math.max(0, 1 - 0.004 * (T_cell - 25))
  // PR 0.8: 인버터·배선·소일링 손실 포함
  return Math.max(0, capacityKw * (irradiance / 1000) * tempFactor * 0.8)
}
