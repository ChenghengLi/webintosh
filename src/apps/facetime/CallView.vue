<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { SELF, initials, formatDuration } from './data.js'

const props = defineProps({
  contact: { type: Object, required: true },
})
const emit = defineEmits(['end'])

const phase = ref('ringing') // 'ringing' | 'incall'
const elapsed = ref(0)
const muted = ref(false)
const videoOn = ref(true)
const flipped = ref(false)
const sharing = ref(false)
const speaking = ref(false)

const stageEl = ref(null)

let timers = []
function clearAll() {
  timers.forEach((t) => {
    clearTimeout(t)
    clearInterval(t)
  })
  timers = []
}

onMounted(() => {
  nextTick(placePip)
  timers.push(
    setTimeout(
      () => {
        phase.value = 'incall'
        timers.push(setInterval(() => (elapsed.value += 1), 1000))
        // simulate the callee talking in bursts
        timers.push(setInterval(() => (speaking.value = Math.random() > 0.42), 1300))
      },
      1600 + Math.random() * 800
    )
  )
})

onBeforeUnmount(() => {
  clearAll()
  removeDragListeners()
})

function cancelRing() {
  emit('end', { duration: 0, cancelled: true })
}

function hangUp() {
  emit('end', { duration: elapsed.value, cancelled: false })
}

/* ---- draggable self-view PiP ---- */
const PIP_W = 150
const PIP_H = 200
const MARGIN = 10

const pip = reactive({ x: 600, y: 300 })
const pipStyle = computed(() => ({ left: `${pip.x}px`, top: `${pip.y}px` }))

function placePip() {
  const s = stageEl.value
  if (!s) return
  pip.x = Math.max(MARGIN, s.clientWidth - PIP_W - 22)
  pip.y = Math.max(MARGIN, s.clientHeight - PIP_H - 96)
}

let drag = null
function pipDown(e) {
  drag = { px: e.clientX, py: e.clientY, x: pip.x, y: pip.y }
  window.addEventListener('pointermove', pipMove)
  window.addEventListener('pointerup', pipUp)
}
function pipMove(e) {
  if (!drag) return
  const s = stageEl.value
  const w = s ? s.clientWidth : 940
  const h = s ? s.clientHeight : 620
  pip.x = Math.min(Math.max(drag.x + e.clientX - drag.px, MARGIN), Math.max(MARGIN, w - PIP_W - MARGIN))
  pip.y = Math.min(Math.max(drag.y + e.clientY - drag.py, MARGIN), Math.max(MARGIN, h - PIP_H - MARGIN))
}
function pipUp() {
  drag = null
  removeDragListeners()
}
function removeDragListeners() {
  window.removeEventListener('pointermove', pipMove)
  window.removeEventListener('pointerup', pipUp)
}
</script>

<template>
  <div class="call" ref="stageEl">
    <!-- participant grid: the callee as a large tile -->
    <div v-if="phase === 'incall'" class="tiles">
      <div class="remote" :class="{ speaking }">
        <div class="bgfx" :style="{ background: props.contact.bg }"></div>
        <span class="avatar-xl">{{ initials(props.contact.name) }}</span>
        <span class="rname">{{ props.contact.name }}</span>
      </div>
    </div>

    <!-- ringing state -->
    <div v-else class="ring">
      <div class="ringav" :style="{ background: props.contact.bg }">{{ initials(props.contact.name) }}</div>
      <h1>{{ props.contact.name }}</h1>
      <div class="status">ringing…</div>
      <button class="cancel" @click="cancelRing">
        <span class="circ">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
            />
          </svg>
        </span>
        <small>Cancel</small>
      </button>
    </div>

    <template v-if="phase === 'incall'">
      <div class="topbar">
        <span class="pill">{{ props.contact.name }}</span>
        <span class="pill timer">{{ formatDuration(elapsed) }}</span>
        <span v-if="sharing" class="pill share">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <path d="M9 21h6" />
          </svg>
          Sharing screen
        </span>
      </div>

      <!-- self-view picture-in-picture (draggable) -->
      <div class="pip" :class="{ off: !videoOn }" :style="pipStyle" @pointerdown.prevent="pipDown">
        <div class="self" :style="{ background: SELF.bg }">
          <span class="self-initials" :class="{ flipped }">{{ initials(SELF.name) }}</span>
        </div>
        <span v-if="!videoOn" class="camoff">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="6" width="13" height="12" rx="2.5" />
            <path d="m15 10.5 6-3.5v10l-6-3.5" />
            <line x1="3" y1="3" x2="21" y2="21" />
          </svg>
        </span>
        <span class="pip-name">You</span>
      </div>

      <!-- control bar -->
      <div class="controls">
        <button
          class="ctl"
          :class="{ active: muted }"
          :title="muted ? 'Unmute' : 'Mute'"
          @click="muted = !muted"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <path d="M12 17v4" />
            <path d="M8.5 21h7" />
            <line v-if="muted" x1="4" y1="3" x2="20" y2="21" />
          </svg>
        </button>

        <button
          class="ctl"
          :class="{ active: !videoOn }"
          :title="videoOn ? 'Turn video off' : 'Turn video on'"
          @click="videoOn = !videoOn"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="6" width="13" height="12" rx="2.5" />
            <path d="m15 10.5 6-3.5v10l-6-3.5" />
            <line v-if="!videoOn" x1="3" y1="3" x2="21" y2="21" />
          </svg>
        </button>

        <button class="ctl" title="Flip camera" @click="flipped = !flipped">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>

        <button
          class="ctl"
          :class="{ active: sharing }"
          :title="sharing ? 'Stop sharing screen' : 'Share screen'"
          @click="sharing = !sharing"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="13" rx="2" />
            <path d="M12 8v5" />
            <path d="m9.5 10 2.5-2.5L14.5 10" />
            <path d="M8 21h8" />
          </svg>
        </button>

        <button class="ctl end" title="End" @click="hangUp">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
            />
          </svg>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The in-call UI of the real FaceTime is a fixed dark surface, so this
   view intentionally uses fixed colors instead of the theme variables. */
