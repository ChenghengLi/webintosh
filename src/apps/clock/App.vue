<script setup>
import { ref } from 'vue'
import WorldClock from './WorldClock.vue'
import Alarms from './Alarms.vue'
import Stopwatch from './Stopwatch.vue'
import Timers from './Timers.vue'

const props = defineProps({
  tab: { type: String, default: '' },
})

const tabs = [
  { id: 'world', label: 'World Clock' },
  { id: 'alarms', label: 'Alarms' },
  { id: 'stopwatch', label: 'Stopwatch' },
  { id: 'timers', label: 'Timers' },
]

const active = ref(tabs.some(t => t.id === props.tab) ? props.tab : 'world')
</script>

<template>
  <div class="app-root clock">
    <!-- Left sidebar, like the real macOS Clock app -->
    <aside class="sidebar">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="side-item"
        :class="{ sel: active === t.id }"
        @click="active = t.id"
      >
        <svg class="sicon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <template v-if="t.id === 'world'">
            <circle cx="12" cy="12" r="8.5" />
            <ellipse cx="12" cy="12" rx="3.8" ry="8.5" />
            <line x1="3.5" y1="12" x2="20.5" y2="12" />
          </template>
          <template v-else-if="t.id === 'alarms'">
            <circle cx="12" cy="13" r="7" />
            <polyline points="12,9.5 12,13 14.6,14.8" />
            <line x1="5" y1="3.5" x2="7.2" y2="5.7" />
            <line x1="19" y1="3.5" x2="16.8" y2="5.7" />
            <line x1="8.4" y1="19.3" x2="7" y2="21.4" />
            <line x1="15.6" y1="19.3" x2="17" y2="21.4" />
          </template>
          <template v-else-if="t.id === 'stopwatch'">
            <circle cx="12" cy="13.5" r="7" />
            <line x1="12" y1="13.5" x2="12" y2="9.5" />
            <line x1="9.5" y1="3" x2="14.5" y2="3" />
            <line x1="12" y1="3" x2="12" y2="6.5" />
            <line x1="18.6" y1="6.8" x2="17.1" y2="8.3" />
          </template>
          <template v-else>
            <path d="M7 3.5h10l-3.8 8.5 3.8 8.5H7l3.8-8.5z" />
          </template>
        </svg>
        <span class="slabel">{{ t.label }}</span>
      </button>
    </aside>

    <main class="content">
      <WorldClock v-if="active === 'world'" />
      <Alarms v-else-if="active === 'alarms'" />
      <Stopwatch v-else-if="active === 'stopwatch'" />
      <Timers v-else />
    </main>
  </div>
</template>

<style scoped>
/* Theme-aware: the real macOS Clock app follows the system appearance. */
.clock {
  flex-direction: row;
  color: var(--text);
  user-select: none;
  -webkit-user-select: none;
}

.sidebar {
  width: 200px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 10px;
  background: var(--sidebar-bg);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  border-right: 0.5px solid var(--border);
}

.side-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border: none;
  border-radius: 6px;
  background: none;
  font-family: inherit;
  font-size: 13px;
  color: var(--text);
  text-align: left;
  white-space: nowrap;
  cursor: default;
}

.side-item:hover:not(.sel) {
  background: var(--hover);
}

.side-item.sel {
  background: var(--selection);
}

.sicon {
  width: 17px;
  height: 17px;
  flex: none;
}

.content {
  flex: 1;
  min-width: 0;
}
</style>
