<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useSystemStore } from '../../stores/system'
import { compile } from './parser'

const system = useSystemStore()

// ---- Equations -------------------------------------------------------------

const COLORS = ['#0a84ff', '#ff453a', '#32d74b', '#ff9f0a'] // blue red green orange
const EXAMPLES = ['sin(x)', 'x^2', '1/x', 'sqrt(x)']
const MAX_EQ = 4

let nextId = 1
const equations = ref([{ id: nextId++, text: 'sin(x)', color: COLORS[0], visible: true }])
const showExamples = ref(false)

const compiled = computed(() =>
  equations.value.map((eq) => ({ ...compile(eq.text) }))
)

function pickColor() {
  const used = new Set(equations.value.map((e) => e.color))
  return COLORS.find((c) => !used.has(c)) || COLORS[0]
}

function addEquation(text = '') {
  if (equations.value.length >= MAX_EQ) return
  equations.value.push({ id: nextId++, text, color: pickColor(), visible: true })
}

function removeEquation(i) {
  if (equations.value.length <= 1) return
  equations.value.splice(i, 1)
}

function useExample(ex) {
  showExamples.value = false
  const empty = equations.value.find((e) => !e.text.trim())
  if (empty) empty.text = ex
  else if (equations.value.length < MAX_EQ) addEquation(ex)
}

// ---- View state ------------------------------------------------------------

const view = ref({ cx: 0, cy: 0, scale: 50 }) // cx/cy: world coords at canvas center; scale: px per unit
const SCALE_MIN = 2
const SCALE_MAX = 8000

const wrapEl = ref(null)
const canvasEl = ref(null)
const cssW = ref(0)
const cssH = ref(0)
let dpr = 1

function resetView() {
  view.value = { cx: 0, cy: 0, scale: 50 }
}

function zoomBy(factor, mx, my) {
  const v = view.value
  const w = cssW.value
  const h = cssH.value
  const scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, v.scale * factor))
  if (scale === v.scale) return
  if (mx === undefined) { mx = w / 2; my = h / 2 }
  const wx = v.cx + (mx - w / 2) / v.scale
  const wy = v.cy - (my - h / 2) / v.scale
  view.value = {
    scale,
    cx: wx - (mx - w / 2) / scale,
    cy: wy + (my - h / 2) / scale,
  }
}

// ---- Drawing ---------------------------------------------------------------

let rafId = 0
function scheduleDraw() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    draw()
  })
}

// nice 1/2/5 step so gridlines land on round numbers
function niceStep(raw) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  for (const m of [1, 2, 5, 10]) if (m * pow >= raw) return m * pow
  return 10 * pow
}

function fmtNum(n, step) {
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9))
  let s = n.toFixed(Math.min(decimals, 10))
  if (s === '-0') s = '0'
  return s
}

function fmtCoord(n) {
  if (n === 0) return '0'
  if (Math.abs(n) >= 1e6 || Math.abs(n) < 1e-4) return n.toExponential(2)
  return String(parseFloat(n.toPrecision(5)))
}

