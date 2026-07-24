<script setup>
import { MONTHS, WEEKDAY_LETTERS, monthWeeks, state, setCursor, todayKey } from './store'

const [todayY, todayM] = todayKey.split('-').map(Number)

const cellsFor = (m) => monthWeeks(state.cursor.y, m).flatMap((r) => r.cells)
const isCurrentMonth = (m) => state.cursor.y === todayY && m === todayM - 1

function gotoMonth(m) {
  setCursor(state.cursor.y, m, 1)
  state.view = 'Month'
}
</script>

<template>
  <div class="year-view">
    <div
      v-for="m in 12"
      :key="m - 1"
      class="year-card"
      @click="gotoMonth(m - 1)"
    >
      <div class="yc-name" :class="{ current: isCurrentMonth(m - 1) }">{{ MONTHS[m - 1] }}</div>
      <div class="yc-grid">
        <span v-for="(w, i) in WEEKDAY_LETTERS" :key="'w' + i" class="yc-wd">{{ w }}</span>
        <span
          v-for="(cell, i) in cellsFor(m - 1)"
          :key="i"
          class="yc-day"
          :class="{ dim: !cell.inMonth, today: cell.isToday }"
        >{{ cell.day }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.year-view {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-content: start;
  gap: 18px;
  padding: 22px 26px;
}
.year-card {
  cursor: pointer;
  border-radius: 10px;
  padding: 8px 10px 10px;
}
.year-card:hover {
  background: var(--hover);
}
.yc-name {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
}
.yc-name.current { color: #ff3b30; }
.yc-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  row-gap: 1px;
}
.yc-wd {
  font-size: 8.5px;
  font-weight: 600;
  color: var(--text-dim);
  text-align: center;
  padding-bottom: 3px;
}
.yc-day {
  font-size: 9.5px;
  text-align: center;
  line-height: 16px;
  height: 16px;
  width: 16px;
  justify-self: center;
  border-radius: 50%;
  color: var(--text);
}
.yc-day.dim {
  color: var(--text-dim);
  opacity: 0.45;
}
.yc-day.today {
  background: #ff3b30;
  color: #fff;
  font-weight: 700;
  opacity: 1;
}
</style>
