import {
  ComposedChart, BarChart, Area, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const MARGIN = { top: 4, right: 8, bottom: 0, left: -10 }
const MARGIN_BOTTOM = { top: 4, right: 8, bottom: 4, left: -10 }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 text-xs shadow-xl">
      <p className="mb-2 font-medium text-slate-200">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-6" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="font-mono">{(+p.value).toFixed(1)} {p.unit}</span>
        </div>
      ))}
    </div>
  )
}

export default function HourlyChart({ data, powerData, selectedHour, onHourChange }) {
  if (!data) return null

  const weatherData = data.map((d, i) => ({
    time: d.time,
    '일사량': d.irradiance,
    '기온': d.temperature,
  }))

  const powerChartData = data.map((d, i) => ({
    time: d.time,
    '발전량': powerData ? +powerData[i].toFixed(2) : 0,
  }))

  const refTime = data[selectedHour]?.time

  return (
    <div className="rounded-xl bg-slate-800/50 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">시간별 일사량 · 기온 · 발전량</h2>
        <span className="text-xs text-slate-500">← 슬라이더로 시간 선택</span>
      </div>

      {/* 시간 슬라이더 */}
      <div className="mb-3 flex items-center gap-3">
        <span className="text-xs text-slate-500 w-8">00시</span>
        <input
          type="range" min={0} max={23} value={selectedHour}
          onChange={e => onHourChange(Number(e.target.value))}
          className="flex-1 h-1.5 accent-amber-400"
        />
        <span className="text-sm font-mono font-semibold text-amber-400 w-10 text-right">
          {String(selectedHour).padStart(2, '0')}시
        </span>
      </div>

      {/* 상단: 일사량 + 기온 */}
      <div className="mb-1">
        <span className="text-xs text-slate-500">일사량 (W/m²) · 기온 (°C)</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={weatherData} margin={MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={false} tickLine={false} height={0} />
          <YAxis yAxisId="irr" orientation="left"  tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} width={44} unit="" />
          <YAxis yAxisId="tmp" orientation="right" tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} width={32} unit="°C" />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize:11, color:'#94a3b8' }} />
          <ReferenceLine yAxisId="irr" x={refTime} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" />
          <Area  yAxisId="irr" type="monotone" dataKey="일사량" stroke="#f59e0b" fill="#f59e0b20" strokeWidth={2} dot={false} unit=" W/m²" />
          <Line  yAxisId="tmp" type="monotone" dataKey="기온"   stroke="#f43f5e" strokeWidth={1.5} dot={false} unit="°C" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* 하단: 발전량 */}
      <div className="mt-3 mb-1">
        <span className="text-xs text-slate-500">발전량 (kW)</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={powerChartData} margin={MARGIN_BOTTOM}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} interval={3} />
          <YAxis tick={{ fill:'#64748b', fontSize:10 }} tickLine={false} width={44} unit=" kW" />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={refTime} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" />
          <Bar dataKey="발전량" fill="#06b6d4" opacity={0.85} radius={[2, 2, 0, 0]} unit=" kW" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
