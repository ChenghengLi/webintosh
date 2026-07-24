<script setup>
import { ref, computed, watch, provide } from 'vue'
import { apps } from '../apps'
import { useWindowsStore } from '../stores/windows'

const props = defineProps({ win: { type: Object, required: true } })
const wm = useWindowsStore()
provide('windowId', props.win.id)

const meta = apps[props.win.appId]
const resizable = meta?.resizable !== false
const darkChrome = !!meta?.darkChrome
const isActive = computed(() => wm.activeWindow?.id === props.win.id)

// genie-style minimize/restore animation
const anim = ref('')
watch(
  () => props.win.minimized,
  (v) => {
    anim.value = v ? 'min' : 'unmin'
    setTimeout(() => (anim.value = ''), v ? 300 : 260)
  },
)

// green-light hover menu: full screen / split-screen tiling (like macOS)
const tileMenu = ref(false)
let tileTimer
function openTileMenu() {
  clearTimeout(tileTimer)
  tileTimer = setTimeout(() => (tileMenu.value = true), 350)
}
function scheduleTileClose() {
  clearTimeout(tileTimer)
  tileTimer = setTimeout(() => (tileMenu.value = false), 220)
}
function cancelTileClose() {
  clearTimeout(tileTimer)
}
function doFullScreen() {
  tileMenu.value = false
  wm.toggleFullScreen(props.win.id)
}
function doTile(pos) {
  tileMenu.value = false
  wm.tileWindow(props.win.id, pos)
}
function doArrange(mode) {
  tileMenu.value = false
  wm.arrangeWindows(mode)
}

// Tahoe-style layout glyphs for the green-light menu (mini screen with the tiled area filled)
const TILE_ICONS = {
  fill: 'M2 4h20v16H2z',
  left: 'M2 4h9.5v16H2z',
  right: 'M12.5 4H22v16h-9.5z',
  top: 'M2 4h20v8H2z',
  bottom: 'M2 12h20v8H2z',
  tl: 'M2 4h9.5v8H2z',
  tr: 'M12.5 4H22v8h-9.5z',
  bl: 'M2 12h9.5v8H2z',
  br: 'M12.5 12H22v8h-9.5z',
}
function tileIcon(pos) {
  return TILE_ICONS[pos]
}

const style = computed(() => ({
  left: props.win.x + 'px',
  top: props.win.y + 'px',
  width: props.win.width + 'px',
  height: props.win.height + 'px',
  zIndex: props.win.z,
}))

function startDrag(e) {
  if (e.target.closest('.lights') || props.win.maximized || props.win.fullscreen || e.button !== 0) return
  const w = props.win
  const offX = e.clientX - w.x
  const offY = e.clientY - w.y
  const el = e.currentTarget
  el.setPointerCapture(e.pointerId)
  el.onpointermove = (ev) => {
    // macOS edge-tiling: preview a position while dragging near screen edges
    const vw = window.innerWidth
    const vh = window.innerHeight
    const nearL = ev.clientX <= 14
    const nearR = ev.clientX >= vw - 14
    const nearT = ev.clientY <= 34
    const nearB = ev.clientY >= vh - 8
    let pos = null
    if (nearL && nearT) pos = 'tl'
    else if (nearR && nearT) pos = 'tr'
    else if (nearL && nearB) pos = 'bl'
    else if (nearR && nearB) pos = 'br'
    else if (nearT) pos = 'fill'
    else if (nearB) pos = 'bottom'
    else if (nearL) pos = 'left'
    else if (nearR) pos = 'right'
    wm.tilePreview = pos
    wm.updateRect(w.id, {
      x: ev.clientX - offX,
      y: Math.max(28, ev.clientY - offY),
    })
  }
  el.onpointerup = () => {
    el.onpointermove = null
    el.onpointerup = null
    if (wm.tilePreview) {
      wm.tileWindow(w.id, wm.tilePreview)
      wm.tilePreview = null
    }
  }
}

const DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

function startResize(e, dir) {
  if (e.button !== 0) return
  e.stopPropagation()
  const w = props.win
  const sx = e.clientX
  const sy = e.clientY
  const r = { x: w.x, y: w.y, width: w.width, height: w.height }
  const el = e.currentTarget
  el.setPointerCapture(e.pointerId)
  el.onpointermove = (ev) => {
    const dx = ev.clientX - sx
    const dy = ev.clientY - sy
    const rect = { ...r }
    if (dir.includes('e')) rect.width = Math.max(320, r.width + dx)
    if (dir.includes('s')) rect.height = Math.max(200, r.height + dy)
    if (dir.includes('w')) {
      rect.width = Math.max(320, r.width - dx)
      rect.x = r.x + r.width - rect.width
    }
    if (dir.includes('n')) {
      rect.height = Math.max(200, r.height - dy)
      rect.y = r.y + r.height - rect.height
      if (rect.y < 28) {
        rect.y = 28
        rect.height = r.y + r.height - 28
      }
    }
    wm.updateRect(w.id, rect)
  }
  el.onpointerup = () => {
    el.onpointermove = null
    el.onpointerup = null
  }
}
</script>

<template>
  <div
    class="window"
    :class="{
      active: isActive,
      maximized: win.maximized,
      fullscreen: win.fullscreen,
      'dark-chrome': darkChrome,
      closing: win.closing,
      'anim-rect': win.animRect,
      [anim]: !!anim,
    }"
    :style="style"
    v-show="win.space === wm.activeSpace && (!win.minimized || anim === 'min')"
    @pointerdown="wm.focusWindow(win.id)"
  >
    <div v-if="win.fullscreen" class="fs-zone"></div>
    <div class="titlebar" @pointerdown="startDrag" @dblclick="resizable && wm.toggleMaximize(win.id)">
      <div class="lights">
        <button class="light close" @click.stop="wm.closeWindow(win.id)" @pointerdown.stop>
          <span class="glyph">×</span>
        </button>
        <button class="light min" @click.stop="wm.minimizeWindow(win.id)" @pointerdown.stop>
          <span class="glyph">−</span>
        </button>
        <span class="max-wrap" @pointerenter="resizable && openTileMenu()" @pointerleave="scheduleTileClose">
          <button
            class="light max"
            :class="{ off: !resizable }"
            @click.stop="resizable && wm.toggleMaximize(win.id)"
            @pointerdown.stop
          >
            <span class="glyph">+</span>
          </button>
          <span
            v-if="tileMenu && resizable"
            class="tile-menu glass-strong"
            @pointerenter="cancelTileClose"
            @pointerleave="scheduleTileClose"
            @pointerdown.stop
          >
            <span class="tm-label">Move &amp; Resize</span>
            <span class="tm-grid">
              <button v-for="t in [['left','Left'],['right','Right'],['top','Top'],['bottom','Bottom']]" :key="t[0]" class="tm-cell" :title="t[1]" @click.stop="doTile(t[0])">
                <svg viewBox="0 0 24 24" width="30" height="30"><rect x="2" y="4" width="20" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.4" /><path :d="tileIcon(t[0])" fill="currentColor" opacity="0.55" /></svg>
                <span class="tm-cap">{{ t[1] }}</span>
              </button>
            </span>
            <span class="tm-grid">
              <button v-for="t in [['tl','Top Left'],['tr','Top Right'],['bl','Bottom Left'],['br','Bottom Right']]" :key="t[0]" class="tm-cell" :title="t[1]" @click.stop="doTile(t[0])">
                <svg viewBox="0 0 24 24" width="30" height="30"><rect x="2" y="4" width="20" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.4" /><path :d="tileIcon(t[0])" fill="currentColor" opacity="0.55" /></svg>
                <span class="tm-cap">{{ t[1] }}</span>
              </button>
            </span>
            <span class="tm-label">Arrange</span>
            <span class="tm-grid three">
              <button class="tm-cell" title="Left & Right" @click.stop="doArrange('left-right')">
                <svg viewBox="0 0 24 24" width="30" height="30"><rect x="2" y="4" width="9" height="16" rx="1.5" fill="currentColor" opacity="0.8" /><rect x="13" y="4" width="9" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" /></svg>
                <span class="tm-cap">Left &amp; Right</span>
              </button>
              <button class="tm-cell" title="Right & Left" @click.stop="doArrange('right-left')">
                <svg viewBox="0 0 24 24" width="30" height="30"><rect x="2" y="4" width="9" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" /><rect x="13" y="4" width="9" height="16" rx="1.5" fill="currentColor" opacity="0.8" /></svg>
                <span class="tm-cap">Right &amp; Left</span>
              </button>
              <button class="tm-cell" title="Quarters" @click.stop="doArrange('quarters')">
                <svg viewBox="0 0 24 24" width="30" height="30"><rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" opacity="0.55" /><rect x="13" y="3" width="8" height="8" rx="1" fill="currentColor" opacity="0.55" /><rect x="3" y="13" width="8" height="8" rx="1" fill="currentColor" opacity="0.55" /><rect x="13" y="13" width="8" height="8" rx="1" fill="currentColor" opacity="0.55" /></svg>
                <span class="tm-cap">Quarters</span>
              </button>
            </span>
            <span class="tm-sep"></span>
            <span class="tm-rowbtns">
              <button class="tm-rowbtn tm-item" @click.stop="doTile('fill')">
                <svg viewBox="0 0 24 24" width="16" height="16"><rect x="2" y="4" width="20" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5" /><path :d="tileIcon('fill')" fill="currentColor" opacity="0.55" /></svg>
                Fill Screen
              </button>
              <button class="tm-rowbtn tm-item" @click.stop="doFullScreen">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" />
                  <path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
                {{ win.fullscreen ? 'Exit Full Screen' : 'Enter Full Screen' }}
              </button>
            </span>
          </span>
        </span>
      </div>
      <div class="title">{{ win.title }}</div>
    </div>
    <div class="content">
      <component :is="meta.component" v-bind="win.props || {}" v-if="meta" />
    </div>
    <template v-if="resizable && !win.maximized && !win.fullscreen">
      <div v-for="d in DIRS" :key="d" :class="['rz', 'rz-' + d]" @pointerdown="startResize($event, d)"></div>
    </template>
  </div>
