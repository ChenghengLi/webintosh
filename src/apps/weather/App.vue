<script setup>
import { computed, ref } from 'vue'
import { CITIES } from './data'
import WeatherIcon from './WeatherIcon.vue'

const cities = CITIES
const cityId = ref('cupertino')
const city = computed(() => cities.find((c) => c.id === cityId.value) || cities[0])
const det = computed(() => city.value.details)

// ---- hourly temperature curve ----
const HOUR_W = 60
const CHART_H = 46
const hourlyW = computed(() => city.value.hourly.length * HOUR_W)

const round = (n) => Math.round(n * 10) / 10

const hourlyPts = computed(() => {
  const temps = city.value.hourly.map((h) => h.temp)
  const lo = Math.min(...temps)
  const hi = Math.max(...temps)
  const span = hi - lo || 1
  return temps.map((t, i) => ({
    x: HOUR_W / 2 + i * HOUR_W,
    y: round(CHART_H - 7 - ((t - lo) / span) * (CHART_H - 16)),
  }))
})

// catmull-rom → cubic bezier for a smooth line
function smooth(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = round(p1.x + (p2.x - p0.x) / 6)
    const c1y = round(p1.y + (p2.y - p0.y) / 6)
    const c2x = round(p2.x - (p3.x - p1.x) / 6)
    const c2y = round(p2.y - (p3.y - p1.y) / 6)
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

const hourlyLine = computed(() => smooth(hourlyPts.value))
const hourlyArea = computed(() => {
  const pts = hourlyPts.value
  if (!pts.length) return ''
  return `${hourlyLine.value} L ${pts[pts.length - 1].x} ${CHART_H} L ${pts[0].x} ${CHART_H} Z`
})

// ---- 10-day range bars ----
const dayMin = computed(() => Math.min(...city.value.days.map((d) => d.low)))
const dayMax = computed(() => Math.max(...city.value.days.map((d) => d.high)))

function tempColor(t) {
  if (t <= 48) return '#3aa0ff'
  if (t <= 58) return '#4dd6c8'
  if (t <= 68) return '#ffd60a'
  if (t <= 78) return '#ffb340'
  if (t <= 88) return '#ff9f0a'
  return '#ff6b4a'
}

function rangeStyle(d) {
  const span = dayMax.value - dayMin.value || 1
  const left = ((d.low - dayMin.value) / span) * 100
  const width = ((d.high - d.low) / span) * 100
  return {
    left: `${left.toFixed(1)}%`,
    width: `${Math.max(width, 7).toFixed(1)}%`,
    background: `linear-gradient(90deg, ${tempColor(d.low)}, ${tempColor(d.high)})`,
  }
}

// ---- gauges / arcs (semicircle r=50 centered at 60,60) ----
const ARC_LEN = Math.PI * 50

function arcDot(f) {
  const a = Math.PI * (1 - Math.max(0, Math.min(1, f)))
  return { x: round(60 + 50 * Math.cos(a)), y: round(60 - 50 * Math.sin(a)) }
}

const uvFrac = computed(() => Math.min(det.value.uv.value, 11) / 11)
const uvDash = computed(() => `${round(uvFrac.value * ARC_LEN)} ${round(ARC_LEN)}`)
const uvDot = computed(() => arcDot(uvFrac.value))
const sunDot = computed(() => arcDot(det.value.sun.pos))

const windTransform = computed(() => `rotate(${det.value.wind.deg} 60 60)`)
</script>

<template>
  <div class="app-root weather">
    <div class="sky" :style="{ background: city.sky }"></div>

    <!-- location switcher -->
    <aside class="sidebar">
      <div class="sb-title">Weather</div>
      <button
        v-for="c in cities"
        :key="c.id"
        class="city-row"
        :class="{ on: c.id === cityId }"
        @click="cityId = c.id"
      >
        <WeatherIcon :name="c.icon" class="c-icon" />
        <span class="c-meta">
          <span class="c-name">{{ c.name }}</span>
          <span class="c-cond">{{ c.condition }}</span>
        </span>
        <span class="c-temp">{{ c.temp }}°</span>
      </button>
    </aside>

    <!-- scrolling content over the sky -->
    <main class="scroll">
      <header class="head">
        <div class="loc">{{ city.name }}</div>
        <div class="big-temp">{{ city.temp }}°</div>
        <div class="cond">{{ city.condition }}</div>
        <div class="hilo">H:{{ city.high }}&nbsp;&nbsp;L:{{ city.low }}</div>
      </header>

      <!-- hourly -->
      <section class="card">
        <div class="card-title"><WeatherIcon name="sun" class="ct-icon" /> HOURLY FORECAST</div>
        <div class="hours-scroll">
          <div class="hours" :style="{ width: hourlyW + 'px' }">
            <svg class="curve" :viewBox="`0 0 ${hourlyW} ${CHART_H}`" preserveAspectRatio="none">
              <path :d="hourlyArea" fill="rgba(255,255,255,0.12)" stroke="none" />
              <path
                :d="hourlyLine"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            <div v-for="h in city.hourly" :key="h.hour" class="hour">
              <span class="h-hr">{{ h.hour }}</span>
              <WeatherIcon :name="h.icon" class="h-icon" />
              <span class="h-temp">{{ h.temp }}°</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 10-day -->
      <section class="card">
        <div class="card-title"><WeatherIcon name="calendar" class="ct-icon" /> 10-DAY FORECAST</div>
        <div v-for="(d, i) in city.days" :key="i" class="day" :class="{ last: i === city.days.length - 1 }">
          <span class="d-name">{{ d.day }}</span>
          <WeatherIcon :name="d.icon" class="d-icon" />
          <span class="d-lo">{{ d.low }}°</span>
          <span class="d-bar"><span class="d-range" :style="rangeStyle(d)"></span></span>
          <span class="d-hi">{{ d.high }}°</span>
        </div>
      </section>

      <!-- detail grid -->
      <div class="grid">
        <section class="card mini">
          <div class="card-title"><WeatherIcon name="sun" class="ct-icon" /> UV INDEX</div>
          <div class="m-big">{{ det.uv.value }}</div>
          <div class="m-sub">{{ det.uv.label }}</div>
          <svg viewBox="0 0 120 66" class="gauge">
            <path d="M10 60 A 50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="8" stroke-linecap="round" />
            <path d="M10 60 A 50 50 0 0 1 110 60" fill="none" stroke="url(#uvgrad)" stroke-width="8" stroke-linecap="round" :stroke-dasharray="uvDash" />
            <circle :cx="uvDot.x" :cy="uvDot.y" r="5" fill="#fff" stroke="rgba(0,0,0,0.25)" stroke-width="1" />
            <defs>
              <linearGradient id="uvgrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#30d158" />
                <stop offset="0.4" stop-color="#ffd60a" />
                <stop offset="0.7" stop-color="#ff9f0a" />
                <stop offset="1" stop-color="#ff453a" />
              </linearGradient>
            </defs>
          </svg>
          <div class="m-note">{{ det.uv.note }}</div>
        </section>

        <section class="card mini">
          <div class="card-title"><WeatherIcon name="wind" class="ct-icon" /> WIND</div>
          <div class="wind-wrap">
            <svg viewBox="0 0 120 120" class="compass">
              <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
              <text x="60" y="16" class="cw" text-anchor="middle">N</text>
              <text x="108" y="64" class="cw" text-anchor="middle">E</text>
              <text x="60" y="114" class="cw" text-anchor="middle">S</text>
              <text x="12" y="64" class="cw" text-anchor="middle">W</text>
              <g :transform="windTransform">
                <line x1="60" y1="86" x2="60" y2="34" stroke="#fff" stroke-width="3" stroke-linecap="round" />
                <polygon points="60,24 54,40 66,40" fill="#fff" />
              </g>
              <circle cx="60" cy="60" r="4" fill="#fff" />
            </svg>
            <div class="wind-meta">
              <div class="m-big">{{ det.wind.speed }}<span class="unit"> mph</span></div>
              <div class="m-sub">{{ det.wind.compass }} · Gusts {{ det.wind.gust }} mph</div>
            </div>
          </div>
        </section>

        <section class="card mini">
          <div class="card-title"><WeatherIcon name="drop" class="ct-icon" /> HUMIDITY</div>
          <div class="m-big">{{ det.humidity.value }}%</div>
          <div class="m-note">The dew point is {{ det.humidity.dewPoint }}° right now.</div>
          <div class="hum-bar"><span :style="{ width: det.humidity.value + '%' }"></span></div>
        </section>

        <section class="card mini">
          <div class="card-title"><WeatherIcon name="sunrise" class="ct-icon" /> SUNRISE &amp; SUNSET</div>
          <svg viewBox="0 0 120 66" class="gauge">
            <line x1="4" y1="60" x2="116" y2="60" stroke="rgba(255,255,255,0.35)" stroke-width="1" />
            <path d="M10 60 A 50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-dasharray="3 4" />
            <circle :cx="sunDot.x" :cy="sunDot.y" r="6" fill="#ffd60a" stroke="rgba(255,255,255,0.8)" stroke-width="1.5" />
          </svg>
          <div class="sun-row">
            <span><WeatherIcon name="sunrise" class="sr-icon" /> {{ det.sun.sunrise }}</span>
            <span><WeatherIcon name="sunset" class="sr-icon" /> {{ det.sun.sunset }}</span>
          </div>
        </section>

        <section class="card mini">
          <div class="card-title"><WeatherIcon name="thermometer" class="ct-icon" /> FEELS LIKE</div>
          <div class="m-big">{{ det.feelsLike.temp }}°</div>
          <div class="m-note">{{ det.feelsLike.note }}</div>
        </section>

        <section class="card mini">
          <div class="card-title"><WeatherIcon name="rain" class="ct-icon" /> PRECIPITATION</div>
          <div class="m-big">{{ det.precip.amount }}</div>
          <div class="m-note">{{ det.precip.note }}</div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.weather {
  flex-direction: row;
  position: relative;
  overflow: hidden;
  color: #fff;
}

.sky {
  position: absolute;
  inset: 0;
  z-index: 0;
  transition: background 0.6s ease;
}

/* ---- sidebar ---- */
.sidebar {
  position: relative;
  z-index: 1;
  width: 196px;
  flex: none;
  padding: 14px 10px;
  background: rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(28px) saturate(1.5);
  -webkit-backdrop-filter: blur(28px) saturate(1.5);
  border-right: 0.5px solid rgba(255, 255, 255, 0.22);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sb-title {
  font-size: 19px;
  font-weight: 700;
  padding: 2px 8px 12px;
}

.city-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.city-row:hover {
  background: rgba(255, 255, 255, 0.12);
}

.city-row.on {
  background: rgba(255, 255, 255, 0.22);
}

.c-icon {
  width: 22px;
  height: 22px;
  flex: none;
}

.c-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.c-name {
  font-size: 13px;
  font-weight: 600;
}

.c-cond {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
}

.c-temp {
  font-size: 17px;
  font-weight: 300;
}

/* ---- scrolling content ---- */
.scroll {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px 26px;
}

.head {
  text-align: center;
  padding: 10px 0 20px;
  text-shadow: 0 1px 8px rgba(0, 20, 60, 0.25);
}

.loc {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.big-temp {
  font-size: 86px;
  font-weight: 200;
  line-height: 1.05;
  margin-left: 12px; /* optical centering for the ° glyph */
}

.cond {
  font-size: 19px;
  font-weight: 500;
}

.hilo {
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.78);
  margin-top: 2px;
}

/* ---- cards (frosted glass) ---- */
.card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(22px) saturate(1.4);
  -webkit-backdrop-filter: blur(22px) saturate(1.4);
  border: 0.5px solid rgba(255, 255, 255, 0.25);
  border-radius: 16px;
  padding: 12px 14px;
  margin-bottom: 14px;
  box-shadow: 0 4px 18px rgba(0, 20, 60, 0.12);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: rgba(255, 255, 255, 0.68);
  margin-bottom: 10px;
}

.ct-icon {
  width: 13px;
  height: 13px;
  flex: none;
}

/* ---- hourly ---- */
.hours-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.hours {
  position: relative;
  display: flex;
  padding-bottom: 8px;
}

.curve {
  position: absolute;
  left: 0;
  bottom: 8px;
  width: 100%;
  height: 46px;
  pointer-events: none;
}

.hour {
  position: relative;
  z-index: 1;
  width: 60px;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

.h-hr {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.h-icon {
  width: 20px;
  height: 20px;
}

.h-temp {
  font-size: 15px;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(30, 80, 160, 0.45);
}

/* ---- 10-day ---- */
.day {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 2px;
  border-top: 0.5px solid rgba(255, 255, 255, 0.18);
  font-size: 14px;
}

.day.last {
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.18);
}

.d-name {
  width: 46px;
  font-weight: 600;
}

.d-icon {
  width: 24px;
  height: 20px;
  flex: none;
}

.d-lo {
  width: 34px;
  text-align: right;
  color: rgba(255, 255, 255, 0.65);
}

.d-bar {
  position: relative;
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.d-range {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 3px;
}

.d-hi {
  width: 34px;
  text-align: right;
  font-weight: 600;
}

/* ---- detail grid ---- */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.grid .card {
  margin-bottom: 0;
  min-height: 148px;
  display: flex;
  flex-direction: column;
}

.m-big {
  font-size: 30px;
  font-weight: 300;
  line-height: 1.1;
}

.m-sub {
  font-size: 13px;
  font-weight: 600;
  margin-top: 1px;
}

.m-note {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  margin-top: auto;
  padding-top: 8px;
}

.unit {
  font-size: 15px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.75);
}

.gauge {
  width: 100%;
  margin-top: 8px;
}

.cw {
  fill: rgba(255, 255, 255, 0.65);
  font-size: 10px;
  font-weight: 600;
}

.wind-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.compass {
  width: 86px;
  height: 86px;
  flex: none;
}

.wind-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hum-bar {
  margin-top: auto;
  height: 5px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.hum-bar span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #5ac8fa, #0a84ff);
}

.sun-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 6px;
}

.sun-row span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sr-icon {
  width: 14px;
  height: 14px;
}

/* scrollbars over the sky */
.scroll::-webkit-scrollbar,
.hours-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scroll::-webkit-scrollbar-thumb,
.hours-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}
</style>
