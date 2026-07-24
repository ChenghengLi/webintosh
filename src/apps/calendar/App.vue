<script setup>
import { computed, ref } from 'vue'
import {
  state, CALENDARS, MONTHS, cursorDate, weekStart, setCursorDate,
  shiftCursor, goToday, parseKey, makeDraft, closePopover, calColor, fmtTime, fmtDate,
} from './store'
import MonthView from './MonthView.vue'
import TimeView from './TimeView.vue'
import YearView from './YearView.vue'
import MiniMonth from './MiniMonth.vue'
import EventPopover from './EventPopover.vue'

const VIEWS = ['Day', 'Week', 'Month', 'Year']
const rootEl = ref(null)

const icloudCals = CALENDARS.filter((c) => c.group === 'iCloud')
const otherCals = CALENDARS.filter((c) => c.group === 'Other')

const title = computed(() => {
  const { y, m } = state.cursor
  if (state.view === 'Year') return String(y)
  if (state.view === 'Month') return `${MONTHS[m]} ${y}`
  if (state.view === 'Day') {
    return cursorDate.value.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  }
  // Week
  const s = weekStart(cursorDate.value)
  const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
  const sm = s.toLocaleDateString('en-US', { month: 'short' })
  const em = e.toLocaleDateString('en-US', { month: 'short' })
  if (s.getFullYear() !== e.getFullYear())
    return `${sm} ${s.getDate()}, ${s.getFullYear()} – ${em} ${e.getDate()}, ${e.getFullYear()}`
  if (s.getMonth() !== e.getMonth()) return `${sm} ${s.getDate()} – ${em} ${e.getDate()}, ${e.getFullYear()}`
  return `${sm} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`
})

const timeDays = computed(() => {
  if (state.view === 'Day') return [cursorDate.value]
  const s = weekStart(cursorDate.value)
  return Array.from({ length: 7 }, (_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + i))
})

function checkStyle(c) {
  return state.visible[c.id]
    ? { background: c.color, borderColor: c.color }
    : { background: 'transparent', borderColor: c.color }
}

// ---- popover hosting ----
function onOpen(payload) {
  const r = rootEl.value?.getBoundingClientRect()
  if (!r) return
  let x = payload.e.clientX - r.left - 24
  let y = payload.e.clientY - r.top - 24
  x = Math.max(8, Math.min(x, r.width - 312))
  y = Math.max(46, Math.min(y, r.height - 140))
  const maxH = r.height - y - 10
  if (payload.mode === 'create') {
    state.popover = {
      mode: 'create', x, y, maxH,
      draft: makeDraft(payload.key, payload.startMin ?? 12 * 60, !!payload.allDay),
    }
  } else {
    state.popover = { mode: 'view', x, y, maxH, key: payload.key, eventId: payload.ev.id }
  }
}

