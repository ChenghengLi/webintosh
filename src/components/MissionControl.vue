<script setup>
import { apps } from '../apps'
import { useSystemStore } from '../stores/system'
import { useWindowsStore } from '../stores/windows'
import AppIcon from './AppIcon.vue'

const system = useSystemStore()
const wm = useWindowsStore()

function focus(win) {
  wm.focusWindow(win.id)
  system.missionControlOpen = false
}

// space thumbnails render as miniature screens with scaled window figures (like real MC)
const THUMB_W = 148
const THUMB_H = 88
function miniWins(spaceId) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  return wm.windows
    .filter((w) => w.space === spaceId && !w.minimized)
    .map((w) => ({
      id: w.id,
      style: {
        left: w.x * (THUMB_W / vw) + 'px',
        top: w.y * (THUMB_H / vh) + 'px',
        width: Math.max(8, w.width * (THUMB_W / vw)) + 'px',
        height: Math.max(6, w.height * (THUMB_H / vh)) + 'px',
        zIndex: w.z,
      },
    }))
}

function pickSpace(id) {
  wm.switchSpace(id)
  system.missionControlOpen = false
}

function addSpace() {
  wm.addSpace()
}
</script>

<template>
  <div v-if="system.missionControlOpen" class="mc" @pointerdown.self="system.missionControlOpen = false">
    <div class="spaces">
      <button
        v-for="s in wm.spaces"
        :key="s"
        class="space-thumb"
        :class="{ active: wm.activeSpace === s }"
        :style="{ background: system.wallpaper.css }"
        @click.stop="pickSpace(s)"
      >
        <span class="space-name">Desktop {{ s }}</span>
        <span class="mini-screen">
          <span v-for="m in miniWins(s)" :key="m.id" class="mini-win" :style="m.style"></span>
        </span>
      </button>
      <button class="space-add" title="Add Space" @click.stop="addSpace">＋</button>
    </div>

    <div class="wins" @pointerdown.self="system.missionControlOpen = false">
      <button v-for="w in wm.spaceWindows" :key="w.id" class="mc-win" @click.stop="focus(w)">
        <span class="mc-titlebar">
          <AppIcon :icon="apps[w.appId]?.icon || ''" :size="14" />
          <span class="mc-title">{{ w.title }}</span>
        </span>
        <span class="mc-body">
          <AppIcon :icon="apps[w.appId]?.icon || ''" :size="56" />
        </span>
      </button>
      <div v-if="!wm.spaceWindows.length" class="empty">No windows on this space</div>
    </div>
  </div>
</template>

<style scoped>
.mc {
  position: fixed;
  inset: 0;
  z-index: 6500;
  background: rgba(30, 30, 45, 0.45);
  backdrop-filter: blur(28px) saturate(150%);
  -webkit-backdrop-filter: blur(28px) saturate(150%);
  display: flex;
  flex-direction: column;
  animation: fadein 0.18s ease;
}
@keyframes fadein {
  from {
    opacity: 0;
    transform: scale(1.03);
  }
}
.mc-win {
  animation: mcwin-in 0.22s ease-out;
}
@keyframes mcwin-in {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
}
.spaces {
  display: flex;
  gap: 10px;
  padding: 14px 18px 8px;
  align-items: flex-start;
}
.space-thumb {
  width: 148px;
  height: 88px;
  border-radius: 8px;
  background-size: cover;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
}
.space-thumb.active {
  border-color: rgba(255, 255, 255, 0.9);
}
.space-name {
  position: absolute;
  top: 5px;
  left: 7px;
  color: #fff;
  font-size: 11px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  z-index: 9999;
}
.mini-screen {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 6px;
}
.mini-win {
  position: absolute;
  background: rgba(246, 246, 248, 0.92);
  border: 0.5px solid rgba(0, 0, 0, 0.25);
  border-radius: 1.5px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
.space-add {
  width: 40px;
  height: 88px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 24px;
  border: 1px dashed rgba(255, 255, 255, 0.35);
}
.space-add:hover {
  background: rgba(255, 255, 255, 0.22);
}
.wins {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  align-content: center;
  justify-content: center;
  padding: 30px 60px;
}
.mc-win {
  width: 300px;
  height: 200px;
  border-radius: 10px;
  background: var(--window-bg);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.12s ease;
}
.mc-win:hover {
  transform: scale(1.04);
  outline: 2px solid rgba(255, 255, 255, 0.7);
}
.mc-titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
  font-size: 12px;
}
.mc-title {
  color: var(--text);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mc-body {
  flex: 1;
  display: grid;
  place-items: center;
}
.empty {
  color: rgba(255, 255, 255, 0.75);
  font-size: 16px;
}
</style>
