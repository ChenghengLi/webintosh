<script setup>
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSystemStore } from '../../stores/system'
import { useWindowsStore } from '../../stores/windows'
import Ribbon from './Ribbon.vue'
import SlideView from './SlideView.vue'
import { PLACEHOLDERS, THEMES, loadDeck, newSlide, saveDeck, seedDeck, uid } from './deck.js'

const system = useSystemStore()
const windows = useWindowsStore()
const winId = inject('windowId', null)

const deck = ref(loadDeck() || seedDeck())
const current = ref(0)
const selectedShapeId = ref(null)
const defaultFill = ref('#ed7d31')
const lastField = ref('title') // last focused placeholder field (font size target)

const cur = computed(() => deck.value.slides[current.value] || deck.value.slides[0])
const themeObj = computed(() => THEMES.find((t) => t.id === deck.value.theme) || THEMES[0])
const selectedShape = computed(() => cur.value?.shapes.find((s) => s.id === selectedShapeId.value) || null)

watch(deck, (d) => saveDeck(d), { deep: true })

// ---- slides ----
function addSlide(layout) {
  deck.value.slides.splice(current.value + 1, 0, newSlide(layout))
  current.value += 1
  selectedShapeId.value = null
}
function duplicateSlide(i) {
  const copy = JSON.parse(JSON.stringify(deck.value.slides[i]))
  copy.id = uid()
  copy.shapes.forEach((s) => (s.id = uid()))
  deck.value.slides.splice(i + 1, 0, copy)
  current.value = i + 1
}
function deleteSlide(i) {
  if (deck.value.slides.length <= 1) return
  deck.value.slides.splice(i, 1)
  if (current.value > i) current.value -= 1
  else if (current.value >= deck.value.slides.length) current.value = deck.value.slides.length - 1
  selectedShapeId.value = null
}
function thumbMenu(e, i) {
  current.value = i
  selectedShapeId.value = null
  system.openContextMenu(e.clientX, e.clientY, [
    { label: 'Duplicate Slide', action: () => duplicateSlide(i) },
    { label: 'Delete Slide', disabled: deck.value.slides.length <= 1, action: () => deleteSlide(i) },
  ])
}

// ---- ribbon: font ----
function exec(cmd) {
  document.execCommand(cmd, false, null)
}
const currentFontSize = computed(() => {
  const s = selectedShape.value
  if (s && s.type === 'text') return s.fontSize || 22
  const boxes = PLACEHOLDERS[cur.value.layout] || {}
  const box = boxes[lastField.value] || boxes.title || { size: 20 }
  const override = lastField.value === 'title' ? cur.value.titleSize : cur.value.bodySize
  return override || box.size
})
function setFontSize(px) {
  const s = selectedShape.value
  if (s && s.type === 'text') {
    s.fontSize = px
    return
  }
  if (lastField.value === 'title') cur.value.titleSize = px
  else cur.value.bodySize = px
}
function onFocusEditable(field) {
  lastField.value = field
  selectedShapeId.value = null
}

// ---- ribbon: shapes ----
function setFill(color) {
  if (selectedShape.value) selectedShape.value.fill = color
  else defaultFill.value = color
}
function insertShape(type, emoji) {
  const base = { id: uid(), type, fill: defaultFill.value }
  if (type === 'rect') Object.assign(base, { x: 380, y: 205, w: 200, h: 130 })
  else if (type === 'circle') Object.assign(base, { x: 400, y: 190, w: 160, h: 160 })
  else if (type === 'emoji') Object.assign(base, { x: 430, y: 225, w: 90, h: 90, emoji: emoji || '😀' })
  else Object.assign(base, { x: 370, y: 250, w: 220, h: 50, text: 'Text Box', fontSize: 22 })
  cur.value.shapes.push(base)
  selectedShapeId.value = base.id
}

// ---- canvas sizing (16:9, max 880px wide) ----
const canvasWrap = ref(null)
const canvasW = ref(880)
let ro = null
function measureCanvas() {
  const el = canvasWrap.value
  if (!el) return
  canvasW.value = Math.max(280, Math.floor(Math.min(880, el.clientWidth - 56, ((el.clientHeight - 48) * 16) / 9)))
}

// ---- present mode ----
const presenting = ref(false)
const presentEl = ref(null)
const presentW = ref(900)
async function startPresent() {
  presenting.value = true
  await nextTick()
  measurePresent()
  window.addEventListener('resize', measurePresent)
  window.addEventListener('keydown', presentKey, true)
}
function stopPresent() {
  presenting.value = false
  window.removeEventListener('resize', measurePresent)
  window.removeEventListener('keydown', presentKey, true)
}
function measurePresent() {
  const el = presentEl.value
  if (!el) return
  presentW.value = Math.floor(Math.min(el.clientWidth * 0.88, (el.clientHeight - 90) * (16 / 9)))
}
function nextSlide() {
  if (current.value < deck.value.slides.length - 1) current.value += 1
}
function prevSlide() {
  if (current.value > 0) current.value -= 1
}
function presentKey(e) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    e.preventDefault()
    stopPresent()
  } else if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
    e.preventDefault()
    nextSlide()
  } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
    e.preventDefault()
    prevSlide()
  }
}

