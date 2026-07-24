<script setup>
import { ref, computed } from 'vue'
import Chart from './Chart.vue'
import NewsIcon from './NewsIcon.vue'
import { STOCKS, getSeries, getNews, fmtPrice, fmtPct, fmtChange, fmtBig } from './data'

const UP = '#34c759'
const DOWN = '#ff3b30'

const query = ref('')
const selected = ref('AAPL')
const range = ref('1D')

const stock = computed(() => STOCKS.find((s) => s.symbol === selected.value))
const series = computed(() => getSeries(selected.value, range.value))
const news = computed(() => getNews(selected.value))

// NYSE regular hours: Mon–Fri, 9:30–16:00 ET (approximate; DST handled via America/New_York)
const marketOpen = computed(() => {
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = nowET.getDay()
  const mins = nowET.getHours() * 60 + nowET.getMinutes()
  return day >= 1 && day <= 5 && mins >= 9 * 60 + 30 && mins < 16 * 60
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return STOCKS
  return STOCKS.filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
})

function select(s) {
  selected.value = s.symbol
}

// Sidebar sparklines (1D series, drawn in a 64x26 viewBox)
function sparkPath(s) {
  const vals = s.spark
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  return vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * 64
      const y = 2 + (1 - (v - lo) / (hi - lo || 1)) * 22
      return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1)
    })
    .join(' ')
}

const stats = computed(() => {
  const s = stock.value
  return [
    ['Open', fmtPrice(s.open)],
    ['High', fmtPrice(s.high)],
    ['Low', fmtPrice(s.low)],
    ['Prev Close', fmtPrice(s.prevClose)],
    ['Vol', fmtBig(s.volume)],
    ['P/E', s.pe.toFixed(1)],
    ['Mkt Cap', fmtBig(s.mktCap)],
    ['52W High', fmtPrice(s.high52)],
    ['52W Low', fmtPrice(s.low52)],
  ]
})
</script>

