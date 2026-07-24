<script setup>
import { computed } from 'vue'
import { fmtGB, fmtRate, fmtKBRate } from './processes.js'

const props = defineProps({
  tab: { type: String, default: 'CPU' },
  sys: { type: Object, required: true },
  history: { type: Array, default: () => [] }, // [{u, s}] oldest → newest
})

const N = 100 // graph history capacity / viewBox width
const H = 46 // viewBox height

const idle = computed(() => Math.max(0, 100 - props.sys.user - props.sys.system))
const memUsed = computed(() => props.sys.appMem + props.sys.wired + props.sys.compressed)
const pressurePct = computed(() => Math.round(props.sys.pressure * 100))
const pressureColor = computed(() =>
  props.sys.pressure < 0.5 ? '#34c759' : props.sys.pressure < 0.75 ? '#ffd60a' : '#ff453a'
)

// stacked-area CPU history: user (green) at the bottom, system (red) on top.
// Samples always span the full graph width (with a full history this is x = i).
function areaPath(getLo, getHi) {
  const pts = props.history
  if (pts.length < 2) return ''
  const x = (i) => ((i * (N - 1)) / (pts.length - 1)).toFixed(1)
  const y = (v) => (H - Math.min(100, v) * (H / 100)).toFixed(1)
  let d = `M ${x(0)} ${y(getLo(pts[0]))}`
  pts.forEach((p, i) => i > 0 && (d += ` L ${x(i)} ${y(getLo(p))}`))
  for (let i = pts.length - 1; i >= 0; i--) d += ` L ${x(i)} ${y(getHi(pts[i]))}`
  return d + ' Z'
}
const userArea = computed(() => areaPath(
  () => 0,
  (p) => p.u
))
const sysArea = computed(() => areaPath(
  (p) => p.u,
  (p) => p.u + p.s
))
function linePts(get) {
  const pts = props.history
  if (pts.length < 2) return ''
  return pts
    .map((p, i) => {
      const xi = ((i * (N - 1)) / (pts.length - 1)).toFixed(1)
      const yi = (H - Math.min(100, get(p)) * (H / 100)).toFixed(1)
      return `${xi},${yi}`
    })
    .join(' ')
}
const userLine = computed(() => linePts((p) => p.u))
const sysLine = computed(() => linePts((p) => p.u + p.s))
</script>

