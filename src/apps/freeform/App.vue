<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { EMOJIS, SHAPE_COLORS, STICKY_COLORS, loadBoard, saveBoard, seedItems, uid } from './board'

const saved = loadBoard()
const boardName = ref(saved?.name || 'Untitled Board')
const items = reactive(saved?.items?.length ? saved.items : seedItems())
const pan = reactive(saved?.pan || { x: 320, y: 240 })
const zoom = ref(saved?.zoom || 1)

const tool = ref(null) // null = select/move
const shapeKind = ref('rect') // rect | circle | line
const emoji = ref('🚀')
const showShapes = ref(false)
const showEmojis = ref(false)
const selectedId = ref(null)
const connectFrom = ref(null)
const canvasEl = ref(null)
const draw = ref(null) // live drag preview while placing a shape

const byId = computed(() => Object.fromEntries(items.map((it) => [it.id, it])))
const isBox = (it) => it && it.type !== 'connector' && !(it.type === 'shape' && it.shape === 'line')
const isLine = (it) => it && it.type === 'shape' && it.shape === 'line'

const boardTransform = computed(() => ({
  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom.value})`,
}))
const gridStyle = computed(() => ({
  backgroundSize: `${26 * zoom.value}px ${26 * zoom.value}px`,
  backgroundPosition: `${pan.x}px ${pan.y}px`,
}))
const invZoom = computed(() => 1 / zoom.value)

// --- coordinates ---
function toBoard(e) {
  const r = canvasEl.value.getBoundingClientRect()
  return { x: (e.clientX - r.left - pan.x) / zoom.value, y: (e.clientY - r.top - pan.y) / zoom.value }
}

// --- tools ---
function pickTool(t) {
  if (tool.value === t) {
    if (t === 'shape') showShapes.value = !showShapes.value
    else if (t === 'image') showEmojis.value = !showEmojis.value
    else tool.value = null
    return
  }
  tool.value = t
  connectFrom.value = null
  showShapes.value = t === 'shape'
  showEmojis.value = t === 'image'
}
function pickShape(k) { shapeKind.value = k; showShapes.value = false }
function pickEmoji(em) { emoji.value = em; showEmojis.value = false }

// --- placement ---
function placeAt(p) {
  const base = { id: uid(), x: p.x, y: p.y }
  let it = null
  if (tool.value === 'sticky') it = { ...base, type: 'sticky', x: p.x - 85, y: p.y - 85, w: 170, h: 170, color: STICKY_COLORS[0], text: '' }
  else if (tool.value === 'text') it = { ...base, type: 'text', x: p.x - 100, y: p.y - 16, w: 220, h: 36, text: 'Text', fontSize: 20 }
  else if (tool.value === 'image') it = { ...base, type: 'image', x: p.x - 45, y: p.y - 45, w: 90, h: 90, emoji: emoji.value }
  if (!it) return
  items.push(it)
  selectedId.value = it.id
  if (it.type === 'sticky' || it.type === 'text') {
    if (it.type === 'text') it.text = ''
    nextTick(() => {
      const el = canvasEl.value?.querySelector(`[data-edit="${it.id}"]`)
      if (el) el.focus()
    })
  }
}

// --- canvas pointer: pan or place ---
function onCanvasDown(e) {
  if (e.button !== 0) return
  const p = toBoard(e)
  if (tool.value === 'shape') {
    draw.value = shapeKind.value === 'line' ? { x1: p.x, y1: p.y, x2: p.x, y2: p.y } : { x: p.x, y: p.y, w: 0, h: 0 }
    drag = { type: 'draw', start: p }
    return
  }
  if (tool.value === 'connector') { connectFrom.value = null; return }
  if (tool.value) { placeAt(p); return }
  selectedId.value = null
  drag = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y }
}

// --- item pointer: select, move, connect ---
function onItemDown(e, it) {
  if (e.button !== 0) return
  e.stopPropagation()
  if (tool.value === 'connector') {
    if (isBox(it) || isLine(it)) {
      if (!connectFrom.value) connectFrom.value = it.id
      else if (connectFrom.value !== it.id) {
        items.push({ id: uid(), type: 'connector', fromId: connectFrom.value, toId: it.id })
        connectFrom.value = null
      }
    }
    return
  }
  const editing = e.target.closest?.('[contenteditable="true"]')
  if (selectedId.value === it.id && editing) return // let the caret land
  selectedId.value = it.id
  const p = toBoard(e)
  if (isLine(it)) drag = { type: 'moveline', it, start: p, orig: { x1: it.x1, y1: it.y1, x2: it.x2, y2: it.y2 } }
  else drag = { type: 'move', it, start: p, orig: { x: it.x, y: it.y } }
}

function startResize(e, it, corner) {
  e.stopPropagation()
  drag = { type: 'resize', it, corner, start: toBoard(e), orig: { x: it.x, y: it.y, w: it.w, h: it.h } }
}
function startLinePoint(e, it, which) {
  e.stopPropagation()
  drag = { type: 'linepoint', it, which }
}

// --- shared drag lifecycle ---
let drag = null
function onMove(e) {
  if (!drag) return
  if (drag.type === 'pan') {
    pan.x = drag.ox + (e.clientX - drag.sx)
    pan.y = drag.oy + (e.clientY - drag.sy)
    return
  }
  const p = toBoard(e)
  const dx = p.x - drag.start?.x || 0
  const dy = p.y - drag.start?.y || 0
  if (drag.type === 'move') {
    drag.it.x = drag.orig.x + dx
    drag.it.y = drag.orig.y + dy
  } else if (drag.type === 'moveline') {
    drag.it.x1 = drag.orig.x1 + dx; drag.it.y1 = drag.orig.y1 + dy
    drag.it.x2 = drag.orig.x2 + dx; drag.it.y2 = drag.orig.y2 + dy
  } else if (drag.type === 'resize') {
    applyResize(drag.it, drag.corner, drag.orig, dx, dy)
  } else if (drag.type === 'linepoint') {
    drag.it[drag.which === 'p1' ? 'x1' : 'x2'] = p.x
    drag.it[drag.which === 'p1' ? 'y1' : 'y2'] = p.y
  } else if (drag.type === 'draw') {
    if (shapeKind.value === 'line') { draw.value.x2 = p.x; draw.value.y2 = p.y }
    else {
      draw.value.x = Math.min(drag.start.x, p.x)
      draw.value.y = Math.min(drag.start.y, p.y)
      draw.value.w = Math.abs(p.x - drag.start.x)
      draw.value.h = Math.abs(p.y - drag.start.y)
    }
  }
}
function onUp() {
  if (drag?.type === 'draw' && draw.value) {
    const d = draw.value
    if (shapeKind.value === 'line') {
      if (Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > 10)
        items.push({ id: uid(), type: 'shape', shape: 'line', x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, color: SHAPE_COLORS[0] })
    } else if (d.w > 10 && d.h > 10) {
      items.push({ id: uid(), type: 'shape', shape: shapeKind.value, x: d.x, y: d.y, w: d.w, h: d.h, color: SHAPE_COLORS[3] })
    }
    draw.value = null
  }
  drag = null
}

function applyResize(it, c, o, dx, dy) {
  const min = it.type === 'text' ? 40 : 30
  let { x, y, w, h } = o
  if (c.includes('e')) w = Math.max(min, o.w + dx)
  if (c.includes('s')) h = Math.max(min, o.h + dy)
  if (c.includes('w')) { w = Math.max(min, o.w - dx); x = o.x + o.w - w }
  if (c.includes('n')) { h = Math.max(min, o.h - dy); y = o.y + o.h - h }
  Object.assign(it, { x, y, w, h })
}

// --- selection / deletion ---
function removeItem(id) {
  const i = items.findIndex((it) => it.id === id)
  if (i >= 0) items.splice(i, 1)
  for (let j = items.length - 1; j >= 0; j--)
    if (items[j].type === 'connector' && (items[j].fromId === id || items[j].toId === id)) items.splice(j, 1)
  if (selectedId.value === id) selectedId.value = null
}
function onKey(e) {
  const el = document.activeElement
  const editing = el && (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName))
  if (e.key === 'Escape') {
    if (editing) { el.blur(); return }
    selectedId.value = null; tool.value = null; connectFrom.value = null
    showShapes.value = false; showEmojis.value = false
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && !editing && selectedId.value) {
    e.preventDefault()
    removeItem(selectedId.value)
  }
}

// --- zoom ---
const zoomLabel = computed(() => Math.round(zoom.value * 100) + '%')
function zoomBy(d) { zoom.value = Math.min(2, Math.max(0.5, Math.round((zoom.value + d) * 100) / 100)) }

// --- rendering helpers ---
function itemStyle(it) {
  return { left: it.x + 'px', top: it.y + 'px', width: it.w + 'px', height: it.h + 'px' }
}
function arrowhead(it) {
  const a = Math.atan2(it.y2 - it.y1, it.x2 - it.x1)
  const s = 7, l = 14
  const bx = it.x2 - l * Math.cos(a), by = it.y2 - l * Math.sin(a)
  const px = s * Math.sin(a), py = -s * Math.cos(a)
  return `${it.x2},${it.y2} ${bx + px},${by + py} ${bx - px},${by - py}`
}
function center(it) {
  return isLine(it)
    ? { x: (it.x1 + it.x2) / 2, y: (it.y1 + it.y2) / 2 }
    : { x: it.x + it.w / 2, y: it.y + it.h / 2 }
}
function connEnds(c) {
  const a = byId.value[c.fromId], b = byId.value[c.toId]
  return a && b ? { a: center(a), b: center(b) } : null
}

// set initial editable text once; typing updates item.text via @input without re-render clobbering the caret
const vContent = {
  mounted: (el, binding) => { el.innerText = binding.value || '' },
  updated: (el, binding) => {
    if (binding.value !== binding.oldValue && el.innerText !== binding.value) el.innerText = binding.value || ''
  },
}

watch([boardName, items, pan, zoom], () => saveBoard({ name: boardName.value, items, pan, zoom: zoom.value }), { deep: true })

onMounted(() => {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="app-root freeform">
    <header class="topbar glass-strong">
      <div class="spacer"></div>
      <input v-model="boardName" class="board-name" maxlength="60" spellcheck="false" aria-label="Board name" />
      <div class="top-right">
        <div class="zoom-ctl">
          <button @click="zoomBy(-0.25)" :disabled="zoom <= 0.5" aria-label="Zoom out">−</button>
          <button class="zoom-label" @click="zoom = 1" title="Reset zoom">{{ zoomLabel }}</button>
          <button @click="zoomBy(0.25)" :disabled="zoom >= 2" aria-label="Zoom in">+</button>
        </div>
        <button class="share" title="Share">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 10V2M5 4.5 8 1.5l3 3" /><path d="M3 8v5a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V8" />
          </svg>
        </button>
      </div>
    </header>

    <div class="body">
      <nav class="toolbar glass-strong">
        <button :class="{ on: tool === null }" title="Select" @click="tool = null">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M4 1.5 12.5 8 8.2 9l-1.8 4.3z" /></svg>
        </button>
        <button :class="{ on: tool === 'sticky' }" title="Sticky note" @click="pickTool('sticky')">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3">
            <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="#ffe68a" stroke="currentColor" /><path d="M13.5 10 10 13.5v-3.5z" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button :class="{ on: tool === 'text' }" title="Text" @click="pickTool('text')">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4.5V3h10v1.5M8 3v10M6 13h4" /></svg>
        </button>
        <div class="tool-wrap">
          <button :class="{ on: tool === 'shape' }" title="Shape" @click="pickTool('shape')">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3">
              <rect x="1.5" y="3" width="8" height="8" rx="1.5" /><circle cx="10.5" cy="10.5" r="4" />
            </svg>
          </button>
          <div v-if="showShapes" class="popover glass-strong">
            <button :class="{ on: shapeKind === 'rect' }" title="Rounded rectangle" @click="pickShape('rect')">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="12" height="10" rx="2.5" /></svg>
            </button>
            <button :class="{ on: shapeKind === 'circle' }" title="Circle" @click="pickShape('circle')">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="5.5" /></svg>
            </button>
            <button :class="{ on: shapeKind === 'line' }" title="Arrow line" @click="pickShape('line')">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 13 11 4.5M8 4h3.5v3.5" /></svg>
            </button>
          </div>
        </div>
        <div class="tool-wrap">
          <button :class="{ on: tool === 'image' }" title="Image" @click="pickTool('image')">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3">
              <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><circle cx="5.5" cy="6" r="1.3" fill="currentColor" stroke="none" /><path d="m3 12 3.5-3.5 2.5 2.5 2-2 2 3" />
            </svg>
          </button>
          <div v-if="showEmojis" class="popover emojis glass-strong">
            <button v-for="em in EMOJIS" :key="em" :class="{ on: emoji === em }" @click="pickEmoji(em)">{{ em }}</button>
          </div>
        </div>
        <button :class="{ on: tool === 'connector' }" title="Connector" @click="pickTool('connector')">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="3.5" cy="12.5" r="2" /><circle cx="12.5" cy="3.5" r="2" /><path d="M5.5 11 10.5 5" /></svg>
        </button>
      </nav>

      <div ref="canvasEl" class="canvas" :class="{ placing: !!tool }" :style="gridStyle" @pointerdown="onCanvasDown">
        <div class="board" :style="boardTransform">
          <svg class="wires" width="1" height="1">
            <template v-for="c in items.filter((i) => i.type === 'connector')" :key="c.id">
              <g v-if="connEnds(c)">
                <line :x1="connEnds(c).a.x" :y1="connEnds(c).a.y" :x2="connEnds(c).b.x" :y2="connEnds(c).b.y" class="conn" />
                <polygon :points="arrowhead({ x1: connEnds(c).a.x, y1: connEnds(c).a.y, x2: connEnds(c).b.x, y2: connEnds(c).b.y })" class="conn-fill" />
              </g>
            </template>
            <template v-for="it in items.filter(isLine)" :key="it.id">
              <line :x1="it.x1" :y1="it.y1" :x2="it.x2" :y2="it.y2" class="hit" @pointerdown="onItemDown($event, it)" />
              <line :x1="it.x1" :y1="it.y1" :x2="it.x2" :y2="it.y2" class="line-shape" :style="{ stroke: it.color }" />
              <polygon :points="arrowhead(it)" :style="{ fill: it.color }" />
              <template v-if="selectedId === it.id">
                <circle :cx="it.x1" :cy="it.y1" :r="5 * invZoom" class="endpoint" @pointerdown="startLinePoint($event, it, 'p1')" />
                <circle :cx="it.x2" :cy="it.y2" :r="5 * invZoom" class="endpoint" @pointerdown="startLinePoint($event, it, 'p2')" />
              </template>
            </template>
            <line v-if="draw && shapeKind === 'line'" :x1="draw.x1" :y1="draw.y1" :x2="draw.x2" :y2="draw.y2" class="preview-line" />
          </svg>

          <div v-if="draw && shapeKind !== 'line'" class="draw-preview" :style="{ left: draw.x + 'px', top: draw.y + 'px', width: draw.w + 'px', height: draw.h + 'px', borderRadius: shapeKind === 'circle' ? '50%' : '12px' }"></div>

          <div
            v-for="it in items.filter((i) => i.type !== 'connector' && !isLine(i))"
            :key="it.id"
            class="item"
            :class="[it.type, { sel: selectedId === it.id, 'connect-src': connectFrom === it.id }]"
            :style="itemStyle(it)"
            @pointerdown="onItemDown($event, it)"
          >
            <div v-if="it.type === 'shape'" class="shape-fill" :style="{ background: it.color, borderRadius: it.shape === 'circle' ? '50%' : '12px' }"></div>
            <div v-else-if="it.type === 'sticky'" class="sticky-body" :style="{ background: it.color }">
              <div v-content="it.text" :data-edit="it.id" class="editable sticky-text" :contenteditable="selectedId === it.id" @input="it.text = $event.target.innerText"></div>
            </div>
            <div v-else-if="it.type === 'text'" v-content="it.text" :data-edit="it.id" class="editable text-body" :class="{ bold: it.bold }" :style="{ fontSize: (it.fontSize || 20) + 'px' }" :contenteditable="selectedId === it.id" @input="it.text = $event.target.innerText"></div>
            <div v-else-if="it.type === 'image'" class="emoji-tile">{{ it.emoji }}</div>

            <template v-if="selectedId === it.id">
              <div class="ring"></div>
              <button class="del" :style="{ transform: `translate(50%, -50%) scale(${invZoom})` }" title="Delete" @pointerdown.stop @click.stop="removeItem(it.id)">×</button>
              <div
                v-for="c in ['nw', 'ne', 'sw', 'se']"
                :key="c"
                class="handle"
                :class="c"
                :style="{ width: 9 * invZoom + 'px', height: 9 * invZoom + 'px', borderWidth: 1.5 * invZoom + 'px' }"
                @pointerdown="startResize($event, it, c)"
              ></div>
              <div v-if="it.type === 'shape' || it.type === 'sticky'" class="palette glass-strong" :style="{ transform: `translateX(-50%) scale(${invZoom})` }">
                <button
                  v-for="col in it.type === 'sticky' ? STICKY_COLORS : SHAPE_COLORS"
                  :key="col"
                  class="dot"
                  :class="{ on: it.color === col }"
                  :style="{ background: col }"
                  @pointerdown.stop
                  @click.stop="it.color = col"
                ></button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.freeform { background: var(--window-bg); color: var(--text); overflow: hidden; }

.topbar { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-bottom: 0.5px solid var(--border); z-index: 5; }
.spacer { flex: 1; }
.board-name { flex: 0 1 260px; text-align: center; font-size: 14px; font-weight: 600; color: var(--text); background: transparent; border: 0.5px solid transparent; border-radius: 8px; padding: 4px 10px; outline: none; }
.board-name:hover { border-color: var(--border); }
.board-name:focus { border-color: var(--accent); background: var(--window-bg); }
.top-right { flex: 1; display: flex; justify-content: flex-end; align-items: center; gap: 10px; }
.zoom-ctl { display: flex; align-items: center; border: 0.5px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--window-bg); }
.zoom-ctl button { border: 0; background: transparent; color: var(--text); font-size: 13px; padding: 3px 9px; cursor: pointer; }
.zoom-ctl button:hover:not(:disabled) { background: var(--hover); }
.zoom-ctl button:disabled { opacity: 0.35; cursor: default; }
.zoom-label { min-width: 46px; color: var(--text-dim) !important; font-variant-numeric: tabular-nums; }
.share { display: grid; place-items: center; width: 28px; height: 26px; border: 0.5px solid var(--border); border-radius: 8px; background: var(--window-bg); color: var(--accent); cursor: pointer; }

.body { position: relative; flex: 1; min-height: 0; }
.toolbar { position: absolute; left: 50%; top: 10px; transform: translateX(-50%); z-index: 4; display: flex; gap: 2px; padding: 4px 6px; border-radius: 12px; border: 0.5px solid var(--border); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12); }
.toolbar > button, .tool-wrap > button { width: 34px; height: 34px; display: grid; place-items: center; border: 0; border-radius: 9px; background: transparent; color: var(--text); cursor: pointer; }
.toolbar button:hover { background: var(--hover); }
.toolbar button.on { background: var(--accent); color: #fff; }
.tool-wrap { position: relative; }
.popover { position: absolute; top: 42px; left: 50%; transform: translateX(-50%); display: flex; gap: 3px; padding: 5px; border-radius: 10px; border: 0.5px solid var(--border); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15); z-index: 6; }
.popover button { width: 30px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 7px; background: transparent; color: var(--text); cursor: pointer; font-size: 15px; }
.popover.emojis { flex-wrap: wrap; width: 126px; }

.canvas { position: absolute; inset: 0; overflow: hidden; touch-action: none; user-select: none; cursor: grab; background-image: radial-gradient(circle, var(--border) 1.2px, transparent 1.3px); }
.canvas.placing { cursor: crosshair; }
.board { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; }
.wires { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.wires .hit { stroke: transparent; stroke-width: 14; pointer-events: stroke; cursor: move; }
.conn { stroke: var(--text-dim); stroke-width: 2; stroke-dasharray: 6 4; opacity: 0.7; }
.conn-fill { fill: var(--text-dim); opacity: 0.7; }
.line-shape { stroke-width: 3; stroke-linecap: round; pointer-events: none; }
.endpoint { fill: #fff; stroke: var(--accent); stroke-width: 1.5; pointer-events: all; cursor: crosshair; }
.preview-line { stroke: var(--accent); stroke-width: 2; stroke-dasharray: 5 4; }
.draw-preview { position: absolute; border: 1.5px dashed var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); pointer-events: none; }

.item { position: absolute; cursor: move; }
.shape-fill { position: absolute; inset: 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); }
.sticky-body { position: absolute; inset: 0; border-radius: 4px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18); padding: 12px; box-sizing: border-box; }
.editable { outline: none; cursor: text; white-space: pre-wrap; word-break: break-word; }
.sticky-text { width: 100%; height: 100%; font-size: 14px; line-height: 1.35; color: #3a3524; overflow: hidden; }
.text-body { width: 100%; height: 100%; line-height: 1.25; overflow: hidden; }
.text-body.bold { font-weight: 700; }
.emoji-tile { position: absolute; inset: 0; display: grid; place-items: center; font-size: 44px; background: var(--window-bg); border: 0.5px solid var(--border); border-radius: 14px; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12); }

.item.sel .ring { position: absolute; inset: -5px; border: 2px solid var(--accent); border-radius: 12px; pointer-events: none; }
.item.connect-src .ring { display: none; }
.item.connect-src { outline: 2px dashed var(--accent); outline-offset: 3px; border-radius: 8px; }
.del { position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; border-radius: 50%; border: 0; background: var(--text-dim); color: var(--window-bg); font-size: 12px; line-height: 1; cursor: pointer; z-index: 3; }
.del:hover { background: #ff3b30; color: #fff; }
.handle { position: absolute; background: #fff; border: 1.5px solid var(--accent); border-radius: 50%; z-index: 3; box-sizing: border-box; }
.handle.nw { left: 0; top: 0; transform: translate(-50%, -50%); cursor: nwse-resize; }
.handle.ne { right: 0; top: 0; transform: translate(50%, -50%); cursor: nesw-resize; }
.handle.sw { left: 0; bottom: 0; transform: translate(-50%, 50%); cursor: nesw-resize; }
.handle.se { right: 0; bottom: 0; transform: translate(50%, 50%); cursor: nwse-resize; }
.palette { position: absolute; left: 50%; bottom: -14px; transform-origin: top center; translate: 0 100%; display: flex; gap: 5px; padding: 6px 8px; border-radius: 10px; border: 0.5px solid var(--border); z-index: 4; }
.dot { width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(0, 0, 0, 0.15); cursor: pointer; padding: 0; }
.dot.on { outline: 2px solid var(--accent); outline-offset: 1px; }
</style>
