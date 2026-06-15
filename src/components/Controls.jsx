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

const SOURCE_LABEL = {
  kma:       { text: 'KMA 단기예보', color: 'text-sky-400' },
  openmeteo: { text: 'Open-Meteo',  color: 'text-slate-400' },
  demo:      { text: '데모 데이터', color: 'text-amber-400' },
}

export default function Controls({ location, setLocation, date, setDate, dataSource }) {
  const today = toInputValue(new Date())
  const src = SOURCE_LABEL[dataSource] ?? SOURCE_LABEL.openmeteo

  return (
    <div className="rounded-xl bg-slate-800/50 p-4 flex flex-wrap gap-4 items-center">
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

      <div className="ml-auto text-xs text-slate-500">
        기상 데이터: <span className={src.color}>{src.text}</span>
      </div>
    </div>
  )
}
