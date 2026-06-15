import { LOCATIONS } from '../constants'

function toInputValue(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseInputDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function Controls({ location, setLocation, date, setDate, apiKey, setApiKey }) {
  const today = toInputValue(new Date())

  return (
    <div className="rounded-xl bg-slate-800/50 p-4 flex flex-wrap gap-4 items-end">
      <div>
        <label className="mb-1 block text-xs text-slate-400">지역</label>
        <select
          className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          value={location.name}
          onChange={e => setLocation(LOCATIONS.find(l => l.name === e.target.value))}
        >
          {LOCATIONS.map(l => (
            <option key={l.name} value={l.name}>{l.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">날짜</label>
        <input
          type="date"
          max={today}
          value={toInputValue(date)}
          onChange={e => setDate(parseInputDate(e.target.value))}
          className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div className="flex-1 min-w-[240px]">
        <label className="mb-1 block text-xs text-slate-400">
          공공데이터 API 키
          <span className="ml-1 text-slate-500">(없으면 데모 데이터 사용 · data.go.kr에서 발급)</span>
        </label>
        <input
          type="text"
          placeholder="기상청_지상(종관, ASOS) 서비스 키..."
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
    </div>
  )
}
