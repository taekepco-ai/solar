import nodemailer from 'nodemailer'

// ── 태양 계산 (src/utils/solar.js와 동일 로직, API 함수라 직접 인라인) ──────
function dayOfYear(date) {
  return Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000)
}
function solarElevation(lat, date, hour) {
  const decl = 23.45 * Math.sin((2 * Math.PI / 365) * (284 + dayOfYear(date)))
  const ha = (15 * (hour - 12)) * (Math.PI / 180)
  const lr = lat * (Math.PI / 180), dr = decl * (Math.PI / 180)
  return Math.asin(Math.max(-1, Math.min(1,
    Math.sin(lr) * Math.sin(dr) + Math.cos(lr) * Math.cos(dr) * Math.cos(ha)
  ))) * (180 / Math.PI)
}
function clearSkyIrradiance(elev) {
  if (elev <= 0) return 0
  const r = elev * (Math.PI / 180)
  return 1361 * 0.7 * Math.pow(0.7, 1 / Math.sin(r)) * Math.sin(r)
}
function cloudFactor(cc) { return 1 - 0.75 * Math.pow(cc / 10, 3.4) }
function calcPower(kw, irr, temp) {
  if (irr <= 0) return 0
  const Tc = temp + (45 - 20) / 800 * irr
  return Math.max(0, kw * (irr / 1000) * Math.max(0, 1 - 0.004 * (Tc - 25)) * 0.8)
}

// ── 상수 ──────────────────────────────────────────────────────────────────────
const LOCATIONS = [
  { name: '서울', nx: 60,  ny: 127, lat: 37.57 },
  { name: '부산', nx: 98,  ny: 76,  lat: 35.10 },
  { name: '대구', nx: 89,  ny: 90,  lat: 35.87 },
  { name: '인천', nx: 55,  ny: 124, lat: 37.48 },
  { name: '광주', nx: 58,  ny: 74,  lat: 35.17 },
  { name: '대전', nx: 67,  ny: 100, lat: 36.37 },
  { name: '울산', nx: 102, ny: 84,  lat: 35.53 },
  { name: '경남', nx: 91,  ny: 77,  lat: 35.17 },
  { name: '제주', nx: 53,  ny: 38,  lat: 33.51 },
]

