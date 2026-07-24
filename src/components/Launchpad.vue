<script setup>
import { ref, computed } from 'vue'
import { apps } from '../apps'
import { useSystemStore } from '../stores/system'
import { useWindowsStore } from '../stores/windows'
import AppIcon from './AppIcon.vue'

const system = useSystemStore()
const wm = useWindowsStore()
const query = ref('')

const list = computed(() => {
  const all = Object.values(apps).sort((a, b) => a.name.localeCompare(b.name))
  const q = query.value.trim().toLowerCase()
  return q ? all.filter((a) => a.name.toLowerCase().includes(q)) : all
})

function launch(app) {
  system.closeOverlays()
  wm.openApp(app.id)
}
</script>

<template>
  <div v-if="system.launchpadOpen" class="lp" @pointerdown.self="system.launchpadOpen = false">
    <div class="search" @pointerdown.stop>
      <input v-model="query" placeholder="Search" autofocus />
    </div>
    <div class="grid" @pointerdown.self="system.launchpadOpen = false">
      <button v-for="app in list" :key="app.id" class="lp-icon" @click="launch(app)">
        <AppIcon :icon="app.icon" :iconBg="app.iconBg" :size="64" />
        <span class="label">{{ app.name }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.lp {
  position: fixed;
  inset: 0;
  z-index: 6000;
  background: rgba(40, 40, 60, 0.25);
  backdrop-filter: blur(40px) saturate(160%);
  -webkit-backdrop-filter: blur(40px) saturate(160%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 40px;
  animation: lp-in 0.22s ease-out;
}
@keyframes lp-in {
  from {
    opacity: 0;
    transform: scale(1.08);
  }
}
.search input {
  width: 240px;
  padding: 5px 12px;
  border-radius: 8px;
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  outline: none;
  text-align: center;
  font-size: 13px;
}
.search input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}
.grid {
  flex: 1;
  width: 100%;
  max-width: 900px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 26px 10px;
  padding: 40px 60px;
  align-content: start;
  overflow-y: auto;
}
.lp-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.lp-icon:active .tile {
  filter: brightness(0.8);
}
.tile {
  width: 64px;
  height: 64px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  font-size: 34px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}
.label {
  color: #fff;
  font-size: 12px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
</style>
