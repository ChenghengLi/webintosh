<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'

const CHIPS = [1, 5, 10, 20] // quick-start minutes

const phase = ref('idle')       // 'idle' | 'running' | 'paused' | 'done'
const totalMs = ref(0)
const remaining = ref(0)
const customMin = ref('')

let endAt = 0
let iv = null

function startTimer(minutes) {
  const ms = Math.round(minutes * 60000)
  if (!isFinite(ms) || ms <= 0) return
  clearInterval(iv)
  totalMs.value = ms
  remaining.value = ms
  endAt = performance.now() + ms
  phase.value = 'running'
  iv = setInterval(tick, 100)
}

function tick() {
  const left = endAt - performance.now()
  if (left <= 0) {
    remaining.value = 0
    finish()
  } else {
    remaining.value = left
  }
}

function pauseResume() {
  if (phase.value === 'running') {
    clearInterval(iv)
    phase.value = 'paused'
  } else if (phase.value === 'paused') {
    endAt = performance.now() + remaining.value
    iv = setInterval(tick, 100)
    phase.value = 'running'
  }
}

function cancel() {
  clearInterval(iv)
  phase.value = 'idle'
}

function finish() {
  clearInterval(iv)
  phase.value = 'done'
  chime()
}

function stopDone() {
  phase.value = 'idle'
}

onBeforeUnmount(() => clearInterval(iv))

const customValid = computed(() => {
  const v = parseFloat(customMin.value)
  return isFinite(v) && v > 0 && v <= 999
})

function startCustom() {
  if (customValid.value) startTimer(parseFloat(customMin.value))
}

// Remaining time as mm:ss, or h:mm:ss once the countdown has hours.
const remainingText = computed(() => {
  const total = Math.ceil(remaining.value / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor(total / 60) % 60
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${ss}`
    : `${String(m).padStart(2, '0')}:${ss}`
})

// "Ends at 9:41 PM" hint under the ring digits.
const endsAtText = computed(() => {
  const end = new Date(Date.now() + remaining.value)
  return 'Ends at ' + new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(end)
})

// Depleting ring geometry.
const R = 118
const CIRC = 2 * Math.PI * R
const ringOffset = computed(() => (
  CIRC * (1 - (totalMs.value ? remaining.value / totalMs.value : 0))
))

// Three short sine beeps via WebAudio (no assets, no network).
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    let t = ctx.currentTime + 0.05
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.36)
      t += 0.48
    }
    setTimeout(() => ctx.close(), 2500)
  } catch (e) { /* audio unavailable — visual state still shows */ }
}
</script>

<template>
  <div class="timers">
    <!-- Setup: quick chips + custom minutes -->
    <div v-if="phase === 'idle'" class="setup">
      <div class="chips">
        <button v-for="m in CHIPS" :key="m" class="chip" @click="startTimer(m)">
          <span class="chip-num">{{ m }}</span>
          <span class="chip-unit">min</span>
        </button>
      </div>
      <div class="custom">
        <input
          v-model="customMin"
          type="number"
          min="1"
          max="999"
          placeholder="Minutes"
          @keydown.enter="startCustom"
        />
        <button class="start" :disabled="!customValid" @click="startCustom">Start Timer</button>
      </div>
    </div>

    <!-- Countdown: depleting ring + remaining time -->
    <div v-else-if="phase === 'running' || phase === 'paused'" class="countdown">
      <div class="ringwrap">
        <svg class="ring" viewBox="0 0 260 260">
          <circle class="track" cx="130" cy="130" :r="R" />
          <circle
            class="prog" cx="130" cy="130" :r="R"
            :stroke-dasharray="CIRC" :stroke-dashoffset="ringOffset"
            transform="rotate(-90 130 130)"
          />
        </svg>
        <div class="left">
          <div class="digits">{{ remainingText }}</div>
          <div class="state">{{ phase === 'paused' ? 'Paused' : endsAtText }}</div>
        </div>
      </div>
      <div class="controls">
        <button class="btn gray" @click="cancel">Cancel</button>
        <button class="btn orange" @click="pauseResume">{{ phase === 'paused' ? 'Resume' : 'Pause' }}</button>
      </div>
    </div>

    <!-- Finished -->
    <div v-else class="done">
      <svg class="bell" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      <div class="done-text">Timer Done</div>
      <button class="btn orange big" @click="stopDone">Stop</button>
    </div>
  </div>
</template>

<style scoped>
.timers {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ---- Setup ------------------------------------------------------------- */
.setup {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 34px;
  padding: 24px;
}

.chips {
  display: flex;
  gap: 18px;
}

.chip {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: none;
  background: rgba(120, 120, 128, 0.2);
  color: var(--text);
  font-family: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  cursor: default;
  transition: background 0.12s ease;
}

.chip:hover { background: rgba(120, 120, 128, 0.3); }
.chip:active { background: rgba(120, 120, 128, 0.4); }

.chip-num { font-size: 24px; font-weight: 500; line-height: 1; }
.chip-unit { font-size: 11px; color: var(--text-dim); }

.custom {
  display: flex;
  gap: 10px;
  align-items: center;
}

.custom input {
  width: 130px;
  height: 36px;
  border-radius: 8px;
  border: 0.5px solid var(--border);
  background: rgba(120, 120, 128, 0.12);
  color: var(--text);
  font-family: inherit;
  font-size: 14px;
  padding: 0 12px;
  outline: none;
  font-variant-numeric: tabular-nums;
}

.custom input:focus { border-color: #ff9f0a; }

.start {
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: #ff9f0a;
  color: #1c1c1e;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: default;
  transition: filter 0.12s ease, opacity 0.15s ease;
}

.start:hover { filter: brightness(1.1); }
.start:disabled { opacity: 0.35; }

/* ---- Countdown --------------------------------------------------------- */
.countdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
  padding: 24px;
}

.ringwrap { position: relative; width: 260px; height: 260px; }

.ring { width: 100%; height: 100%; }

.ring .track {
  fill: none;
  stroke: rgba(120, 120, 128, 0.25);
  stroke-width: 10;
}

.ring .prog {
  fill: none;
  stroke: #ff9f0a;
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
}

.left {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.digits {
  font-size: 48px;
  font-weight: 300;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.state {
  font-size: 13px;
  color: var(--text-dim);
}

.controls {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 400px;
}

.btn {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  border: none;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: default;
  transition: filter 0.12s ease;
}

.btn:hover { filter: brightness(1.08); }
.btn:active { filter: brightness(1.2); }

.btn.gray { background: rgba(120, 120, 128, 0.22); color: var(--text); }
.btn.orange { background: rgba(255, 159, 10, 0.18); color: #ff9f0a; }

/* ---- Done --------------------------------------------------------------- */
.done {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 24px;
}

.bell {
  width: 72px;
  height: 72px;
  color: #ff9f0a;
  animation: ring 1s ease-in-out infinite;
  transform-origin: top center;
}

@keyframes ring {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(12deg); }
  40% { transform: rotate(-10deg); }
  60% { transform: rotate(7deg); }
  80% { transform: rotate(-5deg); }
}

.done-text {
  font-size: 34px;
  font-weight: 300;
  color: var(--text);
}

.btn.big {
  width: auto;
  height: auto;
  border-radius: 999px;
  padding: 10px 34px;
  font-size: 16px;
}
</style>