// ---- search ----
const query = ref('')
const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const out = []
  for (const key of Object.keys(state.events).sort()) {
    for (const ev of state.events[key]) {
      const hay = `${ev.title} ${ev.location || ''} ${ev.notes || ''}`.toLowerCase()
      if (hay.includes(q)) out.push({ key, ev })
    }
  }
  return out.slice(0, 12)
})
const srDate = (key) => fmtDate(key, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

function pickResult(r) {
  query.value = ''
  setCursorDate(parseKey(r.key))
  state.view = 'Day'
  const rect = rootEl.value?.getBoundingClientRect()
  const x = rect ? Math.max(8, rect.width - 320) : 400
  const y = 56
  state.popover = {
    mode: 'view', key: r.key, eventId: r.ev.id, x, y,
    maxH: rect ? rect.height - y - 10 : 480,
  }
}
</script>

<template>
  <div class="app-root calendar" ref="rootEl">
    <!-- toolbar -->
    <div class="toolbar">
      <div class="nav-group">
        <button class="nav-btn" title="Previous" @click="shiftCursor(-1)">‹</button>
        <button class="nav-btn" title="Next" @click="shiftCursor(1)">›</button>
      </div>
      <button class="today-btn" @click="goToday">Today</button>
      <h1 class="cal-title">{{ title }}</h1>
      <div class="spacer" />
      <div class="segmented">
        <button
          v-for="v in VIEWS"
          :key="v"
          class="seg"
          :class="{ active: state.view === v }"
          @click="state.view = v"
        >{{ v }}</button>
      </div>
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <circle cx="6" cy="6" r="4.2" />
          <line x1="9.4" y1="9.4" x2="12.6" y2="12.6" />
        </svg>
        <input
          v-model="query"
          class="search-input"
          type="text"
          placeholder="Search"
          @keydown.esc="query = ''"
        />
        <div v-if="query.trim()" class="search-pop glass-strong">
          <div v-if="!results.length" class="sr-empty">No Results</div>
          <button v-for="r in results" :key="r.ev.id" class="sr-row" @mousedown.prevent="pickResult(r)">
            <span class="sr-dot" :style="{ background: calColor(r.ev.calendar) }" />
            <span class="sr-title">{{ r.ev.title }}</span>
            <span class="sr-when">
              {{ srDate(r.key) }}<template v-if="!r.ev.allDay">, {{ fmtTime(r.ev.startMin) }}</template>
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="body">
      <!-- sidebar: mini month + calendars -->
      <aside class="sidebar">
        <MiniMonth />
        <div class="cal-list">
          <div class="cal-group">iCloud</div>
          <button
            v-for="c in icloudCals"
            :key="c.id"
            class="cal-row"
            @click="state.visible[c.id] = !state.visible[c.id]"
          >
            <span class="cal-check" :style="checkStyle(c)">
              <svg v-if="state.visible[c.id]" viewBox="0 0 10 10" fill="none">
                <path d="M1.7 5.5l2.2 2.2 4.4-5.2" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="cal-name">{{ c.name }}</span>
          </button>
          <div class="cal-group">Other</div>
          <button
            v-for="c in otherCals"
            :key="c.id"
            class="cal-row"
            @click="state.visible[c.id] = !state.visible[c.id]"
          >
            <span class="cal-check" :style="checkStyle(c)">
              <svg v-if="state.visible[c.id]" viewBox="0 0 10 10" fill="none">
                <path d="M1.7 5.5l2.2 2.2 4.4-5.2" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="cal-name">{{ c.name }}</span>
          </button>
        </div>
      </aside>

      <!-- main view -->
      <div class="main">
        <MonthView v-if="state.view === 'Month'" @open="onOpen" />
        <TimeView
          v-else-if="state.view === 'Day' || state.view === 'Week'"
          :key="state.view"
          :days="timeDays"
          :draggable="state.view === 'Week'"
          @open="onOpen"
        />
        <YearView v-else />
      </div>
    </div>

    <!-- event popover -->
    <div v-if="state.popover" class="pop-backdrop" @mousedown="closePopover"></div>
    <EventPopover v-if="state.popover" />
  </div>
</template>

<style scoped>
.calendar {
  position: relative;
  background: var(--window-bg);
  color: var(--text);
  font-size: 13px;
  user-select: none;
}

/* toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 0.5px solid var(--border);
  background: var(--titlebar-bg);
}
.nav-group {
  display: flex;
  border: 0.5px solid var(--border);
  border-radius: 7px;
  overflow: hidden;
}
.nav-btn {
  width: 30px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 15px;
  cursor: pointer;
}
.nav-btn + .nav-btn { border-left: 0.5px solid var(--border); }
.nav-btn:hover { background: var(--hover); }
.today-btn {
  padding: 3px 12px;
  border: 0.5px solid var(--border);
  border-radius: 7px;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.today-btn:hover { background: var(--hover); }
.cal-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.spacer { flex: 1; }
.segmented {
  display: flex;
  border: 0.5px solid var(--border);
  border-radius: 7px;
  overflow: hidden;
}
.seg {
  padding: 3px 12px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.seg + .seg { border-left: 0.5px solid var(--border); }
.seg.active { background: var(--selection); }

/* search */
.search-wrap {
  position: relative;
  width: 170px;
}
.search-icon {
  position: absolute;
  left: 7px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  color: var(--text-dim);
  pointer-events: none;
}
.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 3px 8px 3px 24px;
  border: 0.5px solid var(--border);
  border-radius: 7px;
  background: var(--window-bg);
  color: var(--text);
  font-size: 12px;
  outline: none;
}
.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
}
.search-pop {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 280px;
  max-height: 340px;
  overflow-y: auto;
  border: 0.5px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.22);
  padding: 5px;
  z-index: 60;
}
.sr-empty {
  padding: 14px;
  text-align: center;
  color: var(--text-dim);
  font-size: 12px;
}
.sr-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.sr-row:hover { background: var(--hover); }
.sr-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sr-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.sr-when {
  flex-shrink: 0;
  color: var(--text-dim);
  font-size: 11px;
}

/* body layout */
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* sidebar */
.sidebar {
  width: 196px;
  flex-shrink: 0;
  border-right: 0.5px solid var(--border);
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.cal-list {
  padding: 4px 10px 12px;
  border-top: 0.5px solid var(--border);
}
.cal-group {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  padding: 10px 4px 4px;
}
.cal-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}
.cal-row:hover { background: var(--hover); }
.cal-check {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cal-check svg { width: 8px; height: 8px; }
.cal-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* popover backdrop */
.pop-backdrop {
  position: absolute;
  inset: 0;
  z-index: 80;
}
</style>