// ---- delete selected shape ----
function onKey(e) {
  if (presenting.value) return
  if (e.key !== 'Delete' && e.key !== 'Backspace') return
  if (!selectedShapeId.value) return
  if (windows.activeWindow && winId && windows.activeWindow.id !== winId) return
  const ae = document.activeElement
  if (ae && ae.isContentEditable) return
  e.preventDefault()
  const idx = cur.value.shapes.findIndex((s) => s.id === selectedShapeId.value)
  if (idx >= 0) cur.value.shapes.splice(idx, 1)
  selectedShapeId.value = null
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  ro = new ResizeObserver(measureCanvas)
  if (canvasWrap.value) ro.observe(canvasWrap.value)
  measureCanvas()
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (ro) ro.disconnect()
  stopPresent()
})
</script>

<template>
  <div class="app-root ppt">
    <Ribbon
      :font-size="currentFontSize"
      :active-fill="selectedShape ? selectedShape.fill : defaultFill"
      :theme-id="deck.theme"
      @add-slide="addSlide"
      @exec="exec"
      @font-size="setFontSize"
      @fill="setFill"
      @insert="insertShape"
      @update:theme="(id) => (deck.theme = id)"
      @present="startPresent"
    />

    <div class="body">
      <aside class="panel">
        <div class="thumbs">
          <div
            v-for="(s, i) in deck.slides"
            :key="s.id"
            class="thumb"
            :class="{ on: i === current }"
            @click="((current = i), (selectedShapeId = null))"
            @contextmenu.prevent="thumbMenu($event, i)"
          >
            <span class="tnum">{{ i + 1 }}</span>
            <SlideView :slide="s" :theme="themeObj" :width="148" />
          </div>
        </div>
        <button class="add-slide" @click="addSlide('titleContent')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>New Slide</span>
        </button>
      </aside>

      <main ref="canvasWrap" class="canvas" @mousedown="selectedShapeId = null">
        <SlideView
          :key="cur.id"
          class="canvas-slide"
          :slide="cur"
          :theme="themeObj"
          :width="canvasW"
          editable
          :selected-shape-id="selectedShapeId"
          @select-shape="(id) => (selectedShapeId = id)"
          @focus-editable="onFocusEditable"
        />
      </main>
    </div>

    <footer class="status">
      <span>Slide {{ current + 1 }} of {{ deck.slides.length }}</span>
      <span class="dot">•</span>
      <span>{{ themeObj.name }} theme</span>
      <span class="dot">•</span>
      <span>{{ cur.shapes.length ? cur.shapes.length + ' object(s)' : 'No objects' }}</span>
      <span class="sname">{{ deck.name }}</span>
    </footer>

    <div v-if="presenting" ref="presentEl" class="present">
      <SlideView :slide="cur" :theme="themeObj" :width="presentW" />
      <div class="p-ui">
        <button class="p-btn" title="Previous (←)" :disabled="current === 0" @click="prevSlide">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <span class="p-count">{{ current + 1 }} / {{ deck.slides.length }}</span>
        <button class="p-btn" title="Next (→)" :disabled="current === deck.slides.length - 1" @click="nextSlide">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9.5 5.5 16 12l-6.5 6.5" />
          </svg>
        </button>
        <button class="p-btn exit" title="End show (Esc)" @click="stopPresent">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ppt {
  position: relative;
  background: var(--window-bg);
  color: var(--text);
  container-type: inline-size;
}

/* ---- body ---- */
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.panel {
  width: 198px;
  flex: none;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
}
.thumbs {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  overflow-y: auto;
}
.thumb {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;
}
.thumb .sv {
  border: 1.5px solid var(--border);
  border-radius: 4px;
}
.thumb.on .sv {
  border-color: #d24726;
  box-shadow: 0 0 0 1.5px #d24726;
}
.tnum {
  width: 16px;
  padding-top: 2px;
  font-size: 11px;
  text-align: right;
  color: var(--text-dim);
}
.add-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 8px 10px 10px;
  padding: 7px;
  font-size: 12px;
  color: var(--text);
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 8px;
  cursor: pointer;
}
.add-slide:hover {
  background: var(--hover);
}
.canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  background: var(--sidebar-bg);
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.06);
}
.canvas-slide {
  border-radius: 3px;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.28), 0 1px 4px rgba(0, 0, 0, 0.18);
}

/* ---- status bar ---- */
.status {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 24px;
  flex: none;
  padding: 0 12px;
  font-size: 11px;
  color: var(--text-dim);
  background: var(--titlebar-bg);
  border-top: 0.5px solid var(--border);
}
.dot {
  opacity: 0.5;
}
.sname {
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- present mode ---- */
.present {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}
.p-ui {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  opacity: 0.5;
  transition: opacity 0.15s;
}
.p-ui:hover {
  opacity: 1;
}
.p-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 15px;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.p-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
}
.p-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.p-btn.exit {
  background: rgba(210, 71, 38, 0.75);
}
.p-count {
  min-width: 44px;
  font-size: 12px;
  text-align: center;
  color: rgba(255, 255, 255, 0.85);
  font-variant-numeric: tabular-nums;
}
</style>
