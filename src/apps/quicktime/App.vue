<script setup>
import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import { useSystemStore } from '../../stores/system'
import { useWindowsStore } from '../../stores/windows'

// Real video: Big Buck Bunny (~1 min), served from media.w3.org.
const SRC = 'https://media.w3.org/2010/05/bunny/movie.mp4'

const system = useSystemStore()
const windows = useWindowsStore()
const windowId = inject('windowId')

const video = ref(null)
const time = ref(0)
const duration = ref(0)
const playing = ref(false)
const ended = ref(false)
const failed = ref(false)
const controlsVisible = ref(true)
const seeking = ref(false)
const muted = ref(false)

let hideTimer = null

const isActive = computed(() => windows.activeWindow?.id === windowId)
const progress = computed(() => (duration.value ? Math.min(1, time.value / duration.value) : 0))

function fmt(t) {
  const s = Math.max(0, Math.round(t))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const currentLabel = computed(() => fmt(time.value))
const remainingLabel = computed(() => `-${fmt(Math.max(0, duration.value - time.value))}`)

// --- playback: drive the real <video> element ---
function play() {
  const v = video.value
  if (!v || failed.value) return
  if (ended.value) {
    v.currentTime = 0
    ended.value = false
  }
  v.play().catch(() => {})
}

function pause() {
  video.value?.pause()
}

function toggle() {
  if (ended.value) return replay()
  if (playing.value) pause()
  else play()
}

function replay() {
  const v = video.value
  if (!v) return
  ended.value = false
  v.currentTime = 0
  v.play().catch(() => {})
}

// video element events keep the UI in sync
function onTimeUpdate() {
  if (!seeking.value && video.value) time.value = video.value.currentTime
}

function onLoadedMetadata() {
  duration.value = video.value?.duration || 0
}

function onPlay() {
  playing.value = true
  ended.value = false
  poke()
}

function onPause() {
  playing.value = false
  poke()
}

function onEnded() {
  playing.value = false
  ended.value = true
  controlsVisible.value = true
  clearTimeout(hideTimer)
}

function onError() {
  failed.value = true
  playing.value = false
  controlsVisible.value = true
  clearTimeout(hideTimer)
}

// --- controls auto-hide: fade in on mouse move, out after 2s idle ---
function poke() {
  controlsVisible.value = true
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (!seeking.value && !ended.value) controlsVisible.value = false
  }, 2000)
}

function onMouseLeave() {
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (!seeking.value && !ended.value) controlsVisible.value = false
  }, 600)
}

// --- seek bar: click to seek, draggable knob ---
const bar = ref(null)

function ratioFromEvent(e) {
  const r = bar.value.getBoundingClientRect()
  return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
}

function onBarDown(e) {
  if (failed.value || !duration.value) return
  poke()
  seeking.value = true
  ended.value = false
  time.value = ratioFromEvent(e) * duration.value
  window.addEventListener('pointermove', onBarMove)
  window.addEventListener('pointerup', onBarUp, { once: true })
}

function onBarMove(e) {
  if (!seeking.value) return
  time.value = ratioFromEvent(e) * duration.value
}

function onBarUp(e) {
  if (seeking.value && video.value) {
    time.value = ratioFromEvent(e) * duration.value
    video.value.currentTime = time.value
  }
  seeking.value = false
  window.removeEventListener('pointermove', onBarMove)
  poke()
}

// --- volume: slider drives the system volume, applied to the element ---
const volume = computed({
  get: () => system.volume,
  set: (v) => {
    system.volume = Number(v)
  },
})

function applyVolume() {
  const v = video.value
  if (!v) return
  v.volume = Math.min(1, Math.max(0, system.volume / 100))
  v.muted = muted.value
}

watch(() => system.volume, applyVolume)
watch(muted, applyVolume)

function toggleMute() {
  muted.value = !muted.value
  poke()
}

function toggleFullscreen() {
  poke()
  windows.toggleFullScreen(windowId)
}

// --- space bar toggles play (only when this window is frontmost) ---
function onKey(e) {
  if (e.code !== 'Space' || !isActive.value) return
  e.preventDefault()
  poke()
  toggle()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  applyVolume()
  poke()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointermove', onBarMove)
  clearTimeout(hideTimer)
})
</script>

