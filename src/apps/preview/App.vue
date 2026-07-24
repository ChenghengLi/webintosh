<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useWindowsStore } from '../../stores/windows'
import { PHOTOS, MARKUP_COLORS } from './photos'

const photos = PHOTOS
const windows = useWindowsStore()
const winId = inject('windowId', null)

// Real photos at natural size for the stage; small squares for the filmstrip.
const photoUrl = (p) => `https://picsum.photos/seed/${p.seed}/${p.w}/${p.h}`
const thumbUrl = (p) => `https://picsum.photos/seed/${p.seed}/200/200`

// A failed load (offline) hides the <img> so the gradient fallback shows through.
function onImgError(e) {
  e.target.classList.add('img-failed')
}

// ---------- Selection ----------
const saved = Number(localStorage.getItem('macos-web:preview-index'))
const selectedIndex = ref(saved >= 0 && saved < photos.length ? saved : 0)
const selected = computed(() => photos[selectedIndex.value])

function select(i) {
  selectedIndex.value = i
  rotation.value = 0
  localStorage.setItem('macos-web:preview-index', String(i))
}
function next() {
  select((selectedIndex.value + 1) % photos.length)
}
function prev() {
  select((selectedIndex.value + photos.length - 1) % photos.length)
}

// ---------- Sidebar ----------
const sidebarOpen = ref(true)

// ---------- Zoom / rotate ----------
const stage = ref(null)
const stageSize = ref({ w: 0, h: 0 })
const zoomMode = ref('fit') // 'fit' | 'actual' | 'custom'
const customZoom = ref(1)
const rotation = ref(0) // 0 / 90 / 180 / 270, counterclockwise

const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4]

// Displayed size once the 90° steps swap the axes.
const dispSize = computed(() => {
  const p = selected.value
  return rotation.value % 180 === 0 ? { w: p.w, h: p.h } : { w: p.h, h: p.w }
})

const fitScale = computed(() => {
  const { w, h } = stageSize.value
  if (!w || !h) return 1
  return Math.min((w - 72) / dispSize.value.w, (h - 72) / dispSize.value.h)
})

const scale = computed(() => {
  if (zoomMode.value === 'fit') return Math.max(0.05, fitScale.value)
  if (zoomMode.value === 'actual') return 1
  return customZoom.value
})

// Fit reports the fitted size vs natural size: a photo that already fits the
// stage is not enlarged by the readout, so the ratio caps at 100%.
const zoomLabel = computed(() => {
  if (zoomMode.value === 'actual') return '100%'
  if (zoomMode.value === 'fit') {
    const fittedW = Math.min(dispSize.value.w, dispSize.value.w * fitScale.value)
    return `${Math.round((fittedW / dispSize.value.w) * 100)}%`
  }
  return `${Math.round(scale.value * 100)}%`
})

function zoomIn() {
  const s = scale.value
  customZoom.value = ZOOM_STEPS.find((v) => v > s + 0.005) ?? 4
  zoomMode.value = 'custom'
}
function zoomOut() {
  const s = scale.value
  customZoom.value = [...ZOOM_STEPS].reverse().find((v) => v < s - 0.005) ?? 0.25
  zoomMode.value = 'custom'
}
function rotateLeft() {
  rotation.value = (rotation.value + 270) % 360
}

const wrapStyle = computed(() => ({
  width: `${Math.ceil(dispSize.value.w * scale.value)}px`,
  height: `${Math.ceil(dispSize.value.h * scale.value)}px`,
}))
const cardStyle = computed(() => ({
  width: `${selected.value.w}px`,
  height: `${selected.value.h}px`,
  background: selected.value.gradient,
  transform: `translate(-50%, -50%) rotate(${rotation.value}deg) scale(${scale.value})`,
}))

// ---------- Markup ----------
const markupOn = ref(false)
const penColor = ref(MARKUP_COLORS[4])
const drawCanvas = ref(null)
const strokes = ref({}) // photoId -> [{ color, width, points }]
let drawing = false
let currentStroke = null

function currentStrokes() {
  return strokes.value[selected.value.id] || []
}

// Map a pointer event into canvas pixels, undoing the CSS rotate + scale
// applied to the card (the canvas lives inside the transformed card).
function toCanvasPoint(e) {
  const c = drawCanvas.value
  const rect = c.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = e.clientX - cx
  const dy = e.clientY - cy
  const rad = (-rotation.value * Math.PI) / 180
  const rx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const ry = dx * Math.sin(rad) + dy * Math.cos(rad)
  return { x: rx / scale.value + c.width / 2, y: ry / scale.value + c.height / 2 }
}

