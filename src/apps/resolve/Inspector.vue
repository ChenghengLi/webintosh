<script setup>
import { computed } from 'vue'
import { state, selectedClip, timecode, contentEnd } from './state'
import Icon from './Icon.vue'

// Two-way proxy for a numeric field on the selected clip.
function numField(key, min, max) {
  return computed({
    get: () => selectedClip.value?.[key] ?? 0,
    set: (v) => {
      const c = selectedClip.value
      if (!c) return
      let n = parseFloat(v)
      if (Number.isNaN(n)) n = 0
      c[key] = Math.min(max, Math.max(min, n))
    },
  })
}

const name = computed({
  get: () => selectedClip.value?.name ?? '',
  set: (v) => { if (selectedClip.value) selectedClip.value.name = v },
})
const duration = numField('duration', 1, 600)
const tx = numField('tx', -300, 300)
const ty = numField('ty', -200, 200)
const zoom = numField('zoom', 0.25, 4)
const opacity = numField('opacity', 0, 1)

const clipCount = computed(() => state.clips.length)
</script>

<template>
  <div class="inspector">
    <div class="pane-header"><span>Inspector</span></div>

    <div v-if="selectedClip" class="insp-body">
      <div class="clip-card">
        <div class="card-thumb" :style="{ background: selectedClip.grad }">
          <Icon :name="selectedClip.icon || 'film'" :size="14" />
        </div>
        <input v-model="name" class="name-input" spellcheck="false" />
      </div>

      <div class="group">
        <div class="group-title">Clip</div>
        <div class="row">
          <label>Duration</label>
          <input type="number" v-model.number="duration" min="1" step="0.5" class="num" />
          <span class="unit">s</span>
        </div>
        <div class="row">
          <label>Start</label>
          <span class="ro">{{ selectedClip.start.toFixed(1) }}s</span>
        </div>
        <div class="row">
          <label>Track</label>
          <span class="ro">{{ selectedClip.trackId.toUpperCase() }}</span>
        </div>
      </div>

      <div class="group" v-if="selectedClip.kind === 'video'">
        <div class="group-title">Transform</div>
        <div class="row">
          <label>X</label>
          <input type="range" v-model.number="tx" min="-300" max="300" step="1" class="slider" />
          <input type="number" v-model.number="tx" class="num" />
        </div>
        <div class="row">
          <label>Y</label>
          <input type="range" v-model.number="ty" min="-200" max="200" step="1" class="slider" />
          <input type="number" v-model.number="ty" class="num" />
        </div>
        <div class="row">
          <label>Zoom</label>
          <input type="range" v-model.number="zoom" min="0.25" max="4" step="0.01" class="slider" />
          <input type="number" v-model.number="zoom" step="0.05" class="num" />
        </div>
        <div class="row">
          <label>Opacity</label>
          <input type="range" v-model.number="opacity" min="0" max="1" step="0.01" class="slider" />
          <input type="number" v-model.number="opacity" step="0.05" class="num" />
        </div>
      </div>
    </div>

    <div v-else class="insp-body empty">
      <div class="group">
        <div class="group-title">Timeline</div>
        <div class="row"><label>Clips</label><span class="ro">{{ clipCount }}</span></div>
        <div class="row"><label>Length</label><span class="ro">{{ timecode(contentEnd) }}</span></div>
        <div class="row"><label>Frame rate</label><span class="ro">30 fps</span></div>
        <div class="row"><label>Resolution</label><span class="ro">3840×2160 UHD</span></div>
      </div>
      <p class="hint">Select a clip on the timeline to edit its properties.</p>
    </div>
  </div>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  background: var(--panel, #1e1e21);
  min-height: 0;
}
.pane-header {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dim, #8a8a90);
  border-bottom: 1px solid var(--edge, #28282c);
  flex: none;
}
.insp-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.clip-card {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-thumb {
  width: 46px;
  height: 28px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  color: #fff;
  flex: none;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.18);
}
.name-input {
  flex: 1;
  min-width: 0;
  background: #17171a;
  border: 1px solid var(--edge-2, #343439);
  border-radius: 6px;
  color: var(--txt, #d8d8dc);
  font-size: 12px;
  padding: 5px 8px;
  font-family: inherit;
  outline: none;
}
.name-input:focus {
  border-color: var(--orange, #e8862e);
}
.group {
  background: #1a1a1d;
  border: 1px solid var(--edge, #28282c);
  border-radius: 8px;
  padding: 8px 10px;
}
.group-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--orange, #e8862e);
  margin-bottom: 8px;
}
.row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 7px;
}
.row:last-child {
  margin-bottom: 0;
}
.row label {
  width: 52px;
  flex: none;
  font-size: 11px;
  color: var(--dim, #8a8a90);
  white-space: nowrap;
}
.slider {
  flex: 1;
  min-width: 0;
  accent-color: var(--orange, #e8862e);
  height: 14px;
}
.num {
  width: 56px;
  flex: none;
  background: #17171a;
  border: 1px solid var(--edge-2, #343439);
  border-radius: 5px;
  color: var(--txt, #d8d8dc);
  font-size: 11px;
  padding: 2px 5px;
  font-family: inherit;
  outline: none;
}
.num:focus {
  border-color: var(--orange, #e8862e);
}
.unit {
  font-size: 10px;
  color: var(--dim, #8a8a90);
}
.ro {
  font-size: 11px;
  color: var(--txt, #d8d8dc);
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}
.empty .hint {
  font-size: 11px;
  color: #6a6a72;
  text-align: center;
}
</style>