function draw() {
  const canvas = canvasEl.value
  if (!canvas || cssW.value === 0) return
  const ctx = canvas.getContext('2d')
  const w = cssW.value
  const h = cssH.value
  const v = view.value

  const styles = getComputedStyle(canvas)
  const textCol = styles.getPropertyValue('--text').trim() || '#1d1d1f'
  const dimCol = styles.getPropertyValue('--text-dim').trim() || '#86868b'
  const borderCol = styles.getPropertyValue('--border').trim() || 'rgba(0,0,0,0.12)'

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const xToPx = (x) => (x - v.cx) * v.scale + w / 2
  const yToPx = (y) => h / 2 - (y - v.cy) * v.scale
  const xMin = v.cx - w / 2 / v.scale
  const xMax = v.cx + w / 2 / v.scale
  const yMin = v.cy - h / 2 / v.scale
  const yMax = v.cy + h / 2 / v.scale

  // -- gridlines + tick labels --
  const step = niceStep(64 / v.scale)
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.lineWidth = 1

  ctx.strokeStyle = borderCol
  ctx.fillStyle = dimCol
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const axisYPx = Math.max(14, Math.min(h - 6, yToPx(0)))
  for (let gx = Math.ceil(xMin / step) * step; gx <= xMax + step * 1e-9; gx += step) {
    const px = Math.round(xToPx(gx)) + 0.5
    ctx.beginPath()
    ctx.moveTo(px, 0)
    ctx.lineTo(px, h)
    ctx.stroke()
    if (Math.abs(gx) > step / 1e6) ctx.fillText(fmtNum(gx, step), px, axisYPx + 4)
  }
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  const axisXPx = Math.max(26, Math.min(w - 8, xToPx(0)))
  for (let gy = Math.ceil(yMin / step) * step; gy <= yMax + step * 1e-9; gy += step) {
    const py = Math.round(yToPx(gy)) + 0.5
    ctx.beginPath()
    ctx.moveTo(0, py)
    ctx.lineTo(w, py)
    ctx.stroke()
    if (Math.abs(gy) > step / 1e6) ctx.fillText(fmtNum(gy, step), axisXPx - 6, py)
  }

  // -- axes --
  ctx.strokeStyle = dimCol
  ctx.lineWidth = 1.2
  if (0 >= xMin && 0 <= xMax) {
    const px = Math.round(xToPx(0)) + 0.5
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke()
  }
  if (0 >= yMin && 0 <= yMax) {
    const py = Math.round(yToPx(0)) + 0.5
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke()
  }
  ctx.fillStyle = textCol
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText('0', axisXPx - 6, axisYPx + 4)

  // -- curves --
  equations.value.forEach((eq, i) => {
    const fn = compiled.value[i].fn
    if (!eq.visible || !fn) return
    ctx.strokeStyle = eq.color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    let pen = false
    let prevPy = 0
    for (let px = 0; px <= w; px++) {
      const x = xMin + (px / w) * (xMax - xMin)
      let y
      try { y = fn(x) } catch { y = NaN }
      const py = yToPx(y)
      // break the path on non-finite values, far-offscreen points, and pole jumps
      if (!isFinite(y) || py < -4 * h || py > 5 * h || (pen && Math.abs(py - prevPy) > 3 * h)) {
        pen = false
        continue
      }
      if (pen) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
      pen = true
      prevPy = py
    }
    ctx.stroke()
  })

  ctx.restore()
}

// ---- Pan / zoom interaction --------------------------------------------------

const dragging = ref(false)
let lastX = 0
let lastY = 0

function onPointerDown(e) {
  dragging.value = true
  lastX = e.clientX
  lastY = e.clientY
  readout.value = null
  canvasEl.value.setPointerCapture(e.pointerId)
}

function onPointerMove(e) {
  const rect = canvasEl.value.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  if (dragging.value) {
    const v = view.value
    view.value = {
      ...v,
      cx: v.cx - (e.clientX - lastX) / v.scale,
      cy: v.cy + (e.clientY - lastY) / v.scale,
    }
    lastX = e.clientX
    lastY = e.clientY
    return
  }
  updateReadout(mx, my)
}

function onPointerUp() {
  dragging.value = false
}

function onWheel(e) {
  e.preventDefault()
  const rect = canvasEl.value.getBoundingClientRect()
  zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top)
}

// ---- Cursor readout ----------------------------------------------------------

const readout = ref(null) // { color, x, y, px, py }

function updateReadout(mx, my) {
  const v = view.value
  const w = cssW.value
  const h = cssH.value
  const x = v.cx + (mx - w / 2) / v.scale
  const mouseY = v.cy - (my - h / 2) / v.scale
  let best = null
  equations.value.forEach((eq, i) => {
    const fn = compiled.value[i].fn
    if (!eq.visible || !fn) return
    let y
    try { y = fn(x) } catch { return }
    if (!isFinite(y)) return
    const distPx = Math.abs(y - mouseY) * v.scale
    if (distPx < 36 && (!best || distPx < best.distPx)) {
      best = { distPx, color: eq.color, x, y }
    }
  })
  readout.value = best
    ? { color: best.color, x: fmtCoord(best.x), y: fmtCoord(best.y) }
    : null
}

