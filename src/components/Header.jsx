export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">☀️</span>
        <div>
          <h1 className="text-base font-bold text-white leading-none">태양광 발전 시뮬레이터</h1>
          <p className="text-xs text-slate-400 mt-0.5">기상 데이터로 배우는 태양 에너지 원리</p>
        </div>
      </div>
    </header>
  )
}
