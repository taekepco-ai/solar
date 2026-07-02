import { CO2_KG_PER_KWH, KRW_PER_KWH } from '../constants'

function Stat({ label, value, unit, accent }) {
  return (
    <div className={`rounded-xl border p-4 bg-gradient-to-br ${accent}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">
        {value}
        <span className="ml-1 text-sm font-normal text-slate-400">{unit}</span>
      </p>
    </div>
  )
}

export default function PowerSummary({ powerData, isDemoData }) {
  if (!powerData) return null

  const totalKwh = powerData.reduce((s, p) => s + p, 0)
  const peakKw = Math.max(...powerData)
  const co2 = totalKwh * CO2_KG_PER_KWH
  const krw = Math.round(totalKwh * KRW_PER_KWH)

  return (
    <div className="rounded-xl bg-slate-800/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-medium text-slate-300">오늘 발전 요약</h2>
        {isDemoData && (
          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
            데모 데이터
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="총 발전량"
          value={totalKwh.toFixed(1)}
          unit="kWh"
          accent="from-amber-500/10 to-amber-700/5 border-amber-500/20"
        />
        <Stat
          label="최대 출력"
          value={peakKw.toFixed(2)}
          unit="kW"
          accent="from-cyan-500/10 to-cyan-700/5 border-cyan-500/20"
        />
        <Stat
          label="CO₂ 절감"
          value={co2.toFixed(1)}
          unit="kg"
          accent="from-green-500/10 to-green-700/5 border-green-500/20"
        />
        <Stat
          label="전기요금 절감"
          value={krw.toLocaleString('ko-KR')}
          unit="원"
          accent="from-violet-500/10 to-violet-700/5 border-violet-500/20"
        />
      </div>
    </div>
  )
}
