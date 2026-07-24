<script setup>
import { ref, computed, onUnmounted } from 'vue'
import PlayPause from './PlayPause.vue'

const props = defineProps({
  item: { type: Object, required: true },
  start: { type: Number, default: 0 }, // resume position, 0–100
})
const emit = defineEmits(['close'])

const TOTAL = 90 // fake runtime in seconds
const elapsed = ref(Math.round((props.start / 100) * TOTAL))
const paused = ref(false)

const progress = computed(() => Math.min(100, (elapsed.value / TOTAL) * 100))
const remaining = computed(() => {
  const s = Math.max(0, TOTAL - elapsed.value)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

function finish() {
  clearInterval(timer)
  emit('close', 100)
}
const timer = setInterval(() => {
  if (paused.value) return
  elapsed.value += 1
  if (elapsed.value >= TOTAL) finish()
}, 1000)
onUnmounted(() => clearInterval(timer))

function seek(e) {
  const r = e.currentTarget.getBoundingClientRect()
  elapsed.value = Math.round(((e.clientX - r.left) / r.width) * TOTAL)
}
function close() {
  emit('close', progress.value)
}
</script>

<template>
  <div class="player" @keydown.esc="close">
    <div class="backdrop" :style="{ background: item.backdrop }"></div>
    <div class="scrim"></div>

    <button class="close-btn" @click="close" title="Close (Esc)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>

    <!-- center title card -->
    <div class="title-card">
      <div class="tc-emoji">{{ item.emoji }}</div>
      <div class="tc-title">{{ item.title }}</div>
      <div class="tc-meta">{{ item.year }} · {{ item.length }} · {{ item.genre }}</div>
    </div>

    <!-- bottom transport controls -->
    <div class="controls">
      <div class="track" @click="seek">
        <div class="fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="ctrl-row">
        <button class="pp-btn" @click="paused = !paused">
          <PlayPause :playing="!paused" />
        </button>
        <span class="time">-{{ remaining }}</span>
        <span class="spacer"></span>
        <span class="ctrl-ghost" title="Subtitles"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="11" x2="11" y2="11"/><line x1="14" y1="11" x2="18" y2="11"/><line x1="6" y1="15" x2="8" y2="15"/><line x1="11" y1="15" x2="18" y2="15"/></svg></span>
        <span class="ctrl-ghost" title="AirPlay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"/><polygon points="12 15 17 21 7 21 12 15" fill="currentColor" stroke="none"/></svg></span>
        <span class="ctrl-ghost" title="Fullscreen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player {
  position: absolute;
  inset: 0;
  z-index: 60;
  border-radius: inherit;
  overflow: hidden;
  background: #000;
}
.backdrop {
  position: absolute;
  inset: 0;
  filter: brightness(0.5) saturate(1.1);
}
.scrim {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.65) 100%);
}
.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(12px);
  color: #fff;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn svg {
  width: 13px;
  height: 13px;
  display: block;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}
.title-card {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-align: center;
  gap: 6px;
}
.tc-emoji {
  font-size: 84px;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6));
}
.tc-title {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.2px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
}
.tc-meta {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}
.controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 22px 16px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}
.track {
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.28);
  cursor: pointer;
  margin-bottom: 12px;
}
.fill {
  height: 100%;
  border-radius: 3px;
  background: #fff;
}
.ctrl-row {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
}
.pp-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(12px);
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pp-btn svg {
  width: 15px;
  height: 15px;
  display: block;
}
.pp-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}
.time {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.85);
}
.spacer {
  flex: 1;
}
.ctrl-ghost {
  opacity: 0.75;
  cursor: default;
  display: inline-flex;
}
.ctrl-ghost svg {
  width: 17px;
  height: 17px;
  display: block;
}
</style>
