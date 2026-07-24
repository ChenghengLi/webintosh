<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'

const elapsed = ref(0)   // ms shown on the display
const running = ref(false)
const laps = ref([])     // newest first: { n, total, delta }

let base = 0             // performance.now() at the start of the current run segment
let saved = 0            // ms accumulated by previous segments
let raf = null

function tick() {
  elapsed.value = saved + (performance.now() - base)
  raf = requestAnimationFrame(tick)
}

function startStop() {
  if (running.value) {
    running.value = false
    saved = elapsed.value
    cancelAnimationFrame(raf)
    raf = null
  } else {
    running.value = true
    base = performance.now()
    raf = requestAnimationFrame(tick)
  }
}

function lapReset() {
  if (running.value) {
    const total = elapsed.value
    const prev = laps.value.length ? laps.value[0].total : 0
    laps.value.unshift({ n: laps.value.length + 1, total, delta: total - prev })
  } else {
    cancelAnimationFrame(raf)
    raf = null
    elapsed.value = 0
    saved = 0
    laps.value = []
  }
}

onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })

// mm:ss.cs (hours prepended only once reached), centisecond precision.
function fmt(ms) {
  const cs = Math.floor(ms / 10) % 100
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / 60000) % 60
  const h = Math.floor(ms / 3600000)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  const cc = String(cs).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}.${cc}` : `${mm}:${ss}.${cc}`
}

const display = computed(() => fmt(elapsed.value))

// Best (shortest) / worst (longest) laps, only meaningful with 2+ laps.
const bestIdx = computed(() => (
  laps.value.length >= 2
    ? laps.value.reduce((bi, l, i, a) => (l.delta < a[bi].delta ? i : bi), 0)
    : -1
))
const worstIdx = computed(() => (
  laps.value.length >= 2
    ? laps.value.reduce((wi, l, i, a) => (l.delta > a[wi].delta ? i : wi), 0)
    : -1
))
</script>

<template>
  <div class="sw">
    <div class="face">
      <div class="digits">{{ display }}</div>
      <div class="controls">
        <button
          class="btn gray"
          :class="{ dim: !running && elapsed === 0 }"
          @click="lapReset"
        >{{ running ? 'Lap' : 'Reset' }}</button>
        <button
          class="btn"
          :class="running ? 'red' : 'orange'"
          @click="startStop"
        >{{ running ? 'Stop' : 'Start' }}</button>
      </div>
    </div>

    <div v-if="laps.length" class="laps">
      <div
        v-for="(l, i) in laps" :key="l.n"
        class="lap" :class="{ best: i === bestIdx, worst: i === worstIdx }"
      >
        <span class="n">Lap {{ l.n }}</span>
        <span class="t">{{ fmt(l.total) }}</span>
        <span class="d">{{ fmt(l.delta) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.face {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 44px 24px 26px;
  gap: 30px;
}

.digits {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 64px;
  font-weight: 300;
  letter-spacing: 0.02em;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.controls {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 420px;
}

.btn {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  border: none;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: default;
  transition: filter 0.12s ease, opacity 0.15s ease;
}

.btn:hover { filter: brightness(1.08); }
.btn:active { filter: brightness(1.2); }
.btn.dim { opacity: 0.45; }

.btn.orange { background: rgba(255, 159, 10, 0.18); color: #ff9f0a; }
.btn.red { background: rgba(255, 69, 58, 0.16); color: #ff453a; }
.btn.gray { background: rgba(120, 120, 128, 0.22); color: var(--text); }

.laps {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border-top: 0.5px solid var(--border);
  padding: 2px 26px 10px;
}

.lap {
  display: flex;
  align-items: center;
  padding: 9px 0;
  border-bottom: 0.5px solid var(--border);
  font-size: 14px;
  color: var(--text);
}

.lap .n { width: 70px; flex: 0 0 auto; }
.lap .t { flex: 1; text-align: right; font-variant-numeric: tabular-nums; color: var(--text-dim); }
.lap .d { width: 110px; flex: 0 0 auto; text-align: right; font-variant-numeric: tabular-nums; }

.lap.best { color: #30d158; }
.lap.best .t, .lap.best .d { color: #30d158; }
.lap.worst { color: #ff453a; }
.lap.worst .t, .lap.worst .d { color: #ff453a; }
</style>
