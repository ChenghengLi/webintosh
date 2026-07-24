<script setup>
import { ref, watch } from 'vue'

const KEY = 'macos-web:clock-alarms'

const DEFAULTS = [
  { id: 'work', time: '7:00', meridiem: 'AM', label: 'Work', repeat: 'Weekdays', enabled: true },
  { id: 'gym', time: '8:30', meridiem: 'AM', label: 'Gym', repeat: 'Mon, Wed, Fri', enabled: false },
  { id: 'reading', time: '10:00', meridiem: 'PM', label: 'Reading', repeat: 'Every day', enabled: true },
]

// Restore enabled-states from localStorage, keeping the default labels/times.
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(saved)) {
      return DEFAULTS.map(d => {
        const s = saved.find(x => x && x.id === d.id)
        return s ? { ...d, enabled: !!s.enabled } : { ...d }
      })
    }
  } catch (e) { /* corrupted storage — fall back to defaults */ }
  return DEFAULTS.map(d => ({ ...d }))
}

const alarms = ref(load())

watch(alarms, v => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v.map(a => ({ id: a.id, enabled: a.enabled }))))
  } catch (e) { /* storage unavailable — state stays in memory */ }
}, { deep: true })
</script>

<template>
  <div class="alarms">
    <div v-for="(a, i) in alarms" :key="a.id" class="row" :class="{ first: i === 0, off: !a.enabled }">
      <div class="info">
        <div class="when">
          <span class="time">{{ a.time }}</span>
          <span class="ampm">{{ a.meridiem }}</span>
        </div>
        <div class="sub">
          <span class="label">{{ a.label }}</span>
          <span class="repeat">, {{ a.repeat }}</span>
        </div>
      </div>
      <button
        class="switch"
        :class="{ on: a.enabled }"
        role="switch"
        :aria-checked="String(a.enabled)"
        :aria-label="a.label + ' alarm'"
        @click="a.enabled = !a.enabled"
      ><span class="knob" /></button>
    </div>
  </div>
</template>

<style scoped>
.alarms {
  height: 100%;
  overflow-y: auto;
  padding: 8px 0 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 26px;
  border-top: 0.5px solid var(--border);
}

.row.first { border-top: none; }

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.when { display: flex; align-items: baseline; gap: 5px; }

.time {
  font-size: 34px;
  font-weight: 300;
  line-height: 1.05;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  transition: color 0.15s ease;
}

.ampm {
  font-size: 17px;
  font-weight: 400;
  color: var(--text);
  transition: color 0.15s ease;
}

.sub {
  font-size: 13px;
  color: var(--text-dim);
  transition: color 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.repeat { color: var(--text-dim); }

/* Disabled alarms dim out, like the real app. */
.row.off .time,
.row.off .ampm,
.row.off .sub { color: var(--text-dim); opacity: 0.55; }

.switch {
  flex: 0 0 auto;
  width: 46px;
  height: 28px;
  border: none;
  border-radius: 999px;
  background: rgba(120, 120, 128, 0.32);
  position: relative;
  padding: 0;
  cursor: default;
  transition: background 0.2s ease;
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
}

.switch.on { background: #30d158; }
.switch.on .knob { transform: translateX(18px); }
</style>
