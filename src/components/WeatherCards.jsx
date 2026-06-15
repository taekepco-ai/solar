function Card({ label, value, unit, sub, accent }) {
  return (
    <div className={`rounded-xl border p-4 bg-gradient-to-br ${accent}`}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">
        {value}
        <span className="ml-1 text-sm font-normal text-slate-400">{unit}</span>
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

const CLOUD_LABELS = ['맑음', '맑음', '구름조금', '구름조금', '구름많음', '구름많음', '구름많음', '흐림', '흐림', '흐림', '흐림']

export default function WeatherCards({ data, hour }) {
  if (!data) return null
  const d = data[hour] ?? data[12]
  const peakIrr = Math.max(...data.map(x => x.irradiance))
  const cloudLabel = CLOUD_LABELS[Math.min(10, Math.max(0, d.cloudCover))]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card
        label={`기온  ${d.time}`}
        value={d.temperature}
        unit="°C"
        sub={`습도 ${d.humidity}%`}
        accent="from-cyan-500/10 to-cyan-700/5 border-cyan-500/20"
      />
      <Card
        label="수평면 일사량"
        value={d.irradiance}
        unit="W/m²"
        sub={`오늘 최대 ${peakIrr} W/m²`}
        accent="from-amber-500/10 to-amber-700/5 border-amber-500/20"
      />
      <Card
        label="운량"
        value={d.cloudCover}
        unit="/ 10"
        sub={cloudLabel}
        accent="from-blue-500/10 to-blue-700/5 border-blue-500/20"
      />
      <Card
        label="풍속"
        value={d.windSpeed}
        unit="m/s"
        sub={`태양 고도 ${d.solarElevation}°`}
        accent="from-green-500/10 to-green-700/5 border-green-500/20"
      />
    </div>
  )
}