.call {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #0c0c10;
  color: #fff;
}
.call button {
  font: inherit;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

/* ---- participant grid ---- */
.tiles {
  position: absolute;
  inset: 0;
  padding: 12px;
  display: grid;
}
.remote {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: #1c1c22;
}
.bgfx {
  position: absolute;
  inset: 0;
  filter: saturate(1.1) brightness(0.8);
}
.remote .avatar-xl {
  position: relative;
  width: 208px;
  height: 208px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 80px;
  font-weight: 600;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.35), 0 10px 24px rgba(0, 0, 0, 0.35);
  animation: float 4.5s ease-in-out infinite;
}
.rname {
  position: absolute;
  left: 16px;
  bottom: 14px;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
}
.remote::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  pointer-events: none;
  box-shadow: inset 0 0 0 0 rgba(48, 209, 88, 0);
}
.remote.speaking::after {
  animation: speak 1.4s ease-in-out infinite;
}

/* ---- top bar ---- */
.topbar {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 5;
}
.pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: rgba(28, 28, 32, 0.55);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 0.5px solid rgba(255, 255, 255, 0.14);
}
.pill.share {
  background: rgba(36, 122, 66, 0.55);
}
.pill svg {
  width: 14px;
  height: 14px;
}

/* ---- self-view PiP ---- */
.pip {
  position: absolute;
  width: 150px;
  height: 200px;
  border-radius: 16px;
  overflow: hidden;
  z-index: 7;
  cursor: grab;
  touch-action: none;
  user-select: none;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.18);
}
.pip:active {
  cursor: grabbing;
}
.self {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.self-initials {
  display: inline-block;
  font-size: 42px;
  font-weight: 600;
  color: #fff;
  transition: transform 0.35s ease, opacity 0.25s;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
}
.self-initials.flipped {
  transform: scaleX(-1);
}
.pip.off .self-initials {
  opacity: 0.08;
}
.camoff {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.9);
}
.camoff svg {
  width: 30px;
  height: 30px;
}
.pip-name {
  position: absolute;
  left: 10px;
  bottom: 8px;
  z-index: 2;
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

/* ---- control bar ---- */
.controls {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 999px;
  z-index: 6;
  background: rgba(28, 28, 32, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 0.5px solid rgba(255, 255, 255, 0.14);
}
.ctl {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(68, 68, 74, 0.75);
  transition: background 0.15s, transform 0.1s;
}
.ctl:hover {
  background: rgba(90, 90, 98, 0.85);
}
.ctl:active {
  transform: scale(0.94);
}
.ctl svg {
  width: 24px;
  height: 24px;
}
.ctl.active {
  background: #fff;
  color: #111;
}
.ctl.end {
  background: #ff3b30;
}
.ctl.end:hover {
  background: #ff5147;
}
.ctl.end svg {
  transform: rotate(135deg);
}

/* ---- ringing ---- */
.ring {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.ringav {
  position: relative;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 46px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}
.ringav::before,
.ringav::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  animation: ripple 2s ease-out infinite;
}
.ringav::after {
  animation-delay: 1s;
}
.ring h1 {
  font-size: 26px;
  font-weight: 700;
}
.status {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
}
.cancel {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #fff;
}
.cancel .circ {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #ff3b30;
  transition: transform 0.1s, background 0.15s;
}
.cancel:hover .circ {
  background: #ff5147;
}
.cancel:active .circ {
  transform: scale(0.94);
}
.cancel svg {
  width: 28px;
  height: 28px;
  transform: rotate(135deg);
}
.cancel small {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

/* ---- animations ---- */
@keyframes speak {
  0%,
  100% {
    box-shadow: inset 0 0 0 3px rgba(48, 209, 88, 0.9);
  }
  50% {
    box-shadow: inset 0 0 0 7px rgba(48, 209, 88, 0.45);
  }
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}
</style>