<template>
  <div
    class="app-root qt"
    :class="{ idle: !controlsVisible }"
    @mousemove="poke"
    @mouseleave="onMouseLeave"
  >
    <div class="stage" @click="toggle(); poke()">
      <video
        ref="video"
        class="movie"
        :src="SRC"
        preload="metadata"
        playsinline
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        @error="onError"
      ></video>

      <!-- media offline placeholder -->
      <div v-if="failed" class="offline" @click.stop>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 2l20 20" />
          <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9.3 3 11 7-0.5 1.1-1.2 2.1-2.1 3M6.6 6.6C4 8 2.3 9.8 1 12c1.7 4 6 7 11 7 1.7 0 3.3-0.4 4.7-1" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
        <p class="offline-title">Media Offline</p>
        <p class="offline-sub">The video could not be loaded.</p>
      </div>

      <!-- big center transport button -->
      <transition name="fade">
        <button
          v-if="controlsVisible && !failed && (!playing || ended)"
          class="center-btn"
          :aria-label="ended ? 'Replay' : 'Play'"
          @click.stop="ended ? replay() : toggle(); poke()"
        >
          <svg v-if="ended" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 5V1.8L6.8 6 12 10.2V7c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8z"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.5 5.5v13l11-6.5z" />
          </svg>
        </button>
      </transition>
    </div>

    <!-- floating bottom control bar -->
    <transition name="fade">
      <div v-if="controlsVisible" class="controls" @click.stop>
        <button
          class="t-btn"
          :aria-label="playing ? 'Pause' : 'Play'"
          :disabled="failed"
          @click="toggle()"
        >
          <svg v-if="playing" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.5 5.5v13l11-6.5z" />
          </svg>
        </button>

        <span class="time">{{ currentLabel }}</span>

        <div
          ref="bar"
          class="seek"
          :class="{ seeking }"
          role="slider"
          aria-label="Seek"
          :aria-valuenow="Math.round(time)"
          aria-valuemin="0"
          :aria-valuemax="Math.round(duration)"
          @pointerdown="onBarDown"
        >
          <div class="seek-track">
            <div class="seek-fill" :style="{ width: `${progress * 100}%` }"></div>
          </div>
          <div class="knob" :style="{ left: `${progress * 100}%` }"></div>
        </div>

        <span class="time dim">{{ remainingLabel }}</span>

        <div class="vol">
          <button
            class="mute-btn"
            :aria-label="muted ? 'Unmute' : 'Mute'"
            @click="toggleMute"
          >
            <svg class="vol-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 9v6h4l5 4V5L8 9H4z" />
              <template v-if="!muted">
                <path
                  v-if="volume > 0"
                  d="M16.5 8.6a4.5 4.5 0 0 1 0 6.8l-.9-1.1a2.9 2.9 0 0 0 0-4.6z"
                />
                <path
                  v-if="volume > 45"
                  d="M16.5 5.7a8 8 0 0 1 0 12.6l-.9-1.1a6.4 6.4 0 0 0 0-10.4z"
                />
              </template>
              <path
                v-else
                d="M16.2 9.2l4.6 4.6m0-4.6l-4.6 4.6"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                fill="none"
              />
            </svg>
          </button>
          <input
            v-model="volume"
            class="vol-slider"
            type="range"
            min="0"
            max="100"
            aria-label="Volume"
            @pointerdown.stop
          />
        </div>

        <button class="t-btn" aria-label="Enter Full Screen" @click="toggleFullscreen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9" />
            <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" />
            <path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" />
            <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
          </svg>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.qt {
  position: relative;
  background: #000;
  color: #f5f5f7;
  overflow: hidden;
  user-select: none;
}

.qt.idle,
.qt.idle * {
  cursor: none;
}

.stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.movie {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

/* --- media offline placeholder --- */
.offline {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #000;
  color: rgba(255, 255, 255, 0.55);
}

.offline svg {
  width: 44px;
  height: 44px;
  margin-bottom: 4px;
}

.offline-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.offline-sub {
  font-size: 12px;
}

/* --- big center button --- */
.center-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 0.5px solid rgba(255, 255, 255, 0.28);
  background: rgba(28, 28, 30, 0.55);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.center-btn:hover {
  background: rgba(48, 48, 52, 0.65);
  transform: translate(-50%, -50%) scale(1.05);
}

.center-btn svg {
  width: 40px;
  height: 40px;
}

/* --- bottom control bar --- */
.controls {
  position: absolute;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  width: min(760px, calc(100% - 48px));
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 14px;
  background: rgba(28, 28, 30, 0.72);
  backdrop-filter: blur(22px) saturate(1.4);
  -webkit-backdrop-filter: blur(22px) saturate(1.4);
  border: 0.5px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.t-btn {
  flex: none;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #fff;
  border-radius: 7px;
  cursor: pointer;
}

.t-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.t-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.t-btn:disabled:hover {
  background: transparent;
}

.t-btn svg {
  width: 19px;
  height: 19px;
}

.time {
  flex: none;
  min-width: 36px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: #fff;
}

.time.dim {
  color: rgba(255, 255, 255, 0.6);
}

/* --- seek bar --- */
.seek {
  position: relative;
  flex: 1;
  height: 22px;
  cursor: pointer;
}

.seek-track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 4px;
  transform: translateY(-50%);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.28);
  overflow: hidden;
}

.seek-fill {
  height: 100%;
  background: #fff;
  border-radius: 2px;
}

.knob {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%) scale(0.85);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  transition: transform 0.12s ease;
  pointer-events: none;
}

.seek:hover .knob,
.seek.seeking .knob {
  transform: translate(-50%, -50%) scale(1.15);
}

/* --- volume --- */
.vol {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mute-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.85);
}

.mute-btn:hover {
  color: #fff;
}

.vol-icon {
  width: 18px;
  height: 18px;
}

.vol-slider {
  width: 84px;
  height: 4px;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.28);
  outline: none;
  cursor: pointer;
}

.vol-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.vol-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 50%;
  background: #fff;
}

/* --- fade transition for overlays --- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