<template>
  <div class="app-root stocks">
    <div class="stocks-body">
      <!-- Watchlist sidebar -->
      <aside class="sidebar">
        <div class="side-search">
          <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="query" class="search" type="text" placeholder="Search" spellcheck="false" />
        </div>
        <div class="side-label">Watchlist</div>
        <div
          v-for="s in filtered"
          :key="s.symbol"
          class="watch-row"
          :class="{ sel: s.symbol === selected }"
          @click="select(s)"
        >
          <div class="wr-left">
            <div class="wr-symbol">{{ s.symbol }}</div>
            <div class="wr-name">{{ s.name }}</div>
          </div>
          <svg class="wr-spark" viewBox="0 0 64 26" preserveAspectRatio="none">
            <path
              :d="sparkPath(s)"
              fill="none"
              :stroke="s.change >= 0 ? UP : DOWN"
              stroke-width="1.5"
              vector-effect="non-scaling-stroke"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
          <div class="wr-right">
            <div class="wr-price">{{ fmtPrice(s.price) }}</div>
            <div class="wr-pill" :class="s.change >= 0 ? 'up' : 'down'">{{ fmtPct(s.changePct) }}</div>
          </div>
        </div>
        <div v-if="!filtered.length" class="side-empty">No results for “{{ query }}”</div>
      </aside>

      <!-- Detail pane -->
      <main class="detail">
        <header class="d-head">
          <div class="d-id">
            <div class="d-symbol">{{ stock.symbol }}</div>
            <div class="d-name">{{ stock.name }} · {{ stock.venue }}</div>
          </div>
          <div class="d-pricebox">
            <div class="d-price">{{ fmtPrice(stock.price) }}</div>
            <div class="d-change" :class="stock.change >= 0 ? 'up' : 'down'">
              {{ fmtChange(stock.change) }} ({{ fmtPct(stock.changePct) }})
            </div>
            <div class="d-status" :class="marketOpen ? 'open' : 'closed'">
              {{ marketOpen ? 'Market Open' : 'Market Closed' }}
            </div>
          </div>
        </header>

        <div class="divider"></div>

        <Chart :series="series" v-model:range="range" />

        <div class="divider"></div>

        <!-- Stats grid -->
        <section class="stats">
          <div v-for="st in stats" :key="st[0]" class="stat">
            <div class="stat-label">{{ st[0] }}</div>
            <div class="stat-value">{{ st[1] }}</div>
          </div>
        </section>

        <div class="divider"></div>

        <!-- Business news -->
        <section class="news">
          <div class="sec-title">Business News</div>
          <div v-for="(n, i) in news" :key="i" class="news-row">
            <div class="news-thumb"><NewsIcon :name="n.icon" /></div>
            <div class="news-main">
              <div class="news-head">{{ n.headline }}</div>
              <div class="news-meta">{{ n.source }} · {{ n.time }}</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.stocks {
  --up: #34c759;
  --down: #ff3b30;
  color: var(--text);
  font-size: 13px;
}
.stocks-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ---------- sidebar ---------- */
.sidebar {
  width: 252px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
}
.side-search {
  position: relative;
  padding: 10px 12px 6px;
}
.search-ico {
  position: absolute;
  left: 20px;
  top: 15px;
  width: 11px;
  height: 11px;
  opacity: 0.55;
  pointer-events: none;
}
.search {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px 4px 24px;
  font-size: 12px;
  color: var(--text);
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  outline: none;
}
.search:focus {
  box-shadow: 0 0 0 3px var(--selection);
}
.side-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  padding: 8px 16px 4px;
}
.watch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 1px 8px;
  padding: 7px 8px;
  border-radius: 8px;
  cursor: default;
}
.watch-row:hover:not(.sel) {
  background: var(--hover);
}
.watch-row.sel {
  background: var(--selection);
}
.wr-left {
  flex: 1;
  min-width: 0;
}
.wr-symbol {
  font-weight: 700;
  font-size: 13px;
}
.wr-name {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wr-spark {
  width: 56px;
  height: 24px;
  flex-shrink: 0;
}
.wr-right {
  text-align: right;
  flex-shrink: 0;
}
.wr-price {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-bottom: 2px;
}
.wr-pill {
  display: inline-block;
  min-width: 56px;
  box-sizing: border-box;
  padding: 2px 5px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.wr-pill.up {
  background: var(--up);
}
.wr-pill.down {
  background: var(--down);
}
.side-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--text-dim);
  font-size: 12px;
}

/* ---------- detail pane ---------- */
.detail {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 18px 26px 48px;
  display: flex;
  flex-direction: column;
}
.d-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.d-symbol {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.2px;
}
.d-name {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 2px;
}
.d-pricebox {
  text-align: right;
}
.d-price {
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.d-change {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}
.d-change.up {
  color: var(--up);
}
.d-change.down {
  color: var(--down);
}
.d-status {
  font-size: 11px;
  font-weight: 600;
  margin-top: 3px;
}
.d-status.open {
  color: var(--up);
}
.d-status.closed {
  color: var(--text-dim);
}
.divider {
  height: 0.5px;
  background: var(--border);
  margin: 14px 0;
  flex-shrink: 0;
}

/* ---------- stats ---------- */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px 18px;
  flex-shrink: 0;
}
.stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 0.5px solid var(--border);
}
.stat-label {
  font-size: 11px;
  color: var(--text-dim);
}
.stat-value {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ---------- news ---------- */
.news {
  flex-shrink: 0;
}
.sec-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 6px;
}
.news-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px;
  margin: 0 -8px;
  border-radius: 9px;
  cursor: default;
}
.news-row:hover {
  background: var(--hover);
}
.news-thumb {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--text-dim);
  background: linear-gradient(150deg, var(--hover), var(--sidebar-bg));
  border: 0.5px solid var(--border);
}
.news-thumb svg {
  width: 20px;
  height: 20px;
  display: block;
}
.news-main {
  min-width: 0;
}
.news-head {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.news-meta {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
}
</style>
