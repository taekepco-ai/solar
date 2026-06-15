import { solarElevation, clearSkyIrradiance, cloudFactor } from './solar'

export function generateMockData(latitude, date) {
  const month = date.getMonth() + 1
  const isWinter = month <= 2 || month === 12
  const isSummer = month >= 6 && month <= 8

  const baseTemp = isWinter ? 1 : isSummer ? 29 : 15
  // deterministic pseudo-random cloud pattern from date
  const seed = date.getDate() + date.getMonth() * 31
  const cloudBase = 0.3 + 0.4 * Math.abs(Math.sin(seed))

  return Array.from({ length: 24 }, (_, hour) => {
    const elevation = solarElevation(latitude, date, hour + 0.5)

    const diurnal = 7 * Math.sin(((hour - 6) * Math.PI) / 12)
    const temperature = Math.round((baseTemp + diurnal) * 10) / 10

    const cloudCover = Math.max(0, Math.min(10,
      Math.round(cloudBase * 10 + Math.sin(hour * 0.7 + seed) * 2)
    ))

    const humidity = Math.min(99, Math.round(65 - diurnal + (hour < 7 ? 10 : 0)))
    const windSpeed = Math.round((2.5 + Math.sin((hour - 14) * 0.4)) * 10) / 10

    const G_cs = clearSkyIrradiance(elevation)
    const irradiance = Math.round(G_cs * cloudFactor(cloudCover))

    return {
      hour,
      time: `${String(hour).padStart(2, '0')}:00`,
      temperature,
      humidity,
      windSpeed,
      cloudCover,
      irradiance,
      solarElevation: Math.round(elevation * 10) / 10,
      isDemoData: true,
    }
  })
}
