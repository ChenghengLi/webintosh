<script setup>
import { ref, computed } from 'vue'
import { RANGES, fmtPrice } from './data'

const UP = '#34c759'
const DOWN = '#ff3b30'

const props = defineProps({
  series: { type: Array, required: true },
  range: { type: String, default: '1D' },
})
const emit = defineEmits(['update:range'])

const hover = ref(null)
const chartEl = ref(null)

// Chart geometry: viewBox 0 0 100 100 with preserveAspectRatio="none",
// so all coordinates are plain fractions of the container.
const PADT = 0.06
const PADB = 0.06

const bounds = computed(() => {
  const vals = props.series.map((p) => p.v)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = (hi - lo || 1) * 0.07
  return { min: lo - pad, max: hi + pad, lo, hi }
})

function yOf(v) {
  const { min, max } = bounds.value
  return PADT + (1 - (v - min) / (max - min)) * (1 - PADT - PADB)
}

function xy(i, v) {
  return [(i / (props.series.length - 1)) * 100, yOf(v) * 100]
}

const linePath = computed(() =>
  props.series
    .map((p, i) => {
      const [x, y] = xy(i, p.v)
      return (i ? 'L' : 'M') + x.toFixed(2) + ',' + y.toFixed(2)
    })
    .join(' ')
)

const areaPath = computed(() => linePath.value + ' L100,100 L0,100 Z')

const trendUp = computed(() => {
  const s = props.series
  return s[s.length - 1].v >= s[0].v
})
const trendColor = computed(() => (trendUp.value ? UP : DOWN))

const xLabels = computed(() => {
  const s = props.series
  return [s[0].label, s[Math.floor((s.length - 1) / 2)].label, s[s.length - 1].label]
})

function onMove(e) {
  const el = chartEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (!rect.width) return
  const n = props.series.length
  const raw = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const idx = Math.round(raw * (n - 1))
  const p = props.series[idx]
  hover.value = { frac: idx / (n - 1), yFrac: yOf(p.v), price: p.v, label: p.label }
}

const tipLeft = computed(() => (hover.value ? Math.min(86, Math.max(14, hover.value.frac * 100)) : 0))
</script>

<template>
  <section class="chart-sec">
    <div class="range-pills">
      <button
        v-for="r in RANGES"
        :key="r.id"
        class="pill"
        :class="{ on: r.id === range }"
        @click="emit('update:range', r.id)"
      >
        {{ r.id }}
      </button>
    </div>
    <div ref="chartEl" class="chart" @pointermove="onMove" @pointerleave="hover = null">
      <div v-for="g in [25, 50, 75]" :key="g" class="gridline" :style="{ top: g + '%' }"></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="stocks-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" :stop-color="trendColor" stop-opacity="0.28" />
            <stop offset="1" :stop-color="trendColor" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        <path :d="areaPath" fill="url(#stocks-area)" />
        <path
          :d="linePath"
          fill="none"
          :stroke="trendColor"
          stroke-width="1.8"
          vector-effect="non-scaling-stroke"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </svg>
      <span class="y-lbl y-hi">{{ fmtPrice(bounds.hi) }}</span>
      <span class="y-lbl y-lo">{{ fmtPrice(bounds.lo) }}</span>
      <template v-if="hover">
        <div class="xhair" :style="{ left: hover.frac * 100 + '%' }"></div>
        <div
          class="xdot"
          :style="{ left: hover.frac * 100 + '%', top: hover.yFrac * 100 + '%', background: trendColor }"
        ></div>
        <div class="xtip" :style="{ left: tipLeft + '%' }">
          <b>{{ fmtPrice(hover.price) }}</b>
          <span>{{ hover.label }}</span>
        </div>
      </template>
    </div>
    <div class="x-labels">
      <span>{{ xLabels[0] }}</span>
      <span>{{ xLabels[1] }}</span>
      <span>{{ xLabels[2] }}</span>
    </div>
  </section>
</template>

<style scoped>
.chart-sec {
  flex-shrink: 0;
}
.range-pills {
  display: flex;
  gap: 2px;
  margin-bottom: 8px;
}
.pill {
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 6px;
  cursor: default;
  font-family: inherit;
}
.pill:hover:not(.on) {
  background: var(--hover);
}
.pill.on {
  background: var(--selection);
  color: var(--text);
}
.chart {
  position: relative;
  height: 200px;
  user-select: none;
  touch-action: none;
}
.chart svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.gridline {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed var(--border);
  pointer-events: none;
}
.y-lbl {
  position: absolute;
  right: 2px;
  font-size: 10px;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
.y-hi {
  top: 2px;
}
.y-lo {
  bottom: 2px;
}
.xhair {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0.5px;
  background: var(--text-dim);
  opacity: 0.7;
  pointer-events: none;
}
.xdot {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 2px solid var(--window-bg);
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 0 0 0.5px var(--border);
}
.xtip {
  position: absolute;
  top: 4px;
  transform: translateX(-50%);
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 4px 9px;
  border-radius: 8px;
  background: var(--window-bg);
  border: 0.5px solid var(--border);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
}
.xtip b {
  font-variant-numeric: tabular-nums;
}
.xtip span {
  color: var(--text-dim);
  font-size: 11px;
}
.x-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
  margin-top: 5px;
}
</style>
