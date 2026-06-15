import { useState } from 'react'
import { KW_OPTIONS } from '../constants'

export default function PanelConfigurator({ capacityKw, onChange }) {
  const [custom, setCustom] = useState('')

  const handleCustom = (val) => {
    setCustom(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) onChange(n)
  }

  const isPreset = KW_OPTIONS.some(o => o.kw === capacityKw)

  return (
    <div className="space-y-4 rounded-xl bg-slate-800/50 p-4">
      <h2 className="text-sm font-medium text-slate-300">설치 용량</h2>

      <div className="grid grid-cols-3 gap-2">
        {KW_OPTIONS.map(({ kw, label, desc }) => (
          <button
            key={kw}
            onClick={() => { onChange(kw); setCustom('') }}
            className={`rounded-lg border px-3 py-3 text-left transition-all ${
              capacityKw === kw && isPreset
                ? 'border-amber-500 bg-amber-500/15'
                : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
            }`}
          >
            <div className={`text-base font-bold ${capacityKw === kw && isPreset ? 'text-amber-400' : 'text-white'}`}>
              {label}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">직접 입력</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0.1"
            step="0.1"
            placeholder="예: 7.5"
            value={custom}
            onChange={e => handleCustom(e.target.value)}
            className={`w-full rounded-lg border bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              !isPreset && capacityKw ? 'border-amber-500' : 'border-slate-600'
            }`}
          />
          <span className="text-sm text-slate-400 whitespace-nowrap">kW</span>
        </div>
      </div>

      <div className="rounded-lg bg-slate-700/40 px-3 py-2.5 text-xs text-slate-400 leading-relaxed">
        <span className="text-slate-300 font-medium">현재 선택:</span>{' '}
        <span className="text-amber-400 font-mono">{capacityKw} kWp</span>
        {' '}— 예상 연간 발전량{' '}
        <span className="text-white font-medium">
          {Math.round(capacityKw * 1200).toLocaleString()} kWh
        </span>
        <span className="text-slate-500"> (일사량 1,200 h/년 기준)</span>
      </div>
    </div>
  )
}