function drawStroke(ctx, s) {
  const pts = s.points
  if (!pts.length) return
  ctx.strokeStyle = s.color
  ctx.lineWidth = s.width
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  if (pts.length < 3) {
    const p = pts[pts.length - 1]
    ctx.lineTo(p.x + 0.01, p.y + 0.01)
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2
      const my = (pts[i].y + pts[i + 1].y) / 2
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
  }
  ctx.stroke()
}

function redraw() {
  const c = drawCanvas.value
  if (!c) return
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of currentStrokes()) drawStroke(ctx, s)
}

function onPointerDown(e) {
  if (!markupOn.value) return
  e.preventDefault()
  drawCanvas.value.setPointerCapture(e.pointerId)
  drawing = true
  currentStroke = { color: penColor.value, width: 5, points: [toCanvasPoint(e)] }
}

function onPointerMove(e) {
  if (!drawing || !currentStroke) return
  const pts = currentStroke.points
  pts.push(toCanvasPoint(e))
  const ctx = drawCanvas.value.getContext('2d')
  ctx.strokeStyle = currentStroke.color
  ctx.lineWidth = currentStroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const n = pts.length
  ctx.beginPath()
  if (n < 3) {
    const a = pts[n - 2] || pts[0]
    const b = pts[n - 1]
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x + 0.01, b.y + 0.01)
  } else {
    const a = pts[n - 3]
    const b = pts[n - 2]
    const c = pts[n - 1]
    ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2)
    ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2)
  }
  ctx.stroke()
}

function onPointerUp() {
  if (!drawing) return
  drawing = false
  const id = selected.value.id
  if (!strokes.value[id]) strokes.value[id] = []
  strokes.value[id].push(currentStroke)
  currentStroke = null
  redraw() // re-render the finished stroke with full smoothing
}

function clearMarkup() {
  strokes.value[selected.value.id] = []
  redraw()
}

// ---------- Keyboard filmstrip nav ----------
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')) return
  if (windows.activeWindow?.id !== winId) return
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prev()
  }
}

// ---------- Lifecycle ----------
let resizeObs = null
onMounted(() => {
  window.addEventListener('keydown', onKey)
  resizeObs = new ResizeObserver((entries) => {
    const r = entries[0].contentRect
    stageSize.value = { w: r.width, h: r.height }
  })
  if (stage.value) resizeObs.observe(stage.value)
  redraw()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  resizeObs?.disconnect()
})

// Changing the photo swaps the canvas pixel size, which clears it.
watch(selectedIndex, async () => {
  await nextTick()
  redraw()
})
</script>

<template>
  <div class="app-root preview-root">
    <!-- Toolbar -->
    <header class="toolbar glass">
      <button class="tbtn" :class="{ on: sidebarOpen }" title="Toggle Sidebar" @click="sidebarOpen = !sidebarOpen">
        <svg viewBox="0 0 16 16" class="icon">
          <rect x="1.4" y="2.6" width="13.2" height="10.8" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.2" />
          <line x1="5.8" y1="2.6" x2="5.8" y2="13.4" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
      <div class="doc">
        <div class="doc-name">{{ selected.name }}</div>
        <div class="doc-meta">{{ selected.dims }} pixels · {{ selected.size }}</div>
      </div>
      <div class="spacer" />
      <button class="tbtn" :class="{ on: markupOn }" title="Markup" @click="markupOn = !markupOn">
        <svg viewBox="0 0 16 16" class="icon">
          <path d="M11.8 1.6a1.55 1.55 0 0 1 2.2 2.2l-7.3 7.3-2.9.7.7-2.9 7.3-7.3z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
          <path d="M4.2 12.6c.5 1.1-.4 2.3-2.1 2.3.3-.7.2-1.6.7-2.5" fill="currentColor" />
        </svg>
      </button>
      <button class="tbtn rot" title="Rotate Left" @click="rotateLeft">↺</button>
      <div class="sep" />
      <button class="tbtn" title="Zoom Out" @click="zoomOut">
        <svg viewBox="0 0 16 16" class="icon">
          <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
      <span class="zoom-label">{{ zoomLabel }}</span>
      <button class="tbtn" title="Zoom In" @click="zoomIn">
        <svg viewBox="0 0 16 16" class="icon">
          <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
      <div class="sep" />
      <button class="tbtn text" :class="{ on: zoomMode === 'actual' }" title="Actual Size" @click="zoomMode = 'actual'">Actual Size</button>
      <button class="tbtn text" :class="{ on: zoomMode === 'fit' }" title="Zoom to Fit" @click="zoomMode = 'fit'">Fit</button>
    </header>

    <!-- Markup bar -->
    <div v-if="markupOn" class="markup-bar">
      <span class="mb-label">Markup</span>
      <div class="swatches">
        <button
          v-for="c in MARKUP_COLORS"
          :key="c"
          class="swatch"
          :class="{ on: penColor === c }"
          :style="{ background: c }"
          :title="c"
          @click="penColor = c"
        />
      </div>
      <div class="spacer" />
      <button class="tbtn text" @click="clearMarkup">Clear</button>
      <button class="tbtn text done" @click="markupOn = false">Done</button>
    </div>

    <div class="body">
      <!-- Thumbnail sidebar -->
      <aside v-show="sidebarOpen" class="sidebar">
        <button
          v-for="(p, i) in photos"
          :key="p.id"
          class="thumb"
          :class="{ on: i === selectedIndex }"
          @click="select(i)"
        >
          <span class="thumb-img" :style="{ background: p.gradient }">
            <img class="thumb-photo" :src="thumbUrl(p)" :alt="p.name" loading="lazy" @error="onImgError" />
          </span>
          <span class="thumb-name">
            {{ p.name }}
            <span v-if="strokes[p.id]?.length" class="thumb-badge" title="Has markup">✎</span>
          </span>
        </button>
      </aside>

      <!-- Canvas area -->
      <div ref="stage" class="stage">
        <div class="canvas-wrap" :style="wrapStyle">
          <div class="photo-card" :style="cardStyle">
            <img class="photo" :src="photoUrl(selected)" :alt="selected.name" draggable="false" @error="onImgError" />
            <canvas
              ref="drawCanvas"
              class="draw"
              :class="{ marking: markupOn }"
              :width="selected.w"
              :height="selected.h"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-root {
  background: var(--window-bg);
  color: var(--text);
  overflow: hidden;
}

