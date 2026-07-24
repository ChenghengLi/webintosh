<script setup>
import { computed, ref } from 'vue'
import { HOME, getNode, listDir } from '@/fs.js'

const props = defineProps({ startPath: { type: String, default: HOME } })
const emit = defineEmits(['select', 'close'])

// Navigable directory listing of the virtual FS (folders only).
const cwd = ref(getNode(props.startPath)?.type === 'dir' ? props.startPath : HOME)

const dirs = computed(() => (listDir(cwd.value) || []).filter((i) => i.type === 'dir'))
const parentPath = computed(() => {
  if (cwd.value === '/') return null
  const i = cwd.value.lastIndexOf('/')
  return i <= 0 ? '/' : cwd.value.slice(0, i)
})

function enter(name) {
  cwd.value = (cwd.value === '/' ? '' : cwd.value) + '/' + name
}
function pick() {
  emit('select', cwd.value)
}
</script>

<template>
  <div class="picker-overlay" @click.self="emit('close')" @contextmenu.stop>
    <div class="picker">
      <div class="picker-title">Open Folder</div>
      <div class="picker-path" :title="cwd">{{ cwd }}</div>
      <div class="picker-list">
        <div v-if="parentPath" class="picker-row" @click="cwd = parentPath">
          <span class="picker-icon">📁</span><span>..</span>
        </div>
        <div v-for="d in dirs" :key="d.name" class="picker-row" @click="enter(d.name)">
          <span class="picker-icon">📁</span><span>{{ d.name }}</span>
        </div>
        <div v-if="!dirs.length" class="picker-empty">No subfolders</div>
      </div>
      <div class="picker-footer">
        <button class="btn" @click="emit('close')">Cancel</button>
        <button class="btn primary" @click="pick">Select This Folder</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker-overlay {
  position: absolute; inset: 0; z-index: 60;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: flex-start; justify-content: center; padding-top: 56px;
}
.picker {
  width: 440px; max-width: 90%; overflow: hidden;
  background: #252526; border: 1px solid #3c3c3c; border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}
.picker-title { padding: 12px 16px 8px; font-size: 13px; font-weight: 600; color: #e8e8e8; }
.picker-path {
  margin: 0 16px 8px; padding: 5px 8px; background: #3c3c3c; border-radius: 4px;
  font-size: 12px; color: #9cdcfe; font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.picker-list { max-height: 260px; overflow-y: auto; padding: 4px 8px 8px; }
.picker-row {
  display: flex; align-items: center; gap: 8px; padding: 5px 8px;
  border-radius: 4px; cursor: pointer; font-size: 12.5px; color: #d4d4d4; user-select: none;
}
.picker-row:hover { background: #2a2d2e; }
.picker-icon { font-size: 13px; }
.picker-empty { padding: 8px; font-size: 12px; color: #858585; text-align: center; }
.picker-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid #3c3c3c;
}
.btn {
  background: #3c3c3c; color: #e8e8e8; border: none;
  padding: 5px 12px; font-size: 12px; border-radius: 4px; cursor: pointer;
}
.btn:hover { background: #4b4b4b; }
.btn.primary { background: #0e639c; color: #ffffff; }
.btn.primary:hover { background: #1177bb; }
</style>
