export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">☀️</span>
        <div>
          <h1 className="text-base font-bold text-white leading-none">햇빛의 가치</h1>
          <p className="text-xs text-slate-400 mt-0.5">기상데이터로 배우는 태양광 에너지의 가치</p>
        </div>
      </div>
    </header>
  )
}