/* ---------- Toolbar ---------- */
.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;
}
.tbtn {
  height: 28px;
  min-width: 28px;
  padding: 0 5px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  font-size: 12px;
}
.tbtn:hover { background: var(--hover); }
.tbtn.on { background: var(--selection); }
.tbtn.text { padding: 0 10px; font-weight: 500; }
.tbtn.rot { font-size: 17px; padding-bottom: 2px; }
.icon { width: 15px; height: 15px; }
.sep {
  width: 0.5px;
  height: 18px;
  background: var(--border);
  margin: 0 3px;
}
.spacer { flex: 1; }
.doc {
  margin-left: 6px;
  line-height: 1.25;
  min-width: 0;
}
.doc-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.doc-meta { font-size: 11px; color: var(--text-dim); }
.zoom-label {
  min-width: 46px;
  text-align: center;
  font-size: 12px;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
  user-select: none;
}

/* ---------- Markup bar ---------- */
.markup-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-bottom: 0.5px solid var(--border);
  background: var(--titlebar-bg);
  flex-shrink: 0;
}
.mb-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.swatches { display: flex; gap: 7px; align-items: center; }
.swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 0.5px solid rgba(0, 0, 0, 0.3);
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.25);
}
.swatch.on {
  box-shadow:
    0 0 0 2px var(--window-bg),
    0 0 0 4px var(--accent);
}
.tbtn.done { color: var(--accent); font-weight: 600; }

/* ---------- Body ---------- */
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* ---------- Thumbnail sidebar ---------- */
.sidebar {
  width: 178px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px 6px 6px;
  border-radius: 9px;
}
.thumb:hover { background: var(--hover); }
.thumb.on { background: var(--selection); }
.thumb-img {
  width: 124px;
  height: 88px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.28);
}
.thumb.on .thumb-img {
  box-shadow:
    0 0 0 2px var(--accent),
    0 1px 5px rgba(0, 0, 0, 0.28);
}
.thumb-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb-name {
  font-size: 11px;
  color: var(--text-dim);
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.thumb-badge { color: var(--accent); margin-left: 2px; }

/* ---------- Canvas area ---------- */
.stage {
  flex: 1;
  min-width: 0;
  overflow: auto;
  display: flex;
  background: #525659; /* Preview's fixed neutral canvas, same in both themes */
}
.canvas-wrap {
  margin: auto;
  flex-shrink: 0;
  position: relative;
  transition: width 0.14s ease-out, height 0.14s ease-out;
}
.photo-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center center;
  border-radius: 2px;
  box-shadow:
    0 12px 38px rgba(0, 0, 0, 0.45),
    0 2px 10px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: transform 0.14s ease-out;
}
.photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
}
.img-failed { display: none; }
.draw {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.draw.marking {
  pointer-events: auto;
  cursor: crosshair;
  touch-action: none;
}
</style>