<template>
  <footer class="statusbar">
    <!-- CPU -->
    <template v-if="tab === 'CPU'">
      <div class="stats">
        <div class="stat"><span class="label">System:</span><b>{{ sys.system.toFixed(1) }}%</b></div>
        <div class="stat"><span class="label">User:</span><b>{{ sys.user.toFixed(1) }}%</b></div>
        <div class="stat"><span class="label">Idle:</span><b>{{ idle.toFixed(1) }}%</b></div>
      </div>
      <div class="graph" title="CPU history">
        <svg :viewBox="`0 0 ${N} ${H}`" preserveAspectRatio="none">
          <line v-for="g in [25, 50, 75]" :key="g" x1="0" :y1="H - g * H / 100" :x2="N" :y2="H - g * H / 100" class="grid" />
          <path :d="userArea" class="area-user" />
          <path :d="sysArea" class="area-sys" />
          <polyline :points="userLine" class="line-user" />
          <polyline :points="sysLine" class="line-sys" />
        </svg>
      </div>
    </template>

    <!-- Memory -->
    <template v-else-if="tab === 'Memory'">
      <div class="pressure">
        <span class="label">Memory Pressure:</span>
        <div class="pressure-track">
          <div class="pressure-fill" :style="{ width: pressurePct + '%', background: pressureColor }"></div>
        </div>
      </div>
      <div class="stats wrap">
        <div class="stat"><span class="label">Physical Memory:</span><b>{{ fmtGB(sys.memTotal) }}</b></div>
        <div class="stat"><span class="label">Memory Used:</span><b>{{ fmtGB(memUsed) }}</b></div>
        <div class="stat"><span class="label">App Memory:</span><b>{{ fmtGB(sys.appMem) }}</b></div>
        <div class="stat"><span class="label">Wired Memory:</span><b>{{ fmtGB(sys.wired) }}</b></div>
        <div class="stat"><span class="label">Compressed:</span><b>{{ fmtGB(sys.compressed) }}</b></div>
        <div class="stat"><span class="label">Swap Used:</span><b>{{ fmtGB(sys.swap) }}</b></div>
      </div>
    </template>

    <!-- Energy -->
    <template v-else-if="tab === 'Energy'">
      <div class="stats wrap">
        <div class="stat">
          <span class="label">Battery:</span>
          <b class="battery-val">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 8h14.5A1.5 1.5 0 0 1 19 9.5v5a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 14.5v-5A1.5 1.5 0 0 1 3 8z" />
              <path d="M21.6 10.6v2.8" />
              <path d="M4.5 10.2h7.5v3.6H4.5z" fill="currentColor" stroke="none" />
            </svg>
            {{ sys.battery }}%
          </b>
        </div>
        <div class="stat"><span class="label">Power Source:</span><b>Power Adapter</b></div>
        <div class="stat"><span class="label">Avg Energy Impact (8 hrs):</span><b>14.2</b></div>
        <div class="stat"><span class="label">App Nap:</span><b>3 processes</b></div>
        <div class="stat"><span class="label">Preventing Sleep:</span><b>No</b></div>
      </div>
    </template>

    <!-- Disk -->
    <template v-else-if="tab === 'Disk'">
      <div class="stats wrap">
        <div class="stat"><span class="label">Data read/sec:</span><b>{{ fmtRate(sys.diskRead) }}</b></div>
        <div class="stat"><span class="label">Data written/sec:</span><b>{{ fmtRate(sys.diskWrite) }}</b></div>
        <div class="stat"><span class="label">Data read:</span><b>{{ fmtGB(sys.diskReadTotal) }}</b></div>
        <div class="stat"><span class="label">Data written:</span><b>{{ fmtGB(sys.diskWriteTotal) }}</b></div>
      </div>
    </template>

    <!-- Network -->
    <template v-else>
      <div class="stats wrap">
        <div class="stat"><span class="label">Data received/sec:</span><b>{{ fmtKBRate(sys.netIn) }}</b></div>
        <div class="stat"><span class="label">Data sent/sec:</span><b>{{ fmtKBRate(sys.netOut) }}</b></div>
        <div class="stat"><span class="label">Data received:</span><b>{{ fmtGB(sys.netInTotal) }}</b></div>
        <div class="stat"><span class="label">Data sent:</span><b>{{ fmtGB(sys.netOutTotal) }}</b></div>
      </div>
    </template>
  </footer>
</template>

<style scoped>
.statusbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 58px;
  padding: 7px 14px;
  border-top: 0.5px solid var(--border);
  background: var(--sidebar-bg);
  font-size: 11px;
  overflow: hidden;
}
.stats {
  display: flex;
  gap: 18px;
  flex: none;
}
.stats.wrap {
  flex-wrap: wrap;
  row-gap: 4px;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
  white-space: nowrap;
}
.label {
  color: var(--text-dim);
}
.stat b {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.battery-val {
  display: flex;
  align-items: center;
  gap: 4px;
}
.battery-val svg {
  width: 15px;
  height: 15px;
}
.graph {
  flex: 1;
  height: 46px;
  min-width: 120px;
  border: 0.5px solid var(--border);
  border-radius: 5px;
  background: var(--window-bg);
  overflow: hidden;
}
.graph svg {
  width: 100%;
  height: 100%;
  display: block;
}
.grid {
  stroke: var(--border);
  stroke-width: 0.5;
}
.area-user { fill: rgba(52, 199, 89, 0.35); }
.area-sys { fill: rgba(255, 59, 48, 0.32); }
.line-user {
  fill: none;
  stroke: #28b84c;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.line-sys {
  fill: none;
  stroke: #ff3b30;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.pressure {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.pressure-track {
  width: 150px;
  height: 9px;
  border-radius: 5px;
  border: 0.5px solid var(--border);
  background: var(--window-bg);
  overflow: hidden;
}
.pressure-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease, background 0.6s ease;
}
</style>
