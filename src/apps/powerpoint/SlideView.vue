<script setup>
// Renders one slide at any width (thumbnail / edit canvas / present mode).
// The slide is authored in a fixed 960x540 design space and scaled via transform.
import { computed, nextTick, ref } from 'vue'
import { PH_LABEL, PLACEHOLDERS } from './deck.js'

const props = defineProps({
  slide: { type: Object, required: true },
  theme: { type: Object, required: true },
  width: { type: Number, default: 960 },
  editable: { type: Boolean, default: false },
  selectedShapeId: { type: String, default: null },
})
const emit = defineEmits(['select-shape', 'focus-editable'])

const BASE_W = 960
const BASE_H = 540
const scale = computed(() => props.width / BASE_W)
const viewH = computed(() => Math.round((props.width * BASE_H) / BASE_W))

const fields = computed(() => Object.keys(PLACEHOLDERS[props.slide.layout] || {}))

function boxStyle(field) {
  const b = PLACEHOLDERS[props.slide.layout][field]
  const override = field === 'title' ? props.slide.titleSize : props.slide.bodySize
  return {
    left: b.left + 'px',
    top: b.top + 'px',
    width: b.width + 'px',
    minHeight: b.height + 'px',
    fontSize: (override || b.size) + 'px',
    fontWeight: b.bold ? 700 : 400,
    textAlign: b.center ? 'center' : 'left',
  }
}

const empty = (html) => !html || !String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()

// contenteditable contents are set imperatively on mount only, so Vue never
// rewrites them mid-typing (which would reset the caret).
const vSetHtml = {
  mounted(el, binding) {
    el.innerHTML = binding.value || ''
  },
}
const vSetText = {
  mounted(el, binding) {
    el.textContent = binding.value || ''
  },
}

function onInput(e, field) {
  props.slide[field] = e.target.innerHTML
}

// ---- shapes: select, drag, in-place text editing ----
const editingTextId = ref(null)
let drag = null

function shapeStyle(s) {
  const st = { left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', height: s.h + 'px' }
  if (s.type === 'text' && s.fill) st.color = s.fill
  return st
}

function shapeDown(e, s) {
  if (!props.editable) return
  emit('select-shape', s.id)
  if (s.type === 'text' && editingTextId.value === s.id) return // let the caret work
  e.preventDefault()
  e.stopPropagation()
  drag = { id: s.id, sx: e.clientX, sy: e.clientY, ox: s.x, oy: s.y }
  window.addEventListener('mousemove', shapeMove)
  window.addEventListener('mouseup', shapeUp, { once: true })
}

function shapeMove(e) {
  if (!drag) return
  const s = props.slide.shapes.find((x) => x.id === drag.id)
  if (!s) return
  s.x = Math.round(drag.ox + (e.clientX - drag.sx) / scale.value)
  s.y = Math.round(drag.oy + (e.clientY - drag.sy) / scale.value)
}

function shapeUp() {
  window.removeEventListener('mousemove', shapeMove)
  drag = null
}

function shapeDbl(e, s) {
  if (!props.editable || s.type !== 'text') return
  editingTextId.value = s.id
  nextTick(() => {
    const el = e.currentTarget.querySelector('.sv-text')
    if (el) {
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    }
  })
}
</script>

<template>
  <div
    class="sv"
    :class="{ editable }"
    :style="{ width: width + 'px', height: viewH + 'px' }"
    @mousedown.self="emit('select-shape', null)"
  >
    <div class="sv-stage" :style="{ transform: `scale(${scale})`, background: theme.bg, color: theme.text }">
      <div v-for="f in fields" :key="f" class="sv-ph" :class="{ ed: editable }" :style="boxStyle(f)">
        <span v-if="editable && empty(slide[f])" class="sv-ph-label" :style="{ color: theme.dim }">{{ PH_LABEL[f] }}</span>
        <div
          v-if="editable"
          v-set-html="slide[f]"
          class="sv-ed"
          contenteditable="true"
          spellcheck="false"
          @input="onInput($event, f)"
          @focus="emit('focus-editable', f)"
          @mousedown="emit('select-shape', null)"
        ></div>
        <div v-else class="sv-static" v-html="slide[f]"></div>
      </div>

      <div
        v-for="s in slide.shapes"
        :key="s.id"
        class="sv-shape"
        :class="[`is-${s.type}`, { sel: editable && s.id === selectedShapeId, editing: editingTextId === s.id }]"
        :style="shapeStyle(s)"
        @mousedown="shapeDown($event, s)"
        @dblclick="shapeDbl($event, s)"
      >
        <div v-if="s.type === 'emoji'" class="sv-emoji" :style="{ fontSize: Math.round(s.h * 0.72) + 'px' }">{{ s.emoji }}</div>
        <div
          v-else-if="s.type === 'text'"
          v-set-text="s.text"
          class="sv-text"
          :style="{ fontSize: (s.fontSize || 22) + 'px' }"
          :contenteditable="editable && editingTextId === s.id"
          spellcheck="false"
          @input="s.text = $event.target.innerText"
          @blur="editingTextId = null"
        ></div>
        <div v-else class="sv-fill" :class="{ round: s.type === 'circle' }" :style="{ background: s.fill }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sv {
  position: relative;
  overflow: hidden;
  flex: none;
  background: #fff;
}
.sv-stage {
  position: relative;
  width: 960px;
  height: 540px;
  transform-origin: top left;
}
.sv-ph {
  position: absolute;
  display: flex;
  flex-direction: column;
  white-space: pre-line;
  word-break: break-word;
  line-height: 1.25;
  border: 1px dashed transparent;
  border-radius: 4px;
}
.sv-ph.ed {
  border-color: rgba(128, 128, 128, 0.35);
}
.sv-ph.ed:hover,
.sv-ph.ed:focus-within {
  border-color: rgba(128, 128, 128, 0.75);
}
.sv-ph-label {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 2px 4px;
  pointer-events: none;
  opacity: 0.8;
}
.sv-ed {
  flex: 1;
  min-height: 1em;
  padding: 2px 4px;
  outline: none;
  white-space: pre-line;
}
.sv-static {
  white-space: pre-line;
  padding: 2px 4px;
}
.sv-shape {
  position: absolute;
}
.editable .sv-shape {
  cursor: move;
}
.sv-shape.editing {
  cursor: text;
}
.sv-shape.sel {
  outline: 1.5px solid #d24726;
  outline-offset: 2px;
}
.sv-fill {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}
.sv-fill.round {
  border-radius: 50%;
}
.sv-emoji {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.sv-text {
  width: 100%;
  height: 100%;
  outline: none;
  white-space: pre-line;
  overflow: hidden;
  line-height: 1.25;
}
</style>
