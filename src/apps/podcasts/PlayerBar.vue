<script setup>
// Bottom mini-player: now-playing info, 15s skip transport, seekable
// progress bar, and a playback-speed chip (1× / 1.5× / 2×).
import { computed, ref } from 'vue'
import PlayPause from './PlayPause.vue'

const ACCENT = '#8e44ad'

const props = defineProps({
  current: { type: Object, default: null }, // { show, ep, idx } or null
  playing: { type: Boolean, default: false },
  elapsed: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
  speed: { type: Number, default: 1 },
})
const emit = defineEmits(['toggle', 'skipBack', 'skipFwd', 'seek', 'cycleSpeed'])

const fmt = (s) => {
  s = Math.max(0, Math.round(s))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
const speedLabel = computed(() => `${props.speed}×`)

// Covers that failed to load (offline): hide the img, keep gradient + emoji.
const failed = ref(new Set())
const onCoverError = (key) => { failed.value = new Set(failed.value).add(key) }
</script>

<template>
  <footer class="player glass-strong">
    <div class="now">
      <div class="cover" :style="{ background: current ? current.show.bg : 'var(--hover)' }">
        <span v-if="current">{{ current.show.emoji }}</span>
        <img v-if="current && !failed.has(current.show.id)" class="cover-img" :src="current.show.cover"
          :alt="current.show.title" loading="lazy" draggable="false" @error="onCoverError(current.show.id)" />
      </div>
      <div class="now-text">
        <div class="now-title">{{ current ? current.ep.title : 'Not Playing' }}</div>
        <div class="now-show">{{ current ? current.show.title : 'Choose an episode' }}</div>
      </div>
    </div>

    <div class="mid">
      <div class="transport">
        <button class="t-btn skip" :disabled="!current" title="Skip back 15 seconds"
          @click="emit('skipBack')">
          <svg class="sk-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 3 3 8 8 8"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L3 8"/></svg><span class="sk-num">15</span>
        </button>
        <button class="t-btn play" :disabled="!current" @click="emit('toggle')">
          <PlayPause :playing="playing" />
        </button>
        <button class="t-btn skip" :disabled="!current" title="Skip forward 15 seconds"
          @click="emit('skipFwd')">
          <svg class="sk-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 3 21 8 16 8"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L21 8"/></svg><span class="sk-num">15</span>
        </button>
      </div>
      <div class="prog-row">
        <span class="time">{{ fmt(elapsed) }}</span>
        <div class="prog" @click="(e) => duration && emit('seek', e)">
          <div class="prog-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="time">-{{ fmt(duration - elapsed) }}</span>
      </div>
    </div>

    <div class="right">
      <button class="speed" :disabled="!current" title="Playback speed" @click="emit('cycleSpeed')">
        {{ speedLabel }}
      </button>
    </div>
  </footer>
</template>

<style scoped>
.player {
  height: 64px;
  flex-shrink: 0;
  border-top: 0.5px solid var(--border);
  display: grid;
  grid-template-columns: 240px 1fr 110px;
  align-items: center;
  padding: 0 16px;
  gap: 14px;
}

/* now playing */
.now {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.cover {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  border: 0.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.cover span {
  font-size: 21px;
}
.cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.now-text {
  min-width: 0;
}
.now-title,
.now-show {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.now-title {
  font-size: 12px;
  font-weight: 600;
}
.now-show {
  font-size: 11px;
  color: var(--text-dim);
}

/* transport + progress */
.mid {
  max-width: 520px;
  width: 100%;
  justify-self: center;
}
.transport {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  margin-bottom: 2px;
}
.t-btn {
  height: 28px;
  min-width: 32px;
  border-radius: 6px;
  font-size: 15px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.t-btn:hover:not(:disabled) {
  background: var(--hover);
}
.t-btn:disabled {
  opacity: 0.35;
}
.t-btn.play {
  font-size: 16px;
}
.t-btn.play svg {
  width: 17px;
  height: 17px;
  display: block;
}
.skip .sk-arrow {
  width: 19px;
  height: 19px;
  display: block;
}
.skip .sk-num {
  position: absolute;
  font-size: 6.5px;
  font-weight: 700;
  letter-spacing: -0.2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -38%);
}
.prog-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.time {
  font-size: 10px;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
  min-width: 34px;
}
.time:last-child {
  text-align: right;
}
.prog {
  flex: 1;
  height: 12px;
  position: relative;
  display: flex;
  align-items: center;
  cursor: default;
}
.prog::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
}
.prog-fill {
  position: relative;
  height: 4px;
  border-radius: 2px;
  background: v-bind(ACCENT);
}

/* speed chip */
.right {
  display: flex;
  justify-content: flex-end;
}
.speed {
  font-size: 12px;
  font-weight: 700;
  color: v-bind(ACCENT);
  border: 1px solid v-bind(ACCENT);
  border-radius: 999px;
  padding: 3px 12px;
  min-width: 52px;
}
.speed:hover:not(:disabled) {
  background: v-bind(ACCENT);
  color: #fff;
}
.speed:disabled {
  opacity: 0.4;
}
</style>