</template>

<style scoped>
.window {
  position: absolute;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: var(--window-bg);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  box-shadow: var(--shadow-win);
  overflow: hidden;
  animation: pop 0.16s ease-out;
  transition: box-shadow 0.2s ease;
}
.window.anim-rect {
  transition:
    left 0.28s cubic-bezier(0.32, 0.72, 0.35, 1),
    top 0.28s cubic-bezier(0.32, 0.72, 0.35, 1),
    width 0.28s cubic-bezier(0.32, 0.72, 0.35, 1),
    height 0.28s cubic-bezier(0.32, 0.72, 0.35, 1),
    box-shadow 0.2s ease;
}
.window.closing {
  pointer-events: none;
  animation: win-close 0.17s ease-in forwards;
}
@keyframes win-close {
  to {
    transform: scale(0.97);
    opacity: 0;
  }
}
@keyframes pop {
  from {
    transform: scale(0.96);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
.window.min {
  transform-origin: bottom center;
  animation: genie-in 0.3s ease-in forwards;
}
.window.unmin {
  transform-origin: bottom center;
  animation: genie-out 0.26s ease-out;
}
@keyframes genie-in {
  to {
    transform: translateY(55vh) scale(0.05);
    opacity: 0;
  }
}
@keyframes genie-out {
  from {
    transform: translateY(55vh) scale(0.05);
    opacity: 0;
  }
}
.window:not(.active) {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22), 0 0 0 0.5px var(--border);
}
.window.maximized {
  border-radius: 0;
}
.window.fullscreen {
  border-radius: 0;
}
/* fullscreen: titlebar hides, slides back down when hovering the top edge (real macOS) */
.window.fullscreen .titlebar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 12;
  transform: translateY(-102%);
  transition: transform 0.22s cubic-bezier(0.32, 0.72, 0.35, 1);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
}
.window.fullscreen .fs-zone {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 14px;
  z-index: 13;
}
.window.fullscreen .fs-zone:hover + .titlebar,
.window.fullscreen .titlebar:hover {
  transform: none;
}
.max-wrap {
  position: relative;
  display: flex;
}
.tile-menu {
  position: absolute;
  top: 20px;
  left: -8px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  min-width: 268px;
  padding: 8px;
  border-radius: 12px;
  border: 0.5px solid var(--border);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.3);
  animation: tm-in 0.12s ease-out;
}
@keyframes tm-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
.tm-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 6px;
}
.tm-grid.three {
  grid-template-columns: repeat(3, 1fr);
}
.tm-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 7px 2px 5px;
  border-radius: 8px;
  color: var(--text);
}
.tm-cell:hover {
  background: var(--accent);
  color: #fff;
}
.tm-cap {
  font-size: 10px;
  text-align: center;
  line-height: 1.1;
}
.tm-sep {
  height: 1px;
  margin: 2px 8px 6px;
  background: var(--border);
}
.tm-rowbtns {
  display: flex;
  gap: 6px;
}
.tm-rowbtn {
  flex: 1;
  justify-content: center;
}
.tm-item {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  white-space: nowrap;
}
.tm-icon {
  flex: none;
  opacity: 0.9;
}
.tm-item:hover {
  background: var(--accent);
  color: #fff;
}
.tm-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  padding: 6px 10px 2px;
}
.window.dark-chrome .titlebar {
  background: rgba(42, 42, 46, 0.85);
  border-bottom-color: rgba(255, 255, 255, 0.12);
}
.window.dark-chrome .title {
  color: rgba(255, 255, 255, 0.65);
}
.window.dark-chrome.active .title {
  color: rgba(255, 255, 255, 0.9);
}
.titlebar {
  position: relative;
  flex: none;
  height: 40px;
  display: flex;
  align-items: center;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
  touch-action: none;
}
.lights {
  display: flex;
  gap: 8px;
  padding: 0 12px;
  z-index: 2;
}
.light {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.2);
}
.close {
  background: #ff5f57;
}
.min {
  background: #febc2e;
}
.max {
  background: #28c840;
}
.max.off {
  background: #d7d7d7;
}
.window:not(.active) .light {
  background: #d7d7d7;
}
.glyph {
  font-size: 10px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.55);
  opacity: 0;
  line-height: 1;
  margin-top: -1px;
}
.lights:hover .glyph {
  opacity: 1;
}
.title {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
  pointer-events: none;
}
.window.active .title {
  color: var(--text);
}
.content {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.rz {
  position: absolute;
  z-index: 5;
  touch-action: none;
}
.rz-n {
  top: 0;
  left: 12px;
  right: 12px;
  height: 6px;
  cursor: ns-resize;
}
.rz-s {
  bottom: 0;
  left: 12px;
  right: 12px;
  height: 6px;
  cursor: ns-resize;
}
.rz-e {
  right: 0;
  top: 12px;
  bottom: 12px;
  width: 6px;
  cursor: ew-resize;
}
.rz-w {
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 6px;
  cursor: ew-resize;
}
.rz-ne {
  top: 0;
  right: 0;
  width: 14px;
  height: 14px;
  cursor: nesw-resize;
}
.rz-sw {
  bottom: 0;
  left: 0;
  width: 14px;
  height: 14px;
  cursor: nesw-resize;
}
.rz-nw {
  top: 0;
  left: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}
.rz-se {
  bottom: 0;
  right: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}
</style>
