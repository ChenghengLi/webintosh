<script setup>
// Floating Quick Look panel: a centered preview of a single entry inside the
// Finder window. Closes on the ✕ button, Esc, or a click on the backdrop.
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { getNode, listDir, readFile, fileIconImg } from '../../fs'
import { kindLabel } from './actions'

const props = defineProps({
  path: { type: String, required: true },
})
const emit = defineEmits(['close'])

const TEXT_EXTS = ['txt', 'md', 'js', 'css']
const PREVIEW_CHARS = 400

const node = computed(() => getNode(props.path))
const name = computed(() => props.path.split('/').filter(Boolean).pop() || 'Macintosh HD')
const isDir = computed(() => node.value?.type === 'dir')
const icon = computed(() => fileIconImg(name.value, isDir.value ? 'dir' : 'file'))

const isText = computed(() => {
  if (isDir.value || !name.value.includes('.')) return false
  return TEXT_EXTS.includes(name.value.split('.').pop().toLowerCase())
})
const content = computed(() => (node.value?.type === 'file' ? readFile(props.path) ?? '' : ''))
const preview = computed(() => content.value.slice(0, PREVIEW_CHARS))
const truncated = computed(() => content.value.length > PREVIEW_CHARS)

const subtitle = computed(() => {
  if (isDir.value) {
    const n = (listDir(props.path) || []).length
    return `${n} ${n === 1 ? 'item' : 'items'}`
  }
  return `${kindLabel(name.value, 'file')} · ${content.value.length} bytes`
})

function onKey(e) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
  }
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<template>
  <div class="ql-backdrop" @click.self="$emit('close')" @contextmenu.prevent>
    <div class="ql-panel glass-strong" @contextmenu.prevent>
      <button class="ql-close" title="Close" @click="$emit('close')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <img class="ql-icon" :src="icon" :alt="name" draggable="false" />
      <div class="ql-name">{{ name }}</div>
      <div class="ql-sub">{{ subtitle }}</div>
      <pre v-if="isText" class="ql-text">{{ preview }}{{ truncated ? '…' : '' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.ql-backdrop {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ql-panel {
  position: relative;
  width: 360px;
  max-width: calc(100% - 32px);
  max-height: calc(100% - 32px);
  overflow-y: auto;
  padding: 22px 16px 16px;
  border-radius: 14px;
  border: 0.5px solid var(--border);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
  color: var(--text);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.ql-close {
  position: absolute;
  top: 10px;
  right: 10px;
  border: none;
  background: transparent;
  color: var(--text-dim);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ql-close svg {
  width: 10px;
  height: 10px;
  display: block;
}
.ql-close:hover {
  background: var(--hover);
  color: var(--text);
}
.ql-icon {
  width: 96px;
  height: 96px;
  object-fit: contain;
  pointer-events: none;
}
.ql-name {
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  word-break: break-word;
}
.ql-sub {
  color: var(--text-dim);
  font-size: 12px;
}
.ql-text {
  margin: 8px 0 0;
  width: 100%;
  box-sizing: border-box;
  max-height: 180px;
  overflow-y: auto;
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11.5px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}
</style>
