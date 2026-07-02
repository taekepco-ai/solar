import { KRW_PER_KWH } from '../constants'

const TV_KW = 0.25  // 일반 TV 소비전력 250W

export default function ValueBanner({ powerData }) {
  if (!powerData) return null

  const totalKwh = powerData.reduce((s, p) => s + p, 0)
  if (totalKwh <= 0) return null

  const krw   = Math.round(totalKwh * KRW_PER_KWH).toLocaleString('ko-KR')
  const tvH   = Math.round(totalKwh / TV_KW)

  return (
    <div className="rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 px-5 py-3 flex items-center gap-3">
      <span className="text-2xl">☀️</span>
      <p className="text-sm text-amber-100">
        오늘 예상 발전량{' '}
        <span className="font-bold text-white">{totalKwh.toFixed(1)} kWh</span>
        {' '}→{' '}
        <span className="font-bold text-amber-300">{krw}원</span> 절약
        <span className="ml-2 text-slate-400">(TV {tvH}시간)</span>
      </p>
    </div>
  )
}