// ---- Lifecycle ---------------------------------------------------------------

let resizeObs = null

onMounted(() => {
  dpr = window.devicePixelRatio || 1
  resizeObs = new ResizeObserver(() => {
    const rect = wrapEl.value.getBoundingClientRect()
    cssW.value = Math.max(0, Math.round(rect.width))
    cssH.value = Math.max(0, Math.round(rect.height))
    canvasEl.value.width = cssW.value * dpr
    canvasEl.value.height = cssH.value * dpr
    scheduleDraw()
  })
  resizeObs.observe(wrapEl.value)
})

onBeforeUnmount(() => {
  if (resizeObs) resizeObs.disconnect()
  if (rafId) cancelAnimationFrame(rafId)
})

watch([view, equations], scheduleDraw, { deep: true })
watch(() => system.dark, scheduleDraw)
</script>

<template>
  <div class="app-root grapher">
    <!-- Equation panel -->
    <div class="eq-panel">
      <div v-for="(eq, i) in equations" :key="eq.id" class="eq-block">
        <div class="eq-row">
          <input
            v-model="eq.visible"
            type="checkbox"
            class="eq-check"
            :style="{ accentColor: eq.color }"
            :title="eq.visible ? 'Hide curve' : 'Show curve'"
          >
          <span class="eq-label" :style="{ color: eq.color }">y =</span>
          <input
            v-model="eq.text"
            class="eq-input"
            :class="{ invalid: compiled[i].error }"
            type="text"
            spellcheck="false"
            autocomplete="off"
            placeholder="sin(x), x^2, 1/x …"
            @keydown.enter="$event.target.blur()"
          >
          <button
            class="eq-del"
            :disabled="equations.length <= 1"
            title="Delete equation"
            @click="removeEquation(i)"
          ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div v-if="compiled[i].error && eq.text.trim()" class="eq-error">
          <svg class="warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> {{ compiled[i].error }}
        </div>
      </div>
      <div class="eq-actions">
        <button
          class="action-btn"
          :disabled="equations.length >= MAX_EQ"
          title="Add equation (max 4)"
          @click="addEquation()"
        >＋ Add</button>
        <div class="examples-wrap">
          <button class="action-btn" @click.stop="showExamples = !showExamples">Examples ▾</button>
          <div v-if="showExamples" class="examples-backdrop" @click="showExamples = false"></div>
          <div v-if="showExamples" class="examples-menu glass-strong">
            <button v-for="ex in EXAMPLES" :key="ex" class="example-item" @click="useExample(ex)">
              <span class="example-y">y =</span> {{ ex }}
            </button>
          </div>
        </div>
        <span class="eq-hint">drag to pan · scroll to zoom</span>
      </div>
    </div>

    <!-- Plot area -->
    <div ref="wrapEl" class="plot-wrap">
      <canvas
        ref="canvasEl"
        class="plot-canvas"
        :class="{ dragging }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp(); readout = null"
        @wheel="onWheel"
      ></canvas>

      <div class="zoom-hud glass-strong">
        <button class="zoom-btn" title="Zoom in" @click="zoomBy(1.5)">＋</button>
        <button class="zoom-btn" title="Zoom out" @click="zoomBy(1 / 1.5)">－</button>
        <button class="zoom-btn reset" title="Reset view" @click="resetView"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></button>
      </div>

      <div v-if="readout" class="readout glass-strong">
        <span class="readout-dot" :style="{ background: readout.color }"></span>
        ({{ readout.x }}, {{ readout.y }})
      </div>
    </div>
  </div>
</template>

<style scoped>
.grapher { font-size: 13px; color: var(--text); background: var(--window-bg); }

