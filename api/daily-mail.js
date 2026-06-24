import nodemailer from 'nodemailer'

// ── 태양 계산 ─────────────────────────────────────────────────────────────────
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

// ── 상수 ─────────────────────────────────────────────────────────────────────
const LOCATION = { name: '창원', nx: 91, ny: 77, lat: 35.17 }
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

// ── KST 날짜 헬퍼 ────────────────────────────────────────────────────────────
function kstDateStr(offsetDays = 0) {
  const d = new Date(Date.now() + (9 * 60 + offsetDays * 24 * 60) * 60000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return { ymd: `${y}${m}${dd}`, isoDate: `${y}-${m}-${dd}`, dateObj: new Date(y, d.getUTCMonth(), d.getUTCDate()), y, m, dd }
}

// ── KMA 단기예보 ──────────────────────────────────────────────────────────────
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
    return { hour, temp: parseFloat(lastTmp), irr, cloudCover }
  })
}

// ── 에어코리아 미세먼지 예보 ──────────────────────────────────────────────────
const GRADE_EMOJI = { '좋음': '💚 좋음', '보통': '💛 보통', '나쁨': '🔴 나쁨', '매우나쁨': '🟣 매우나쁨' }

async function fetchAirQuality(isoDate) {
  const key = process.env.KMA_SERVICE_KEY
  const keyParam = key.includes('%') ? key : encodeURIComponent(key)

  const fetchCode = async (code) => {
    const params = new URLSearchParams({
      returnType: 'json', numOfRows: '10', pageNo: '1',
      searchDate: isoDate, InformCode: code,
    })
    const res = await fetch(
      `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth?serviceKey=${keyParam}&${params}`
    )
    const json = await res.json()
    const items = json.response?.body?.items ?? []
    // 가장 최신 예보에서 경남 등급 추출
    for (const item of items) {
      const grade = item.informGrade?.split(',')
        .map(s => s.trim())
        .find(s => s.startsWith('경남'))
        ?.split(':')[1]?.trim()
      if (grade) return GRADE_EMOJI[grade] ?? grade
    }
    return '정보없음'
  }

  const [pm10, pm25] = await Promise.all([fetchCode('PM10'), fetchCode('PM25')])
  return { pm10, pm25 }
}

// ── Google News RSS 헤드라인 ──────────────────────────────────────────────────
async function fetchNews() {
  const res = await fetch('https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  const xml = await res.text()
  const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)]
    .slice(1, 4)  // 첫 번째는 피드 제목
    .map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim())
  return titles
}

// ── 이메일 HTML ───────────────────────────────────────────────────────────────
function skyLabel(cc) {
  if (cc <= 3) return '☀️ 맑음'
  if (cc <= 7) return '⛅ 구름많음'
  return '☁️ 흐림'
}

