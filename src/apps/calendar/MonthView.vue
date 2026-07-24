<script setup>
import { computed } from 'vue'
import {
  state, WEEKDAYS, monthWeeks, cursorKey, setCursorDate, parseKey, eventsOn, calColor, fmtTime,
} from './store'

const emit = defineEmits(['open'])

const weeks = computed(() => monthWeeks(state.cursor.y, state.cursor.m))

function dayEvents(key) {
  return [...eventsOn(key)].sort(
    (a, b) => (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || a.startMin - b.startMin
  )
}

function pillStyle(ev) {
  const c = calColor(ev.calendar)
  if (ev.allDay) return { background: c, color: '#fff' }
  return {
    background: `color-mix(in srgb, ${c} 20%, transparent)`,
    color: `color-mix(in srgb, ${c} 80%, var(--text))`,
  }
}

function selectDay(cell) {
  setCursorDate(parseKey(cell.key))
}
function createAt(cell, e) {
  emit('open', { mode: 'create', key: cell.key, e })
}
function openEvent(ev, key, e) {
  emit('open', { mode: 'view', key, ev, e })
}
</script>

<template>
  <div class="month-view">
    <!-- weekday header -->
    <div class="weekdays">
      <div class="weekday-gutter"></div>
      <div v-for="w in WEEKDAYS" :key="w" class="weekday">{{ w }}</div>
    </div>

    <!-- month grid -->
    <div class="grid">
      <template v-for="row in weeks" :key="row.cells[0].key">
        <div class="week-no">W{{ row.weekNo }}</div>
        <div
          v-for="cell in row.cells"
          :key="cell.key"
          class="cell"
          :class="{ dim: !cell.inMonth, selected: cell.key === cursorKey }"
          @click="selectDay(cell)"
          @dblclick="createAt(cell, $event)"
        >
          <span class="day-num" :class="{ today: cell.isToday }">{{ cell.day }}</span>
          <div class="pills">
            <div
              v-for="ev in dayEvents(cell.key).slice(0, 3)"
              :key="ev.id"
              class="pill"
              :style="pillStyle(ev)"
              @click.stop="openEvent(ev, cell.key, $event)"
              @dblclick.stop
            >
              <span v-if="!ev.allDay" class="pill-time">{{ fmtTime(ev.startMin) }}</span>
              <span class="pill-title">{{ ev.title }}</span>
            </div>
            <div v-if="dayEvents(cell.key).length > 3" class="more">
              {{ dayEvents(cell.key).length - 3 }} more…
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.month-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* weekday header */
.weekdays {
  display: grid;
  grid-template-columns: 28px repeat(7, 1fr);
  border-bottom: 0.5px solid var(--border);
}
.weekday-gutter {
  border-right: 0.5px solid var(--border);
}
.weekday {
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-align: right;
}

/* month grid */
.grid {
  flex: 1;
  display: grid;
  grid-template-columns: 28px repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  min-height: 0;
}
.week-no {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 5px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-dim);
  opacity: 0.55;
  border-right: 0.5px solid var(--border);
  border-bottom: 0.5px solid var(--border);
}
.cell {
  border-right: 0.5px solid var(--border);
  border-bottom: 0.5px solid var(--border);
  padding: 4px 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  cursor: pointer;
}
.cell:nth-child(8n) { border-right: none; }
.cell:hover { background: var(--hover); }
.cell.selected { background: var(--selection); }
.day-num {
  align-self: flex-end;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border-radius: 50%;
}
.cell.dim .day-num { color: var(--text-dim); opacity: 0.55; }
.cell.dim { background: color-mix(in srgb, var(--text) 3%, transparent); }
.cell.dim.selected { background: var(--selection); }
.day-num.today {
  background: #ff3b30;
  color: #fff;
  font-weight: 700;
  opacity: 1;
}
.pills {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
}
.pill {
  display: flex;
  gap: 4px;
  align-items: center;
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 11px;
  line-height: 15px;
  white-space: nowrap;
  overflow: hidden;
}
.pill-time { font-weight: 600; flex-shrink: 0; }
.pill-title { overflow: hidden; text-overflow: ellipsis; }
.more {
  font-size: 10px;
  color: var(--text-dim);
  padding-left: 5px;
}
</style>
