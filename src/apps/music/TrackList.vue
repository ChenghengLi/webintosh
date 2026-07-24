<script setup>
// Track table: number/playing indicator, name, up to two dim columns, duration.
defineProps({
  rows: { type: Array, default: () => [] }, // [{ name, sub1, sub2, dur }]
  cols: { type: String, default: '3' }, // '3' (album) | '4' (playlist) | '5' (songs)
  sel: { type: Number, default: -1 },
  cur: { type: Number, default: -1 },
  playing: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'play'])
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
</script>

<template>
  <div class="tracks">
    <div v-for="(r, i) in rows" :key="i" class="trow" :class="['c' + cols, { sel: sel === i, cur: cur === i }]"
      @click="emit('select', i)" @dblclick="emit('play', i)">
      <span class="tnum">
        <span v-if="cur === i && playing" class="eq"><i /><i /><i /></span>
        <template v-else>{{ i + 1 }}</template>
      </span>
      <span class="tname">{{ r.name }}</span>
      <span v-if="cols !== '3'" class="tdim">{{ r.sub1 }}</span>
      <span v-if="cols === '5'" class="tdim">{{ r.sub2 }}</span>
      <span class="tdur">{{ fmt(r.dur) }}</span>
    </div>
  </div>
</template>

<style scoped>
.tracks {
  border-top: 0.5px solid var(--border);
}
.trow {
  display: grid;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 8px;
  border-bottom: 0.5px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
}
.trow.c3 {
  grid-template-columns: 30px 1fr 44px;
}
.trow.c4 {
  grid-template-columns: 30px 1.4fr 1fr 44px;
}
.trow.c5 {
  grid-template-columns: 30px 1.4fr 1fr 1fr 44px;
}
.trow:hover {
  background: var(--hover);
}
.trow.sel {
  background: var(--selection);
}
.tnum {
  color: var(--text-dim);
  font-size: 12px;
  display: flex;
  justify-content: center;
}
.trow.cur .tname {
  color: #fa2d48;
}
.tdim {
  color: var(--text-dim);
  font-size: 12px;
}
.tdur {
  font-size: 12px;
  color: var(--text-dim);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.tname,
.tdim {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eq {
  display: inline-flex;
  gap: 2px;
  align-items: flex-end;
  height: 12px;
}
.eq i {
  width: 3px;
  background: #fa2d48;
  border-radius: 1px;
  animation: eq 0.9s ease-in-out infinite;
}
.eq i:nth-child(2) {
  animation-delay: 0.3s;
}
.eq i:nth-child(3) {
  animation-delay: 0.6s;
}
@keyframes eq {
  0%, 100% { height: 4px; }
  50% { height: 12px; }
}
</style>
