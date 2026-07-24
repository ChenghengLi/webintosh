<script setup>
// Bottom player bar: transport, now-playing info, seekable progress, volume.
import { ref } from 'vue'
import { useSystemStore } from '../../stores/system'
import PlayPause from './PlayPause.vue'
import VolumeIcon from './VolumeIcon.vue'

const system = useSystemStore()
const ACCENT = '#fa2d48'

defineProps({
  current: { type: Object, default: null }, // { album, track } or null
  playing: { type: Boolean, default: false },
  elapsed: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
  unavailable: { type: Boolean, default: false }, // show the offline toast
})
const emit = defineEmits(['toggle', 'prev', 'next', 'seek'])

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// Covers that failed to load (offline): hide the img, keep gradient + emoji.
const failed = ref(new Set())
const onCoverError = (key) => { failed.value = new Set(failed.value).add(key) }
</script>

<template>
  <footer class="player glass-strong">
    <div class="transport">
      <button class="t-btn" @click="emit('prev')"><svg viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20" fill="currentColor"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
      <button class="t-btn" @click="emit('toggle')"><PlayPause :playing="playing" /></button>
      <button class="t-btn" @click="emit('next')"><svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4" fill="currentColor"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
    </div>
    <div class="now">
      <div class="cover thumb" :style="{ background: current ? current.album.bg : 'var(--hover)' }">
        <span v-if="current">{{ current.album.emoji }}</span>
        <img v-if="current && !failed.has(current.album.title)" class="cover-img" :src="current.album.cover"
          :alt="current.album.title" loading="lazy" draggable="false" @error="onCoverError(current.album.title)" />
      </div>
      <div class="now-mid">
        <div class="now-text">
          <span class="now-title">{{ current ? current.track.name : 'Not Playing' }}</span>
          <span class="now-artist">{{ current ? `${current.album.artist} — ${current.album.title}` : '' }}</span>
        </div>
        <div class="prog-row">
          <span class="time">{{ fmt(elapsed) }}</span>
          <div class="prog" @click="(e) => duration && emit('seek', e)"><div class="prog-fill" :style="{ width: progress + '%' }"></div></div>
          <span class="time">-{{ fmt(Math.max(0, duration - elapsed)) }}</span>
        </div>
      </div>
    </div>
    <div class="vol">
      <VolumeIcon :volume="system.volume" />
      <input type="range" min="0" max="100" v-model.number="system.volume" :style="{ accentColor: ACCENT }" />
    </div>
    <transition name="toast">
      <div v-if="unavailable" class="toast glass-strong" role="status">Song unavailable (offline)</div>
    </transition>
  </footer>
</template>

<style scoped>
.player {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  width: min(640px, calc(100% - 40px));
  min-height: 54px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  padding: 6px 16px;
  gap: 14px;
  border: 0.5px solid var(--border);
  border-radius: 999px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.24), 0 2px 10px rgba(0, 0, 0, 0.12);
  z-index: 6;
}

/* offline / load-error toast */
.toast {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 7px 14px;
  border-radius: 999px;
  border: 0.5px solid var(--border);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 5;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}
.transport {
  display: flex;
  gap: 4px;
}
.t-btn {
  width: 36px;
  height: 30px;
  border-radius: 6px;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.t-btn svg {
  width: 16px;
  height: 16px;
  display: block;
}
.t-btn:hover {
  background: var(--hover);
}
.now {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  width: 100%;
  max-width: 460px;
  justify-self: center;
}
.cover.thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 0.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.cover.thumb span {
  font-size: 20px;
}
.cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.now-mid {
  flex: 1;
  min-width: 0;
}
.now-text {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.now-title {
  font-size: 12px;
  font-weight: 600;
}
.now-artist {
  font-size: 11px;
  color: var(--text-dim);
}
.now-title,
.now-artist {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prog-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
}
.time {
  font-size: 10px;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
  width: 30px;
}
.prog {
  flex: 1;
  height: 12px;
  position: relative;
  display: flex;
  align-items: center;
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
.vol {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
  color: var(--text-dim);
}
.vol svg {
  width: 16px;
  height: 16px;
  display: block;
}
.vol input {
  width: 100px;
}
</style>
