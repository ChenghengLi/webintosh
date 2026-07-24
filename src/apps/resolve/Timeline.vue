<script setup>
import { computed } from 'vue'
import { useSystemStore } from '../../stores/system'
import {
  state, timelineLen, timecode, snap, clamp, selectClip, splitClip,
  removeClip, rippleDelete, playheadInside, splitAtPlayhead, addToTimeline,
} from './state'
import Icon from './Icon.vue'

const system = useSystemStore()
const HEADER = 96

const totalPx = computed(() => timelineLen.value * state.pxPerSec)
const playheadX = computed(() => state.playhead * state.pxPerSec)

const seconds = computed(() => {
  const n = Math.ceil(timelineLen.value)
  return Array.from({ length: n + 1 }, (_, i) => i)
})

// Label every N seconds so text stays readable at any zoom.
const labelStep = computed(() => {
  const p = state.pxPerSec
  return p >= 90 ? 1 : p >= 45 ? 2 : p >= 28 ? 5 : 10
})

const clipsOn = (trackId) => state.clips.filter((c) => c.trackId === trackId)
const poolById = (id) => state.pool.find((p) => p.id === id)

// Wide clips get a tail thumbnail in addition to the head one.
const isWide = (clip) => clip.duration * state.pxPerSec > 150

// Deterministic 48-bar waveform per clip, seeded from the clip id so the
// pattern is stable across re-renders.
const waveCache = new Map()
function waveBars(clip) {
  let bars = waveCache.get(clip.id)
  if (bars) return bars
  let seed = 0
  for (const ch of clip.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  let x = seed || 1
  bars = []
  for (let i = 0; i < 48; i++) {
    x = (x * 1664525 + 1013904223) >>> 0
    bars.push(18 + Math.round((x / 4294967296) * 78))
  }
  waveCache.set(clip.id, bars)
  return bars
}

const clipStyle = (c) => ({
  left: c.start * state.pxPerSec + 'px',
  width: c.duration * state.pxPerSec + 'px',
  background: c.grad,
})

/* ------------------------------ scrub ------------------------------ */

function scrubStart(e) {
  const ruler = e.currentTarget
  const set = (ev) => {
    const r = ruler.getBoundingClientRect()
    state.playhead = clamp((ev.clientX - r.left) / state.pxPerSec, 0, timelineLen.value)
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

/* --------------------------- clip pointer --------------------------- */

function dragSession(e, onMove) {
  e.preventDefault()
  const startX = e.clientX
  const move = (ev) => onMove((ev.clientX - startX) / state.pxPerSec, ev)
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function onClipDown(e, clip) {
  if (e.button === 2) return
  const track = state.tracks.find((t) => t.id === clip.trackId)

  if (state.tool === 'blade') {
    const at = playheadInside(clip)
      ? state.playhead
      : clip.start + offsetInClip(e, clip)
    splitClip(clip, at)
    return
  }
  selectClip(clip)
  if (track?.locked) return

  const origStart = clip.start
  dragSession(e, (dt) => {
    clip.start = Math.max(0, snap(origStart + dt))
  })
}

function offsetInClip(e, clip) {
  const r = e.currentTarget.getBoundingClientRect
    ? e.currentTarget.getBoundingClientRect()
    : e.target.getBoundingClientRect()
  return (e.clientX - r.left) / state.pxPerSec
}

function onEdgeDown(e, clip, side) {
  if (e.button === 2) return
  e.stopPropagation()
  const track = state.tracks.find((t) => t.id === clip.trackId)
  if (track?.locked || state.tool === 'blade') return
  selectClip(clip)

  const origStart = clip.start
  const origDur = clip.duration
  const origOffset = clip.offset
  const srcLen = poolById(clip.poolId)?.duration ?? Infinity

  dragSession(e, (dt) => {
    if (side === 'left') {
      const ns = clamp(
        snap(origStart + dt),
        Math.max(0, origStart - origOffset),
        origStart + origDur - 1,
      )
      clip.start = ns
      clip.offset = origOffset + (ns - origStart)
      clip.duration = origDur - (ns - origStart)
    } else {
      clip.duration = clamp(snap(origDur + dt), 1, Math.max(1, srcLen - origOffset))
    }
  })
}

/* ---------------------------- context menu ---------------------------- */

function clipMenu(e, clip) {
  selectClip(clip)
  system.openContextMenu(e.clientX, e.clientY, [
    {
      label: 'Split at Playhead',
      disabled: !playheadInside(clip),
      action: () => splitAtPlayhead(clip),
    },
    { separator: true },
    { label: 'Ripple Delete', action: () => rippleDelete(clip) },
    { label: 'Delete (leave gap)', action: () => removeClip(clip) },
  ])
}

/* ----------------------------- drag & drop ----------------------------- */

function onDrop(e, track) {
  const id = e.dataTransfer.getData('text/resolve-pool')
  const item = poolById(id)
  if (!item) return
  const lane = e.currentTarget.getBoundingClientRect()
  const at = snap((e.clientX - lane.left) / state.pxPerSec)
  addToTimeline(item, track.id, at)
}
</script>

<template>
  <div class="timeline" :class="{ blade: state.tool === 'blade' }">
    <!-- toolbar -->
    <div class="tl-toolbar">
      <button
        class="tool" :class="{ on: state.tool === 'select' }"
        title="Selection tool (A)" @click="state.tool = 'select'"
      >
        <Icon name="select" :size="14" />
      </button>
      <button
        class="tool" :class="{ on: state.tool === 'blade' }"
        title="Blade tool (B)" @click="state.tool = 'blade'"
      >
        <Icon name="scissors" :size="14" />
      </button>
      <span class="tl-title">Timeline 1 · UHD 30fps</span>
      <div class="zoom">
        <Icon name="zoom-out" :size="10" class="zoom-lbl" />
        <input
          type="range" min="20" max="160" step="5"
          v-model.number="state.pxPerSec" class="zoom-slider" title="Timeline zoom"
        />
        <Icon name="zoom-in" :size="13" class="zoom-lbl" />
      </div>
    </div>

    <!-- scrollable ruler + tracks -->
    <div class="tl-scroll">
      <div class="tl-inner" :style="{ width: HEADER + totalPx + 'px' }">
        <!-- ruler -->
        <div class="ruler-row">
          <div class="corner" />
          <div class="ruler" :style="{ width: totalPx + 'px' }" @pointerdown="scrubStart">
            <template v-for="s in seconds" :key="s">
              <div
                class="tick" :class="{ major: s % labelStep === 0 }"
                :style="{ left: s * state.pxPerSec + 'px' }"
              />
              <div
                v-if="s % labelStep === 0 && s < seconds.length - 1"
                class="tick-label" :style="{ left: s * state.pxPerSec + 4 + 'px' }"
              >{{ timecode(s) }}</div>
            </template>
          </div>
        </div>

        <!-- tracks -->
        <div v-for="track in state.tracks" :key="track.id" class="track-row" :class="track.kind">
          <div class="th">
            <span class="th-label">{{ track.label }}</span>
            <button
              class="th-btn" :class="{ on: track.muted }"
              :title="track.muted ? 'Unmute' : 'Mute'"
              @click="track.muted = !track.muted"
            >
              <Icon :name="track.muted ? 'speaker-x' : 'speaker'" :size="12" />
            </button>
            <button
              class="th-btn" :class="{ on: track.locked }"
              :title="track.locked ? 'Unlock' : 'Lock'"
              @click="track.locked = !track.locked"
            >
              <Icon :name="track.locked ? 'lock-closed' : 'lock-open'" :size="12" />
            </button>
          </div>
          <div
            class="lane" :class="{ locked: track.locked }"
            :style="{ width: totalPx + 'px' }"
            @pointerdown.self="selectClip(null)"
            @dragover.prevent
            @drop="onDrop($event, track)"
          >
            <div
              v-for="clip in clipsOn(track.id)"
              :key="clip.id"
              class="clip"
              :class="{
                sel: state.selectedClipId === clip.id,
                audio: clip.kind === 'audio',
                video: clip.kind === 'video',
                wide: isWide(clip),
              }"
              :style="clipStyle(clip)"
              @pointerdown="onClipDown($event, clip)"
              @contextmenu.prevent.stop="clipMenu($event, clip)"
            >
              <!-- film-strip poster thumbnails (head, and tail when wide) -->
              <template v-if="clip.kind === 'video'">
                <div class="thumb-strip" :style="{ background: clip.grad }" />
                <div v-if="isWide(clip)" class="thumb-strip tail" :style="{ background: clip.grad }" />
              </template>
              <span class="clip-name">{{ clip.name }}</span>
              <div v-if="clip.kind === 'audio'" class="wave">
                <span
                  v-for="(h, i) in waveBars(clip)" :key="i"
                  class="wbar" :style="{ height: h + '%' }"
                />
              </div>
              <div class="edge left" @pointerdown="onEdgeDown($event, clip, 'left')" />
              <div class="edge right" @pointerdown="onEdgeDown($event, clip, 'right')" />
            </div>
          </div>
        </div>

        <!-- playhead -->
        <div class="playhead" :style="{ left: HEADER + playheadX + 'px' }">
          <div class="ph-cap" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  background: var(--panel, #1e1e21);
  min-height: 0;
}
.timeline.blade .lane,
.timeline.blade .clip {
  cursor: crosshair;
}

/* toolbar */
.tl-toolbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-bottom: 1px solid var(--edge, #28282c);
}
.tool {
  background: none;
  border: 1px solid transparent;
  color: var(--dim, #8a8a90);
  font-size: 13px;
  width: 28px;
  height: 24px;
  border-radius: 5px;
  cursor: pointer;
  display: grid;
  place-items: center;
  font-family: inherit;
}
.tool:hover {
  color: var(--txt, #d8d8dc);
  background: var(--edge-2, #343439);
}
.tool.on {
  color: var(--orange, #e8862e);
  background: var(--edge-2, #343439);
  border-color: #45454c;
}
.tl-title {
  margin-left: 10px;
  font-size: 11px;
  color: var(--dim, #8a8a90);
}
.zoom {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
}
.zoom-lbl {
  color: var(--dim, #8a8a90);
  opacity: 0.8;
}
.zoom-slider {
  width: 110px;
  accent-color: var(--orange, #e8862e);
}

/* scroll region */
.tl-scroll {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.tl-inner {
  position: relative;
  min-height: 100%;
}

/* ruler */
.ruler-row {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 12;
  height: 24px;
  background: #202024;
  border-bottom: 1px solid var(--edge, #28282c);
}
.corner {
  width: 96px;
  flex: none;
  position: sticky;
  left: 0;
  background: #202024;
  border-right: 1px solid var(--edge, #28282c);
  z-index: 13;
}
.ruler {
  position: relative;
  flex: none;
  cursor: col-resize;
}
.tick {
  position: absolute;
  bottom: 0;
  width: 1px;
  height: 5px;
  background: #4a4a52;
}
.tick.major {
  height: 9px;
  background: #6a6a74;
}
.tick-label {
  position: absolute;
  top: 2px;
  font-size: 9px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  color: var(--dim, #8a8a90);
  white-space: nowrap;
  pointer-events: none;
}

/* tracks */
.track-row {
  display: flex;
  border-bottom: 1px solid var(--edge, #28282c);
}
.track-row.video .lane { height: 52px; }
.track-row.audio .lane { height: 38px; }
.th {
  width: 96px;
  flex: none;
  position: sticky;
  left: 0;
  z-index: 11;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 6px;
  background: #222226;
  border-right: 1px solid var(--edge, #28282c);
}
.th-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--txt, #d8d8dc);
  margin-right: auto;
}
.th-btn {
  background: none;
  border: none;
  color: var(--txt, #d8d8dc);
  cursor: pointer;
  opacity: 0.45;
  padding: 2px;
  border-radius: 4px;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
}
.th-btn:hover { opacity: 0.9; }
.th-btn.on {
  opacity: 1;
  background: var(--edge-2, #343439);
  color: var(--orange, #e8862e);
}
.lane {
  position: relative;
  flex: none;
  background:
    repeating-linear-gradient(90deg, transparent 0, transparent 59px, rgba(255, 255, 255, 0.025) 59px, rgba(255, 255, 255, 0.025) 60px),
    #1a1a1e;
}
.lane.locked {
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0 6px, transparent 6px 12px),
    #1a1a1e;
}

/* clips */
.clip {
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: 6px;
  overflow: hidden;
  cursor: grab;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.22), 0 1px 3px rgba(0, 0, 0, 0.4);
  touch-action: none;
}
.clip.sel {
  box-shadow: 0 0 0 2px var(--orange, #e8862e), 0 1px 5px rgba(0, 0, 0, 0.5);
  z-index: 3;
}
.clip-name {
  position: absolute;
  top: 3px;
  left: 7px;
  right: 12px;
  font-size: 10px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}
.clip.video .clip-name { left: 42px; }
.clip.video.wide .clip-name { right: 42px; }

/* film-strip poster thumbnails at the clip's head (and tail when wide) */
.thumb-strip {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 34px;
  border-right: 1px solid rgba(0, 0, 0, 0.5);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.14),
    inset 0 -14px 16px -10px rgba(0, 0, 0, 0.65),
    inset 0 10px 14px -10px rgba(255, 255, 255, 0.25);
  pointer-events: none;
}
.thumb-strip::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 3px;
  height: 4px;
  background: repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0 3px, transparent 3px 7px);
  border-radius: 1px;
}
.thumb-strip.tail {
  left: auto;
  right: 0;
  border-right: none;
  border-left: 1px solid rgba(0, 0, 0, 0.5);
}

/* detailed audio waveform */
.wave {
  position: absolute;
  left: 6px;
  right: 10px;
  bottom: 4px;
  height: 16px;
  display: flex;
  align-items: center;
  gap: 1px;
  opacity: 0.55;
  pointer-events: none;
}
.wbar {
  flex: 1 1 0;
  min-width: 1px;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 1px;
}
.edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 2;
}
.edge.left { left: 0; }
.edge.right { right: 0; }
.edge:hover {
  background: rgba(255, 255, 255, 0.28);
}

/* playhead */
.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1.5px solid #e33;
  z-index: 14;
  pointer-events: none;
}
.ph-cap {
  position: absolute;
  top: 0;
  left: -6px;
  width: 11px;
  height: 12px;
  background: #e33;
  clip-path: polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%);
}
</style>
