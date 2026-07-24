<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { apps } from '../apps'
import { useSystemStore } from '../stores/system'
import { useWindowsStore } from '../stores/windows'
import AppIcon from './AppIcon.vue'

const system = useSystemStore()
const wm = useWindowsStore()
const query = ref('')
const selected = ref(0)
const inputEl = ref(null)

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const matched = Object.values(apps)
    .filter((a) => a.name.toLowerCase().includes(q))
    .map((a) => ({ kind: 'app', id: a.id, name: a.name, icon: a.icon }))
  matched.push({ kind: 'web', id: 'web', name: `Search the web for "${query.value.trim()}"`, icon: '🌐' })
  return matched.slice(0, 9)
})

watch(
  () => system.spotlightOpen,
  async (open) => {
    if (open) {
      query.value = ''
      selected.value = 0
      await nextTick()
      inputEl.value?.focus()
    }
  },
)

function pick(item) {
  if (!item) return
  system.closeOverlays()
  if (item.kind === 'app') wm.openApp(item.id)
  else wm.openApp('safari', { props: { query: query.value.trim() } })
}

function onKey(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selected.value = Math.min(selected.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selected.value = Math.max(selected.value - 1, 0)
  } else if (e.key === 'Enter') {
    pick(results.value[selected.value])
  } else if (e.key === 'Escape') {
    system.spotlightOpen = false
  }
}
</script>

<template>
  <div v-if="system.spotlightOpen" class="sp-wrap" @pointerdown.self="system.spotlightOpen = false">
    <div class="sp glass-strong">
      <div class="input-row">
        <span class="mag">🔍</span>
        <input
          ref="inputEl"
          v-model="query"
          class="sp-input"
          placeholder="Spotlight Search"
          @keydown="onKey"
          @input="selected = 0"
        />
      </div>
      <div v-if="results.length" class="results">
        <button
          v-for="(r, i) in results"
          :key="r.kind + r.id + r.name"
          class="result"
          :class="{ sel: i === selected }"
          @pointerenter="selected = i"
          @click="pick(r)"
        >
          <AppIcon :icon="r.icon" :size="18" class="ric" />
          <span>{{ r.name }}</span>
          <span v-if="r.kind === 'app'" class="kind">Application</span>
          <span v-else class="kind">Web</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sp-wrap {
  position: fixed;
  inset: 0;
  z-index: 7500;
  display: flex;
  justify-content: center;
}
.sp {
  margin-top: 22vh;
  width: 640px;
  max-width: 90vw;
  height: fit-content;
  border-radius: 16px;
  border: 0.5px solid var(--border);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  animation: sp-in 0.16s ease-out;
}
@keyframes sp-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
}
.input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
}
.mag {
  font-size: 18px;
  opacity: 0.7;
}
.sp-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 21px;
  font-weight: 300;
}
.results {
  border-top: 0.5px solid var(--border);
  padding: 6px;
  max-height: 320px;
  overflow-y: auto;
}
.result {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 14px;
}
.result.sel {
  background: var(--accent);
  color: #fff;
}
.result.sel .kind {
  color: rgba(255, 255, 255, 0.75);
}
.ric {
  font-size: 17px;
}
.kind {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-dim);
}
</style>
