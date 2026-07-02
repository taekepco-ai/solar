import { useState, useMemo } from 'react'
import Header from './components/Header'
import Controls from './components/Controls'
import WeatherCards from './components/WeatherCards'
import HourlyChart from './components/HourlyChart'
import PanelConfigurator from './components/PanelConfigurator'
import PowerSummary from './components/PowerSummary'
import ValueBanner from './components/ValueBanner'
import { useWeatherData } from './hooks/useWeatherData'
import { LOCATIONS } from './constants'
import { calcPower } from './utils/solar'

export default function App() {
  const [location, setLocation]   = useState(LOCATIONS[0])
  const [date, setDate]           = useState(new Date())
  const [selectedHour, setSelectedHour] = useState(new Date().getHours())
  const [capacityKw, setCapacityKw]     = useState(5)

  const { data, loading, error, dataSource } = useWeatherData(location, date)

  const powerData = useMemo(() => {
    if (!data) return null
    return data.map(d => calcPower(capacityKw, d.irradiance, d.temperature))
  }, [data, capacityKw])

  const isDemoData = data?.[0]?.isDemoData ?? true

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <Controls
          location={location} setLocation={setLocation}
          date={date} setDate={setDate}
          dataSource={dataSource}
        />

        {error && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-60 items-center justify-center gap-3 text-slate-400">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            데이터 불러오는 중...
          </div>
        ) : (
          <>
            <ValueBanner powerData={powerData} />
            <WeatherCards data={data} hour={selectedHour} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <HourlyChart
                  data={data}
                  powerData={powerData}
                  selectedHour={selectedHour}
                  onHourChange={setSelectedHour}
                />
              </div>
              <PanelConfigurator
                capacityKw={capacityKw}
                onChange={setCapacityKw}
              />
            </div>

            <PowerSummary powerData={powerData} isDemoData={isDemoData} />
          </>
        )}
      </main>
    </div>
  )
}