/* ---- Equation panel ---- */
.eq-panel { padding: 8px 12px 6px; border-bottom: 0.5px solid var(--border); background: var(--sidebar-bg); flex-shrink: 0; }
.eq-block + .eq-block { margin-top: 4px; }
.eq-row { display: flex; align-items: center; gap: 8px; }
.eq-check { width: 14px; height: 14px; margin: 0; cursor: pointer; flex-shrink: 0; }
.eq-label { font-style: italic; font-weight: 600; font-size: 14px; flex-shrink: 0; width: 22px; text-align: right; }

.eq-input {
  flex: 1; min-width: 0; height: 26px; padding: 0 8px;
  font: 13px/1 ui-monospace, 'SF Mono', Menlo, monospace;
  color: var(--text); background: var(--window-bg);
  border: 0.5px solid var(--border); border-radius: 6px; outline: none;
}
.eq-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent); }
.eq-input.invalid { border-color: #ff453a; }

.eq-del { border: none; background: none; color: var(--text-dim); font-size: 11px; cursor: pointer; padding: 2px 4px; border-radius: 4px; flex-shrink: 0; display: inline-flex; align-items: center; }
.eq-del svg { width: 11px; height: 11px; display: block; }
.eq-del:hover:not(:disabled) { color: #ff453a; background: var(--hover); }
.eq-del:disabled { opacity: 0.3; cursor: default; }
.eq-error { margin: 2px 0 0 44px; font-size: 11px; color: #ff453a; display: flex; align-items: center; gap: 4px; }
.eq-error .warn { width: 12px; height: 12px; flex-shrink: 0; }

.eq-actions { display: flex; align-items: center; gap: 8px; margin-top: 6px; }

.action-btn {
  height: 22px; padding: 0 10px; font-size: 12px;
  color: var(--text); background: var(--window-bg);
  border: 0.5px solid var(--border); border-radius: 6px; cursor: pointer;
}
.action-btn:hover:not(:disabled) { background: var(--hover); }
.action-btn:disabled { opacity: 0.4; cursor: default; }
.eq-hint { margin-left: auto; font-size: 11px; color: var(--text-dim); }

.examples-wrap { position: relative; }
.examples-backdrop { position: fixed; inset: 0; z-index: 10; }

.examples-menu {
  position: absolute; top: 26px; left: 0; z-index: 11; min-width: 150px; padding: 4px;
  border-radius: 8px; border: 0.5px solid var(--border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  display: flex; flex-direction: column;
}

.example-item {
  display: block; width: 100%; text-align: left; padding: 5px 10px;
  border: none; background: none; border-radius: 5px;
  font: 12px ui-monospace, 'SF Mono', Menlo, monospace;
  color: var(--text); cursor: pointer;
}
.example-item:hover { background: var(--accent); color: #fff; }
.example-item:hover .example-y { color: rgba(255, 255, 255, 0.8); }
.example-y { font-style: italic; color: var(--text-dim); }

/* ---- Plot area ---- */
.plot-wrap { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.plot-canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; touch-action: none; }
.plot-canvas.dragging { cursor: grabbing; }

.zoom-hud {
  position: absolute; right: 12px; bottom: 12px; display: flex;
  border-radius: 8px; border: 0.5px solid var(--border); overflow: hidden;
}

.zoom-btn { width: 32px; height: 28px; border: none; background: none; font-size: 15px; color: var(--text); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.zoom-btn + .zoom-btn { border-left: 0.5px solid var(--border); }
.zoom-btn:hover { background: var(--hover); }
.zoom-btn.reset { font-size: 13px; }
.zoom-btn.reset svg { width: 14px; height: 14px; display: block; }

.readout {
  position: absolute; left: 12px; bottom: 12px;
  display: flex; align-items: center; gap: 6px; padding: 4px 10px;
  border-radius: 8px; border: 0.5px solid var(--border);
  font: 12px ui-monospace, 'SF Mono', Menlo, monospace;
  color: var(--text); pointer-events: none;
}

.readout-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
</style>