// ── KST 날짜 헬퍼 ─────────────────────────────────────────────────────────────
function kstDateStr(offsetDays = 0) {
  const d = new Date(Date.now() + (9 * 60 + offsetDays * 24 * 60) * 60000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return { ymd: `${y}${m}${dd}`, dateObj: new Date(y, d.getUTCMonth(), d.getUTCDate()), y, m, dd }
}

// ── KMA 단기예보 조회 ──────────────────────────────────────────────────────────
function skyToCloud(v) {
  const n = parseInt(v, 10)
  return n === 1 ? 2 : n === 3 ? 6 : 9
}

async function fetchForecast(location, baseYmd, targetDate) {
  const key = process.env.KMA_SERVICE_KEY
  const keyParam = key.includes('%') ? key : encodeURIComponent(key)
  const params = new URLSearchParams({
    numOfRows: '1000', pageNo: '1', dataType: 'JSON',
    base_date: baseYmd, base_time: '2000',
    nx: String(location.nx), ny: String(location.ny),
  })
  const res = await fetch(
    `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${keyParam}&${params}`,
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.response?.header?.resultCode !== '00') throw new Error(json.response?.header?.resultMsg)

  const items = json.response?.body?.items?.item ?? []
  const byHour = {}
  for (const item of items.filter(it => it.fcstDate === targetDate.ymd)) {
    const hour = parseInt(item.fcstTime.slice(0, 2), 10)
    if (!byHour[hour]) byHour[hour] = {}
    byHour[hour][item.category] = item.fcstValue
  }

  let lastSky = '1', lastTmp = '15', lastReh = '50', lastWsd = '0'
  return Array.from({ length: 24 }, (_, hour) => {
    const h = byHour[hour] ?? {}
    if (h.SKY !== undefined) lastSky = h.SKY
    if (h.TMP !== undefined) lastTmp = h.TMP
    if (h.REH !== undefined) lastReh = h.REH
    if (h.WSD !== undefined) lastWsd = h.WSD

    const cloudCover = skyToCloud(lastSky)
    const elev = solarElevation(location.lat, targetDate.dateObj, hour + 0.5)
    const irr = Math.round(Math.max(0, clearSkyIrradiance(elev)) * cloudFactor(cloudCover))
    const temp = parseFloat(lastTmp)
    return { hour, temp, irr, cloudCover }
  })
}

// ── 이메일 HTML 생성 ───────────────────────────────────────────────────────────
function skyLabel(hours) {
  const avg = hours.slice(10, 16).reduce((s, h) => s + h.cloudCover, 0) / 6
  if (avg <= 3) return '☀️ 맑음'
  if (avg <= 7) return '⛅ 구름많음'
  return '☁️ 흐림'
}

function genKwh(hours, kw = 5) {
  return hours.reduce((s, h) => s + calcPower(kw, h.irr, h.temp), 0).toFixed(1)
}

function makeRow(name, hours) {
  if (!hours) {
    return `<tr><td class="loc">${name}</td><td colspan="3" style="color:#aaa;padding:10px 14px">데이터 없음</td></tr>`
  }
  const temps = hours.map(h => h.temp)
  const minT = Math.min(...temps).toFixed(0)
  const maxT = Math.max(...temps).toFixed(0)
  return `
  <tr>
    <td class="loc">${name}</td>
    <td style="padding:10px 14px">${skyLabel(hours)}</td>
    <td style="padding:10px 14px">${minT}°C ~ ${maxT}°C</td>
    <td style="padding:10px 14px;text-align:right"><b>${genKwh(hours)} kWh</b></td>
  </tr>`
}

function generateHTML(tomorrow, rows) {
  const dateStr = `${tomorrow.y}년 ${tomorrow.m}월 ${tomorrow.dd}일`
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:-apple-system,sans-serif;background:#f0f4f8;margin:0;padding:24px}
  .wrap{max-width:540px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
  .hdr{background:linear-gradient(135deg,#1a365d,#2b6cb0);padding:24px 20px;color:#fff}
  .hdr h1{margin:0 0 4px;font-size:22px}
  .hdr p{margin:0;opacity:.8;font-size:14px}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#ebf4ff;font-size:11px;color:#555;text-transform:uppercase}
  thead th{padding:8px 14px;text-align:left;font-weight:600}
  tbody tr:nth-child(even){background:#f9fafb}
  .loc{padding:10px 14px;font-weight:bold}
  .ftr{padding:10px 16px;font-size:11px;color:#aaa;border-top:1px solid #eee;text-align:center}
</style>
</head><body>
<div class="wrap">
  <div class="hdr">
    <h1>☀️ 태양광 발전 예보</h1>
    <p>${dateStr} (내일) · 5 kW 시스템 기준</p>
  </div>
  <table>
    <thead><tr>
      <th>지역</th><th>날씨</th><th>기온</th><th style="text-align:right">예상 발전량</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="ftr">기상청 단기예보 기반 추정값 · 실제와 차이가 있을 수 있습니다</div>
</div>
</body></html>`
}

// ── Vercel Cron 핸들러  (vercel.json: "0 12 * * *" = KST 21:00) ────────────
export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (!process.env.KMA_SERVICE_KEY)      return res.status(500).json({ error: 'KMA_SERVICE_KEY 미설정' })
  if (!process.env.GMAIL_USER)           return res.status(500).json({ error: 'GMAIL_USER 미설정' })
  if (!process.env.GMAIL_APP_PASSWORD)   return res.status(500).json({ error: 'GMAIL_APP_PASSWORD 미설정' })

  const today    = kstDateStr(0)
  const tomorrow = kstDateStr(1)

  const results = await Promise.all(
    LOCATIONS.map(async (loc) => {
      try {
        return { name: loc.name, hours: await fetchForecast(loc, today.ymd, tomorrow) }
      } catch {
        return { name: loc.name, hours: null }
      }
    })
  )

  const rows = results.map(r => makeRow(r.name, r.hours)).join('')
  const html = generateHTML(tomorrow, rows)

  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })

  await transporter.sendMail({
    from: `태양광 예보 <${process.env.GMAIL_USER}>`,
    to: process.env.MAIL_TO ?? process.env.GMAIL_USER,
    subject: `☀️ 내일(${tomorrow.y}.${tomorrow.m}.${tomorrow.dd}) 태양광 발전 예보`,
    html,
  })

  res.status(200).json({ ok: true, date: `${tomorrow.y}-${tomorrow.m}-${tomorrow.dd}` })
}
