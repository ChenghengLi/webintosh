<script setup>
import { computed } from 'vue'
import { useSystemStore } from '../stores/system'

const system = useSystemStore()
const now = new Date()
const weekday = now.toLocaleDateString('en-US', { weekday: 'long' })
const month = now.toLocaleDateString('en-US', { month: 'long' })
const day = now.getDate()
</script>

<template>
  <div v-if="system.notificationsOpen">
    <div class="backdrop" @pointerdown="system.notificationsOpen = false"></div>
    <div class="nc glass-strong">
      <div class="date">
        <div class="wd">{{ weekday }}</div>
        <div class="md">{{ month }} {{ day }}</div>
      </div>
      <div class="empty">No New Notifications</div>
      <div class="widget">
        <div class="wtitle">Focus</div>
        <button class="dnd" :class="{ on: system.focus }" @click="system.focus = !system.focus">
          <svg
            class="moon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
          {{ system.focus ? 'Do Not Disturb is on' : 'Do Not Disturb is off' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 7000;
}
.nc {
  position: fixed;
  top: 36px;
  right: 10px;
  bottom: 12px;
  width: 320px;
  z-index: 7001;
  border-radius: 16px;
  border: 0.5px solid var(--border);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.3);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  animation: nc-in 0.22s cubic-bezier(0.32, 0.72, 0.35, 1);
}
@keyframes nc-in {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
}
.date .wd {
  font-size: 22px;
  font-weight: 700;
}
.date .md {
  font-size: 15px;
  color: var(--text-dim);
}
.empty {
  color: var(--text-dim);
  text-align: center;
  padding: 30px 0;
}
.widget {
  background: rgba(128, 128, 128, 0.12);
  border-radius: 14px;
  padding: 12px;
}
.wtitle {
  font-weight: 700;
  margin-bottom: 8px;
}
.dnd {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.15);
}
.dnd .moon {
  vertical-align: -2px;
  margin-right: 3px;
}
.dnd.on {
  background: rgba(94, 92, 230, 0.35);
}
</style>
