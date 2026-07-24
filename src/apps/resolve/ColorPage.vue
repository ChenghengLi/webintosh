<script setup>
import Icon from './Icon.vue'
import Viewer from './Viewer.vue'
import { state, resetGrade } from './state'

// Mini Color page: program viewer on top, primary wheels + sliders below.
// Wheel offsets live in state.grade and bias the viewer's CSS filter live.
const WHEELS = [
  { key: 'lift', label: 'Lift' },
  { key: 'gamma', label: 'Gamma' },
  { key: 'gain', label: 'Gain' },
]

function wheelDown(e, key) {
  e.preventDefault()
  const el = e.currentTarget
  const set = (ev) => {
    const r = el.getBoundingClientRect()
    let x = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2)
    let y = (r.top + r.height / 2 - ev.clientY) / (r.height / 2)
    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    state.grade[key].x = +x.toFixed(3)
    state.grade[key].y = +y.toFixed(3)
  }
  set(e)
  const move = (ev) => set(ev)
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

const resetWheel = (key) => {
  state.grade[key].x = 0
  state.grade[key].y = 0
}

const dotStyle = (key) => ({
  left: `${50 + state.grade[key].x * 36}%`,
  top: `${50 - state.grade[key].y * 36}%`,
})
</script>

<template>
  <div class="color-page">
    <Viewer class="color-viewer" />

    <div class="color-panel">
      <div class="wheels">
        <div v-for="w in WHEELS" :key="w.key" class="wheel-col">
          <div
            class="wheel"
            :title="`${w.label} wheel — drag to grade, double-click to reset`"
            @pointerdown="wheelDown($event, w.key)"
            @dblclick="resetWheel(w.key)"
          >
            <div class="cross h" />
            <div class="cross v" />
            <div class="dot" :style="dotStyle(w.key)" />
          </div>
          <span class="wheel-lbl">{{ w.label }}</span>
        </div>
      </div>

      <div class="primaries">
        <div class="p-row">
          <label>Saturation</label>
          <input type="range" min="0" max="2" step="0.01" v-model.number="state.grade.saturation" />
          <span class="p-val">{{ state.grade.saturation.toFixed(2) }}</span>
        </div>
        <div class="p-row">
          <label>Exposure</label>
          <input type="range" min="-1" max="1" step="0.01" v-model.number="state.grade.exposure" />
          <span class="p-val">{{ state.grade.exposure.toFixed(2) }}</span>
        </div>
        <div class="p-row">
          <label>Contrast</label>
          <input type="range" min="0.4" max="2" step="0.01" v-model.number="state.grade.contrast" />
          <span class="p-val">{{ state.grade.contrast.toFixed(2) }}</span>
        </div>
        <button class="reset-btn" @click="resetGrade">
          <Icon name="loop" :size="11" />
          <span>Reset Grade</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel, #1e1e21);
}
.color-viewer {
  flex: 1;
  min-height: 0;
}
.color-panel {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 56px;
  padding: 12px 18px;
  background: var(--panel, #1e1e21);
  border-top: 1px solid var(--edge, #28282c);
}

/* color wheels */
.wheels {
  display: flex;
  gap: 30px;
}
.wheel-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.wheel {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(18, 18, 20, 0.95) 0%, rgba(18, 18, 20, 0.55) 42%, rgba(18, 18, 20, 0.1) 78%),
    conic-gradient(from 90deg, #ff3b30, #ffcc00, #4cd964, #5ac8fa, #5856d6, #ff2d55, #ff3b30);
  box-shadow: inset 0 0 0 1.5px #3a3a40, 0 2px 8px rgba(0, 0, 0, 0.45);
  cursor: crosshair;
  touch-action: none;
}
.cross {
  position: absolute;
  background: rgba(255, 255, 255, 0.14);
  pointer-events: none;
}
.cross.h {
  left: 12%;
  right: 12%;
  top: 50%;
  height: 1px;
}
.cross.v {
  top: 12%;
  bottom: 12%;
  left: 50%;
  width: 1px;
}
.dot {
  position: absolute;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ececf0;
  border: 1.5px solid #17171a;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
.wheel-lbl {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dim, #8a8a90);
}

/* primary sliders */
.primaries {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.p-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.p-row label {
  width: 72px;
  flex: none;
  font-size: 11px;
  color: var(--dim, #8a8a90);
}
.p-row input[type='range'] {
  flex: 1;
  min-width: 0;
  accent-color: var(--orange, #e8862e);
  height: 14px;
}
.p-val {
  width: 34px;
  flex: none;
  text-align: right;
  font-size: 10px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  color: var(--txt, #d8d8dc);
}
.reset-btn {
  align-self: flex-end;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  background: var(--edge-2, #343439);
  color: var(--txt, #d8d8dc);
  border: 1px solid #45454c;
  border-radius: 5px;
  font-size: 11px;
  padding: 4px 10px;
  cursor: pointer;
  font-family: inherit;
}
.reset-btn:hover {
  background: var(--orange, #e8862e);
  color: #17130c;
  border-color: transparent;
}
</style>