function generateHTML(tomorrow, hours, air, headlines) {
  const dayName = DAYS[tomorrow.dateObj.getDay()] + '요일'
  const dateStr = `${tomorrow.y}년 ${tomorrow.m}월 ${tomorrow.dd}일 (${dayName})`
  const temps = hours.map(h => h.temp)
  const minT = Math.min(...temps).toFixed(0)
  const maxT = Math.max(...temps).toFixed(0)
  const totalGen = hours.reduce((s, h) => s + calcPower(5, h.irr, h.temp), 0).toFixed(1)

  const timeRows = hours.slice(6, 20).map(h => `
    <tr>
      <td style="padding:8px 14px;color:#555">${String(h.hour).padStart(2,'0')}:00</td>
      <td style="padding:8px 14px">${skyLabel(h.cloudCover)}</td>
      <td style="padding:8px 14px">${h.temp.toFixed(0)}°C</td>
      <td style="padding:8px 14px;text-align:right">${h.irr} W/m²</td>
      <td style="padding:8px 14px;text-align:right">${calcPower(5, h.irr, h.temp).toFixed(2)} kWh</td>
    </tr>`).join('')

  const airSection = air ? `
  <div style="display:flex;border-bottom:1px solid #eee">
    <div style="flex:1;padding:12px 16px;border-right:1px solid #eee">
      <div style="font-size:11px;color:#888;margin-bottom:4px">미세먼지 PM10</div>
      <div style="font-size:16px;font-weight:bold">${air.pm10}</div>
    </div>
    <div style="flex:1;padding:12px 16px">
      <div style="font-size:11px;color:#888;margin-bottom:4px">초미세먼지 PM2.5</div>
      <div style="font-size:16px;font-weight:bold">${air.pm25}</div>
    </div>
  </div>` : ''

  const newsItems = headlines.map((h, i) =>
    `<div style="padding:8px 0;${i < headlines.length - 1 ? 'border-bottom:1px solid #f0f0f0' : ''}">
      <span style="color:#888;font-size:12px;margin-right:8px">${i + 1}</span>${h}
    </div>`
  ).join('')

  const newsSection = headlines.length > 0 ? `
  <div style="padding:14px 16px;border-top:1px solid #eee">
    <div style="font-size:11px;color:#888;font-weight:600;margin-bottom:8px;text-transform:uppercase">오늘의 주요 뉴스</div>
    <div style="font-size:13px;line-height:1.6;color:#333">${newsItems}</div>
  </div>` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:-apple-system,sans-serif;background:#f0f4f8;margin:0;padding:24px}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
  .hdr{background:linear-gradient(135deg,#1a365d,#2b6cb0);padding:24px 20px;color:#fff}
  .hdr h1{margin:0 0 6px;font-size:22px}
  .hdr p{margin:0;opacity:.8;font-size:14px}
  .summary{display:flex;border-bottom:1px solid #eee}
  .stat{flex:1;padding:14px;text-align:center;border-right:1px solid #eee}
  .stat:last-child{border-right:none}
  .stat-val{font-size:20px;font-weight:bold;color:#1a365d}
  .stat-lbl{font-size:11px;color:#888;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#ebf4ff;font-size:11px;color:#555}
  thead th{padding:7px 14px;text-align:left;font-weight:600}
  tbody tr:nth-child(even){background:#f9fafb}
  .ftr{padding:10px 16px;font-size:11px;color:#aaa;border-top:1px solid #eee;text-align:center}
</style>
</head><body>
<div class="wrap">
  <div class="hdr">
    <h1>🌤 창원 날씨 예보</h1>
    <p>${dateStr}</p>
  </div>
  <div class="summary">
    <div class="stat"><div class="stat-val">${minT}°~${maxT}°C</div><div class="stat-lbl">기온 범위</div></div>
    <div class="stat"><div class="stat-val">${totalGen} kWh</div><div class="stat-lbl">발전량 (5 kW)</div></div>
    <div class="stat"><div class="stat-val">${skyLabel(hours.slice(10,15).reduce((s,h)=>s+h.cloudCover,0)/5)}</div><div class="stat-lbl">낮 날씨</div></div>
  </div>
  ${airSection}
  <table>
    <thead><tr>
      <th>시각</th><th>날씨</th><th>기온</th><th style="text-align:right">일사량</th><th style="text-align:right">발전량</th>
    </tr></thead>
    <tbody>${timeRows}</tbody>
  </table>
  ${newsSection}
  <div class="ftr">기상청 단기예보 · 에어코리아 · Google News 기반</div>
</div>
</body></html>`
}

// ── Vercel Cron 핸들러 (vercel.json: "0 12 * * *" = KST 21:00) ──────────────
export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (!process.env.KMA_SERVICE_KEY)    return res.status(500).json({ error: 'KMA_SERVICE_KEY 미설정' })
  if (!process.env.GMAIL_USER)         return res.status(500).json({ error: 'GMAIL_USER 미설정' })
  if (!process.env.GMAIL_APP_PASSWORD) return res.status(500).json({ error: 'GMAIL_APP_PASSWORD 미설정' })

  const today    = kstDateStr(0)
  const tomorrow = kstDateStr(1)

  const [hours, air, headlines] = await Promise.all([
    fetchForecast(LOCATION, today.ymd, tomorrow),
    fetchAirQuality(tomorrow.isoDate).catch(() => null),
    fetchNews().catch(() => []),
  ])

  const html = generateHTML(tomorrow, hours, air, headlines)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })

  await transporter.sendMail({
    from: `날씨 예보 <${process.env.GMAIL_USER}>`,
    to: process.env.MAIL_TO ?? process.env.GMAIL_USER,
    subject: `🌤 창원 날씨 예보 · ${tomorrow.m}/${tomorrow.dd}(${DAYS[tomorrow.dateObj.getDay()]})`,
    html,
  })

  res.status(200).json({ ok: true, date: tomorrow.isoDate })
}
