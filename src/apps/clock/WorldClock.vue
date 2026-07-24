<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AnalogClock from './AnalogClock.vue'

// Fixed UTC offsets (hours) — no reliance on the host's tz database; the host
// clock only pins down UTC itself (via the epoch) and the local "today".
const CITIES = [
  { name: 'Cupertino', off: -7 }, // PDT = UTC-7
  { name: 'New York', off: -4 }, // EDT = UTC-4
  { name: 'London', off: 1 }, // BST = UTC+1
  { name: 'Tokyo', off: 9 }, // JST = UTC+9
  { name: 'Sydney', off: 10 }, // AEST = UTC+10
]

const HOUR_MS = 3600000
const DAY_MS = 86400000

const now = ref(new Date())
let iv = null

onMounted(() => {
  iv = setInterval(() => { now.value = new Date() }, 1000)
})
onBeforeUnmount(() => clearInterval(iv))

// Wall-clock fields in a fixed-offset zone: shift the UTC epoch, then read
// UTC getters so the host timezone never leaks into the result.
function cityParts(d, off) {
  const t = new Date(d.getTime() + off * HOUR_MS)
  return {
    day: Math.floor(t.getTime() / DAY_MS),
    h: t.getUTCHours(),
    m: t.getUTCMinutes(),
    s: t.getUTCSeconds(),
  }
}

// Local calendar day number (host zone) — the reference for Today/Tomorrow.
function localDay(d) {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY_MS)
}

function fmtTime(h, m) {
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const rows = computed(() => {
  const d = now.value
  const refDay = localDay(d)
  return CITIES.map(c => {
    const p = cityParts(d, c.off)
    const diff = p.day - refDay
    return {
      ...c,
      h: p.h,
      m: p.m,
      s: p.s,
      time: fmtTime(p.h, p.m),
      label: diff === 0 ? 'Today' : diff > 0 ? 'Tomorrow' : 'Yesterday',
      isDay: p.h >= 6 && p.h < 18,
    }
  })
})
</script>

<template>
  <div class="world">
    <div v-for="(r, i) in rows" :key="r.name" class="row" :class="{ first: i === 0 }">
      <AnalogClock :h="r.h" :m="r.m" :s="r.s" :day="r.isDay" :size="48" />
      <div class="city">{{ r.name }}</div>
      <div class="when">
        <div class="relday">{{ r.label }}</div>
        <div class="bigtime">{{ r.time }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.world {
  height: 100%;
  overflow-y: auto;
  padding: 8px 0 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 26px;
  border-top: 0.5px solid var(--border);
}

.row.first { border-top: none; }

.city {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.when {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.relday {
  font-size: 12px;
  color: var(--text-dim);
}

.bigtime {
  font-size: 30px;
  font-weight: 300;
  letter-spacing: 0.01em;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  line-height: 1.1;
}
</style>
