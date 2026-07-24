<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  WEEKDAYS, keyOfDate, todayKey, eventsOn, findEvent, moveEventTime, calColor, fmtTime,
  GRID_START, GRID_END, HOUR_H, GRID_H,
} from './store'

const props = defineProps({
  days: { type: Array, default: () => [] },
  draggable: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])

const hours = Array.from({ length: (GRID_END - GRID_START) / 60 }, (_, i) => GRID_START / 60 + i)
const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`
const isToday = (day) => keyOfDate(day) === todayKey

const scrollEl = ref(null)

// red now-line, refreshed every 30s
const nowMin = ref(0)
let timer = null
function tick() {
  const n = new Date()
  nowMin.value = n.getHours() * 60 + n.getMinutes()
}
const nowTop = computed(() => ((nowMin.value - GRID_START) / 60) * HOUR_H)
const showNow = computed(() => nowTop.value >= 0 && nowTop.value <= GRID_H)

onMounted(() => {
  tick()
  timer = setInterval(tick, 30000)
  const el = scrollEl.value
  if (el) el.scrollTop = Math.max(0, Math.min(nowTop.value - 160, GRID_H - el.clientHeight + 60))
})
onUnmounted(() => clearInterval(timer))

// all-day strip
const allDayOn = (key) => eventsOn(key).filter((ev) => ev.allDay)
const hasAllDay = computed(() => props.days.some((d) => allDayOn(keyOfDate(d)).length > 0))

// timed events of one day, laid out with side-by-side overlap columns
function layout(key) {
  const items = eventsOn(key)
    .filter((ev) => !ev.allDay)
    .map((ev) => ({ ev, s: Math.max(ev.startMin, GRID_START), e: Math.min(ev.endMin, GRID_END) }))
    .filter((it) => it.e > it.s)
    .sort((a, b) => a.s - b.s || b.e - a.e)
  const out = []
  let cluster = []
  let cols = []
  let clusterEnd = -1
  const flush = () => {
    const n = Math.max(cols.length, 1)
    for (const it of cluster) out.push({ ...it, left: (it.col / n) * 100, width: 100 / n })
    cluster = []
    cols = []
    clusterEnd = -1
  }
  for (const it of items) {
    if (cluster.length && it.s >= clusterEnd) flush()
    let col = cols.findIndex((end) => end <= it.s)
    if (col === -1) col = cols.length
    cols[col] = it.e
    clusterEnd = Math.max(clusterEnd, it.e)
    cluster.push({ ...it, col })
  }
  if (cluster.length) flush()
  return out
}

function blockStyle(item) {
  const c = calColor(item.ev.calendar)
  return {
    top: ((item.s - GRID_START) / 60) * HOUR_H + 'px',
    height: Math.max(((item.e - item.s) / 60) * HOUR_H - 1, 13) + 'px',
    left: `calc(${item.left}% + 1px)`,
    width: `calc(${item.width}% - 2px)`,
    background: c,
  }
}

// ---- drag to move (Week view) / click to open ----
const drag = ref(null)

function onBlockDown(day, item, e) {
  if (e.button !== 0) return
  e.preventDefault()
  const ev = item.ev
  drag.value = {
    id: ev.id,
    key: keyOfDate(day),
    title: ev.title,
    color: calColor(ev.calendar),
    dur: ev.endMin - ev.startMin,
    origStart: ev.startMin,
    newStart: ev.startMin,
    left: item.left,
    width: item.width,
    startY: e.clientY,
    moved: false,
  }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragUp, { once: true })
}
function onDragMove(e) {
  const d = drag.value
  if (!d) return
  const dy = e.clientY - d.startY
  if (Math.abs(dy) > 4) d.moved = true
  if (d.moved && props.draggable) {
    const steps = Math.round(dy / (HOUR_H / 4)) // 15-min snap
    const hi = Math.max(GRID_START, GRID_END - d.dur)
    d.newStart = Math.min(hi, Math.max(GRID_START, d.origStart + steps * 15))
  }
}
function onDragUp(e) {
  window.removeEventListener('mousemove', onDragMove)
  const d = drag.value
  drag.value = null
  if (!d) return
  if (d.moved && props.draggable) {
    if (d.newStart !== d.origStart) moveEventTime(d.key, d.id, d.newStart)
    return
  }
  if (!d.moved) {
    const f = findEvent(d.id)
    if (f) emit('open', { mode: 'view', key: f.key, ev: f.ev, e })
  }
}

const previewStyle = computed(() => {
  const d = drag.value
  if (!d) return {}
  const visS = Math.max(d.newStart, GRID_START)
  const visE = Math.min(d.newStart + d.dur, GRID_END)
  return {
    top: ((visS - GRID_START) / 60) * HOUR_H + 'px',
    height: Math.max(((visE - visS) / 60) * HOUR_H - 1, 13) + 'px',
    left: `calc(${d.left}% + 1px)`,
    width: `calc(${d.width}% - 2px)`,
    background: d.color,
  }
})

// ---- double-click to create ----
function slotDblClick(day, e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const y = Math.max(0, e.clientY - rect.top)
  const startMin = Math.min(GRID_END - 60, GRID_START + Math.floor(y / (HOUR_H / 4)) * 15)
  emit('open', { mode: 'create', key: keyOfDate(day), startMin, e })
}
function allDayDblClick(day, e) {
  emit('open', { mode: 'create', key: keyOfDate(day), allDay: true, e })
}
</script>

<template>
  <div class="time-view">
    <!-- day header -->
    <div class="tv-header">
      <div class="tv-gutter-head"></div>
      <div v-for="day in days" :key="keyOfDate(day)" class="tv-dayhead">
        <span class="tv-dow">{{ WEEKDAYS[day.getDay()] }}</span>
        <span class="tv-dnum" :class="{ today: isToday(day) }">{{ day.getDate() }}</span>
      </div>
    </div>

    <!-- all-day strip -->
    <div v-if="hasAllDay" class="tv-allday">
      <div class="tv-gutter-head allday-tag">all-day</div>
      <div
        v-for="day in days"
        :key="keyOfDate(day)"
        class="tv-allday-cell"
        :class="{ 'today-col': isToday(day) }"
        @dblclick="allDayDblClick(day, $event)"
      >
        <div
          v-for="ev in allDayOn(keyOfDate(day))"
          :key="ev.id"
          class="allday-pill"
          :style="{ background: calColor(ev.calendar) }"
          @click.stop="emit('open', { mode: 'view', key: keyOfDate(day), ev, e: $event })"
          @dblclick.stop
        >{{ ev.title }}</div>
      </div>
    </div>

    <!-- scrollable time grid -->
    <div class="tv-scroll" ref="scrollEl">
      <div class="tv-body" :style="{ height: GRID_H + 'px' }">
        <div class="tv-gutter-col">
          <span
            v-for="h in hours"
            :key="h"
            class="hour-label"
            :style="{ top: (h - GRID_START / 60) * HOUR_H + 2 + 'px' }"
          >{{ hourLabel(h) }}</span>
        </div>
        <div class="tv-cols">
          <div
            class="tv-lines"
            :style="{
              backgroundImage:
                'repeating-linear-gradient(to bottom, var(--border) 0px, var(--border) 1px, transparent 1px, transparent ' +
                HOUR_H + 'px)',
            }"
          ></div>
          <div
            v-for="day in days"
            :key="keyOfDate(day)"
            class="tv-col"
            :class="{ 'today-col': isToday(day) }"
            @dblclick="slotDblClick(day, $event)"
          >
            <div
              v-for="item in layout(keyOfDate(day))"
              :key="item.ev.id"
              class="ev-block"
              :class="{ 'drag-src': drag && drag.id === item.ev.id && drag.moved }"
              :style="blockStyle(item)"
              @mousedown="onBlockDown(day, item, $event)"
              @dblclick.stop
            >
              <div class="ev-title">{{ item.ev.title }}</div>
              <div v-if="item.e - item.s >= 30" class="ev-time">
                {{ fmtTime(item.ev.startMin) }}–{{ fmtTime(item.ev.endMin) }}
              </div>
            </div>
            <div
              v-if="drag && drag.moved && drag.key === keyOfDate(day)"
              class="ev-block drag-preview"
              :style="previewStyle"
            >
              <div class="ev-title">{{ drag.title }}</div>
              <div class="ev-time">{{ fmtTime(drag.newStart) }}–{{ fmtTime(drag.newStart + drag.dur) }}</div>
            </div>
            <div v-if="isToday(day) && showNow" class="now-line" :style="{ top: nowTop + 'px' }">
              <span class="now-dot"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.time-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* day header */
.tv-header {
  display: flex;
  border-bottom: 0.5px solid var(--border);
}
.tv-gutter-head {
  width: 52px;
  flex-shrink: 0;
  border-right: 0.5px solid var(--border);
}
.tv-dayhead {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  padding: 5px 0;
  border-right: 0.5px solid var(--border);
}
.tv-dayhead:last-child { border-right: none; }
.tv-dow {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
}
.tv-dnum {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border-radius: 50%;
}
.tv-dnum.today {
  background: #ff3b30;
  color: #fff;
  font-weight: 700;
}

/* all-day strip */
.tv-allday {
  display: flex;
  border-bottom: 0.5px solid var(--border);
  max-height: 64px;
  overflow-y: auto;
}
.allday-tag {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 4px 6px 0 0;
  font-size: 10px;
  color: var(--text-dim);
}
.tv-allday-cell {
  flex: 1;
  padding: 3px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-right: 0.5px solid var(--border);
  min-height: 26px;
}
.tv-allday-cell:last-child { border-right: none; }
.allday-pill {
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  line-height: 15px;
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

/* time grid */
.tv-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.tv-body {
  display: flex;
  position: relative;
}
.tv-gutter-col {
  width: 52px;
  flex-shrink: 0;
  position: relative;
  border-right: 0.5px solid var(--border);
}
.hour-label {
  position: absolute;
  right: 6px;
  font-size: 10px;
  color: var(--text-dim);
}
.tv-cols {
  flex: 1;
  display: flex;
  position: relative;
}
.tv-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.tv-col {
  flex: 1;
  position: relative;
  border-right: 0.5px solid var(--border);
}
.tv-col:last-child { border-right: none; }
.today-col {
  background: color-mix(in srgb, var(--accent) 4%, transparent);
}

/* event blocks */
.ev-block {
  position: absolute;
  border-radius: 5px;
  padding: 2px 5px;
  color: #fff;
  font-size: 11px;
  line-height: 1.25;
  overflow: hidden;
  cursor: pointer;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.12);
}
.ev-title {
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ev-time {
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ev-block.drag-src {
  opacity: 0.35;
}
.ev-block.drag-preview {
  opacity: 0.92;
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
}

/* red now-line */
.now-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1.5px;
  background: #ff3b30;
  z-index: 4;
  pointer-events: none;
}
.now-dot {
  position: absolute;
  left: -3px;
  top: -2.75px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff3b30;
}
</style>
