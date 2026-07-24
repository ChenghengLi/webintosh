<script setup>
import { ref, computed, onMounted } from 'vue'

const NOTE_W = 230
const NOTE_H = 230
const STRIP_H = 26

const props = defineProps({
  note: { type: Object, required: true },
  colors: { type: Object, required: true },
})
const emit = defineEmits(['patch', 'remove', 'front'])

const root = ref(null)
const editor = ref(null)
const dragging = ref(false)

const color = computed(() => props.colors[props.note.color] || props.colors.yellow)
const firstLine = computed(() => (props.note.text || '').split('\n')[0].trim() || 'Note')

const style = computed(() => ({
  left: props.note.x + 'px',
  top: props.note.y + 'px',
  zIndex: props.note.z,
  '--note-bg': color.value.bg,
  '--note-fold': color.value.fold,
  transform: dragging.value ? 'rotate(0deg) scale(1.04)' : `rotate(${props.note.rot}deg)`,
}))

onMounted(() => {
  editor.value.innerText = props.note.text || ''
})

function onInput() {
  emit('patch', { text: editor.value.innerText })
}

function onPaste(e) {
  e.preventDefault()
  const text = (e.clipboardData || window.clipboardData).getData('text/plain')
  document.execCommand('insertText', false, text)
}

// --- drag by the top strip (pointer events, clamped to the board) ---
let startX = 0
let startY = 0
let origX = 0
let origY = 0

function stripDown(e) {
  if (e.button !== 0) return
  emit('front')
  dragging.value = true
  startX = e.clientX
  startY = e.clientY
  origX = props.note.x
  origY = props.note.y
  e.currentTarget.setPointerCapture(e.pointerId)
}

function stripMove(e) {
  if (!dragging.value) return
  const board = root.value.offsetParent
  const h = props.note.collapsed ? STRIP_H : NOTE_H
  const maxX = Math.max(0, board.clientWidth - NOTE_W)
  const maxY = Math.max(0, board.clientHeight - h)
  const nx = Math.min(Math.max(origX + e.clientX - startX, 0), maxX)
  const ny = Math.min(Math.max(origY + e.clientY - startY, 0), maxY)
  emit('patch', { x: Math.round(nx), y: Math.round(ny) })
}

function stripUp() {
  dragging.value = false
}

function toggleCollapse() {
  emit('patch', { collapsed: !props.note.collapsed })
}
</script>

<template>
  <div
    ref="root"
    class="sticky"
    :class="{ dragging, collapsed: note.collapsed }"
    :style="style"
    @pointerdown="emit('front')"
  >
    <div
      class="strip"
      title="Drag to move · double-click to collapse"
      @pointerdown="stripDown"
      @pointermove="stripMove"
      @pointerup="stripUp"
      @pointercancel="stripUp"
      @dblclick="toggleCollapse"
    >
      <button class="close" title="Close note" @pointerdown.stop @click="emit('remove')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <span v-if="note.collapsed" class="bar-title">{{ firstLine }}</span>
    </div>

    <div v-show="!note.collapsed" class="body-wrap">
      <div
        ref="editor"
        class="body"
        contenteditable="true"
        spellcheck="false"
        @input="onInput"
        @paste="onPaste"
      />
      <div class="dots">
        <button
          v-for="(c, key) in colors"
          :key="key"
          class="dot"
          :class="{ active: note.color === key }"
          :style="{ background: c.bg }"
          :title="key"
          @pointerdown.stop
          @click="emit('patch', { color: key })"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sticky {
  position: absolute;
  width: 230px;
  height: 230px;
  display: flex;
  flex-direction: column;
  border-radius: 3px;
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0) 40%, rgba(0, 0, 0, 0.04)),
    var(--note-bg);
  color: #4b4433;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24), 0 2px 5px rgba(0, 0, 0, 0.14);
  user-select: none;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.sticky.dragging {
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.32), 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: none;
}

.sticky.collapsed {
  height: 26px;
}

/* folded dog-ear corner, top right */
.sticky::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-top: 20px solid var(--note-fold);
  border-left: 20px solid transparent;
  filter: drop-shadow(-2px 2px 2px rgba(0, 0, 0, 0.18));
  pointer-events: none;
}

.strip {
  position: relative;
  flex: none;
  height: 26px;
  display: flex;
  align-items: center;
  cursor: grab;
  touch-action: none;
}

.dragging .strip {
  cursor: grabbing;
}

.close {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.18);
  color: rgba(0, 0, 0, 0.55);
  font-size: 8px;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s;
}
.close svg {
  width: 7px;
  height: 7px;
  display: block;
}

.sticky:hover .close {
  opacity: 1;
}

.close:hover {
  background: rgba(0, 0, 0, 0.34);
  color: #fff;
}

.bar-title {
  padding: 0 22px 0 26px;
  font-size: 11.5px;
  font-style: italic;
  color: rgba(0, 0, 0, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.body-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.body {
  flex: 1;
  overflow-y: auto;
  outline: none;
  cursor: text;
  padding: 0 12px 6px;
  font-family: 'Marker Felt', 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive;
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}

.body:empty::before {
  content: 'Note';
  color: rgba(0, 0, 0, 0.3);
}

.dots {
  flex: none;
  display: flex;
  gap: 7px;
  justify-content: center;
  padding: 0 10px 8px;
  opacity: 0;
  transition: opacity 0.12s;
}

.sticky:hover .dots {
  opacity: 1;
}

.dot {
  width: 13px;
  height: 13px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transition: transform 0.1s;
}

.dot:hover {
  transform: scale(1.2);
}

.dot.active {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
}
</style>
