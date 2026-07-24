<script setup>
import { computed } from 'vue'
import {
  state, MONTHS, WEEKDAY_LETTERS, monthWeeks, cursorKey, setCursorDate, parseKey,
} from './store'

const weeks = computed(() => monthWeeks(state.cursor.y, state.cursor.m))

function pick(cell) {
  setCursorDate(parseKey(cell.key))
  state.view = 'Day'
}
</script>

<template>
  <div class="mini-month">
    <div class="mm-head">{{ MONTHS[state.cursor.m] }} {{ state.cursor.y }}</div>
    <div class="mm-grid">
      <span v-for="(w, i) in WEEKDAY_LETTERS" :key="'w' + i" class="mm-wd">{{ w }}</span>
      <template v-for="row in weeks" :key="row.cells[0].key">
        <span
          v-for="cell in row.cells"
          :key="cell.key"
          class="mm-day"
          :class="{ dim: !cell.inMonth, today: cell.isToday, sel: cell.key === cursorKey && !cell.isToday }"
          @click="pick(cell)"
        >{{ cell.day }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.mini-month {
  padding: 12px 12px 10px;
}
.mm-head {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
}
.mm-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  row-gap: 1px;
}
.mm-wd {
  font-size: 8.5px;
  font-weight: 600;
  color: var(--text-dim);
  text-align: center;
  padding-bottom: 3px;
}
.mm-day {
  font-size: 10px;
  text-align: center;
  line-height: 20px;
  height: 20px;
  width: 20px;
  justify-self: center;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text);
}
.mm-day:hover { background: var(--hover); }
.mm-day.dim {
  color: var(--text-dim);
  opacity: 0.5;
}
.mm-day.sel {
  background: var(--selection);
}
.mm-day.today {
  background: #ff3b30;
  color: #fff;
  font-weight: 700;
  opacity: 1;
}
</style>
