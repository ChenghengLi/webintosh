// Deterministic seeded market data for the Stocks app.
// Every price, series, stat and headline derives from a hash of the ticker
// symbol, so re-renders and range switches are always stable.

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round2 = (v) => Math.round(v * 100) / 100

export const RANGES = [
  { id: '1D', points: 96, vol: 0.0045 },
  { id: '1W', points: 70, vol: 0.012 },
  { id: '1M', points: 60, vol: 0.02 },
  { id: '3M', points: 90, vol: 0.03 },
  { id: '1Y', points: 140, vol: 0.045 },
]

const RAW = [
  ['AAPL', 'Apple Inc.', 'Apple', 'NASDAQ', 232.92],
  ['MSFT', 'Microsoft Corp.', 'Microsoft', 'NASDAQ', 428.15],
  ['NVDA', 'NVIDIA Corp.', 'NVIDIA', 'NASDAQ', 131.88],
  ['GOOG', 'Alphabet Inc. Class A', 'Alphabet', 'NASDAQ', 177.29],
  ['AMZN', 'Amazon.com Inc.', 'Amazon', 'NASDAQ', 197.12],
  ['TSLA', 'Tesla Inc.', 'Tesla', 'NASDAQ', 248.5],
  ['META', 'Meta Platforms Inc.', 'Meta', 'NASDAQ', 585.2],
  ['AMD', 'Advanced Micro Devices', 'AMD', 'NASDAQ', 122.45],
]

function buildStock([symbol, name, short, venue, base]) {
  const r = mulberry32(hash(symbol))
  const price = round2(base * (0.97 + r() * 0.06))
  const changePct = round2((r() - 0.44) * 4.6)
  const prevClose = round2(price / (1 + changePct / 100))
  const open = round2(prevClose * (1 + (r() - 0.5) * 0.008))
  return {
    symbol,
    name,
    short,
    venue,
    price,
    change: round2(price - prevClose),
    changePct,
    prevClose,
    open,
    pe: round2(14 + r() * 55),
    mktCap: price * (1 + r() * 15) * 1e9,
    volume: (8 + r() * 80) * 1e6,
    high52: round2(price * (1.05 + r() * 0.4)),
    low52: round2(price * (0.6 + r() * 0.35)),
    high: 0, // filled from the 1D series below
    low: 0,
    spark: [], // 1D values for the sidebar sparkline
  }
}

function fmtTime(d) {
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ap}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}`

function makeLabels(rangeId, n) {
  const now = new Date()
  const out = []
  if (rangeId === '1D') {
    const open = new Date(now)
    open.setHours(9, 30, 0, 0)
    for (let i = 0; i < n; i++) {
      out.push(fmtTime(new Date(open.getTime() + (i / (n - 1)) * 390 * 60000)))
    }
  } else {
    const days = { '1W': 7, '1M': 30, '3M': 92, '1Y': 365 }[rangeId]
    for (let i = 0; i < n; i++) {
      out.push(fmtDate(new Date(now.getTime() - (1 - i / (n - 1)) * days * 864e5)))
    }
  }
  return out
}

const seriesCache = new Map()

// Random-walk series anchored so the final point equals the live price.
export function getSeries(symbol, rangeId) {
  const key = symbol + ':' + rangeId
  if (seriesCache.has(key)) return seriesCache.get(key)
  const range = RANGES.find((x) => x.id === rangeId) || RANGES[0]
  const stock = STOCKS.find((s) => s.symbol === symbol)
  const r = mulberry32(hash(key))
  const n = range.points
  const walk = [1]
  let drift = (r() - 0.5) * range.vol * 0.7
  for (let i = 1; i < n; i++) {
    if (r() < 0.08) drift = (r() - 0.5) * range.vol * 0.9 // occasional regime shift
    walk.push(walk[i - 1] * (1 + drift + (r() - 0.5) * 2 * range.vol))
  }
  const k = stock.price / walk[n - 1]
  const labels = makeLabels(rangeId, n)
  const pts = walk.map((v, i) => ({ v: round2(v * k), label: labels[i] }))
  seriesCache.set(key, pts)
  return pts
}

export const STOCKS = RAW.map(buildStock)

// Day high/low and the sidebar sparkline come from the 1D series.
for (const s of STOCKS) {
  const vals = getSeries(s.symbol, '1D').map((p) => p.v)
  s.spark = vals
  s.high = round2(Math.max(...vals, s.open))
  s.low = round2(Math.min(...vals, s.open))
}

const NEWS_TEMPLATES = [
  (short, sym) => `${short} tops Wall Street expectations as services revenue climbs`,
  (short, sym) => `Analysts raise ${sym} price targets after upbeat quarterly guidance`,
  () => `Chip demand surges as AI datacenter spending accelerates`,
  (short) => `${short} expands buyback program as cash pile grows`,
  (short) => `${short} unveils next-gen silicon built for on-device AI`,
  (short, sym) => `Options traders bet big on ${sym} ahead of earnings`,
  () => `Supply-chain strains ease, lifting margins across big tech`,
  (short) => `Regulators take a closer look at ${short}'s marketplace fees`,
  (short) => `${short} signs major enterprise deals as cloud demand rebounds`,
  () => `Investors rotate back into megacap tech as bond yields slip`,
]
const NEWS_SOURCES = ['Bloomberg', 'Reuters', 'CNBC', 'The Wall Street Journal', 'MarketWatch', 'Financial Times']
const NEWS_ICONS = ['trend', 'cpu', 'dollar', 'bars', 'battery', 'drive', 'bank', 'phone']

const newsCache = new Map()

export function getNews(symbol) {
  if (newsCache.has(symbol)) return newsCache.get(symbol)
  const stock = STOCKS.find((s) => s.symbol === symbol)
  const r = mulberry32(hash(symbol + ':news'))
  const used = new Set()
  const items = []
  while (items.length < 4) {
    const i = Math.floor(r() * NEWS_TEMPLATES.length)
    if (used.has(i)) continue
    used.add(i)
    const mins = 15 + Math.floor(r() * 700)
    items.push({
      headline: NEWS_TEMPLATES[i](stock.short, stock.symbol),
      source: NEWS_SOURCES[Math.floor(r() * NEWS_SOURCES.length)],
      icon: NEWS_ICONS[Math.floor(r() * NEWS_ICONS.length)],
      time: mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`,
    })
  }
  newsCache.set(symbol, items)
  return items
}

// ---- formatters ----

export function fmtPrice(v) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtPct(v) {
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
}

export function fmtChange(v) {
  return (v >= 0 ? '+' : '−') + fmtPrice(Math.abs(v))
}

export function fmtBig(v) {
  if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  return String(Math.round(v))
}
