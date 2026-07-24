<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useSystemStore } from '../stores/system'

const system = useSystemStore()
const menu = computed(() => system.contextMenu)
const ctxEl = ref(null)
const pos = ref({ x: 0, y: 0 })

// macOS context menus never leave the screen: clamp/flip at the viewport edges
watch(menu, async (m) => {
  if (!m) return
  pos.value = { x: m.x, y: m.y }
  await nextTick()
  const el = ctxEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  let { x, y } = pos.value
  if (x + r.width > vw - 6) x = Math.max(6, m.x - r.width) // flip left
  if (y + r.height > vh - 6) y = Math.max(30, m.y - r.height) // flip up (stay under menu bar)
  pos.value = { x, y }
})

function run(item) {
  if (item.disabled) return
  system.contextMenu = null
  item.action?.()
}
</script>

<template>
  <template v-if="menu">
    <div class="backdrop" @pointerdown="system.contextMenu = null" @contextmenu.prevent="system.contextMenu = null"></div>
    <div ref="ctxEl" class="ctx glass-strong" :style="{ left: pos.x + 'px', top: pos.y + 'px' }">
      <template v-for="(item, i) in menu.items" :key="i">
        <div v-if="item.separator" class="sep"></div>
        <button v-else class="item" :class="{ disabled: item.disabled }" @click="run(item)">
          <span class="check">{{ item.checked ? '✓' : '' }}</span>
          {{ item.label }}
        </button>
      </template>
    </div>
  </template>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 8000;
}
.ctx {
  position: fixed;
  z-index: 8001;
  min-width: 210px;
  padding: 5px;
  border-radius: 10px;
  border: 0.5px solid var(--border);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.28);
}
.item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
}
.item .check {
  display: inline-block;
  width: 14px;
  margin-left: -4px;
  color: var(--accent);
  font-weight: 700;
}
.item:hover:not(.disabled) {
  background: var(--accent);
  color: #fff;
}
.item.disabled {
  color: var(--text-dim);
  opacity: 0.6;
}
.sep {
  height: 1px;
  margin: 5px 10px;
  background: var(--border);
}
</style>
