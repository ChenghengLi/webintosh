<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useSystemStore } from '../stores/system'
import { useWindowsStore } from '../stores/windows'
import MenuBar from './MenuBar.vue'
import Dock from './Dock.vue'
import WindowFrame from './WindowFrame.vue'
import Launchpad from './Launchpad.vue'
import Spotlight from './Spotlight.vue'
import ControlCenter from './ControlCenter.vue'
import NotificationCenter from './NotificationCenter.vue'
import ContextMenu from './ContextMenu.vue'
import MissionControl from './MissionControl.vue'
import AppIcon from './AppIcon.vue'
import { makeDir, listDir, readFile, writeFile, moveToTrash, rename, fileIconImg } from '../fs'
import { tileRectFor } from '../stores/windows'
import { computed } from 'vue'

const system = useSystemStore()
const wm = useWindowsStore()

// Desktop mirrors the real /Users/guest/Desktop folder (like macOS)
const DESKTOP = '/Users/guest/Desktop'
const desktopIcons = computed(() => [
  { icon: '/icons/hd.png', label: 'Macintosh HD', type: 'volume', path: '/', fixed: true },
  ...(listDir(DESKTOP) || []).map((e) => ({
    icon: fileIconImg(e.name, e.type),
    label: e.name,
    type: e.type,
    path: `${DESKTOP}/${e.name}`,
    fixed: false,
  })),
])
const selected = ref(null)

// ---- desktop icon layout: drag to rearrange on a snap grid (like macOS) ----
const CELL_W = 96
const CELL_H = 104
const TOP = 36
const RIGHT = 14
const maxRow = () => Math.max(1, Math.floor((window.innerHeight - TOP - 116) / CELL_H))

const positions = ref(JSON.parse(localStorage.getItem('macos-web:desktop-icons') || '{}'))
function savePositions() {
  localStorage.setItem('macos-web:desktop-icons', JSON.stringify(positions.value))
}

// inline rename (macOS: New Folder appears selected with its name in edit mode)
const renaming = ref(null) // { path, value }
let renameCommitted = false
function startRename(icon) {
  if (icon.fixed) return
  renaming.value = { path: icon.path, value: icon.label }
  selected.value = laidOutIcons.value.findIndex((i) => i.path === icon.path)
  renameCommitted = false
}
function commitRename() {
  if (!renaming.value || renameCommitted) return
  renameCommitted = true
  const { path, value } = renaming.value
  const name = value.trim()
  if (name && name !== path.slice(path.lastIndexOf('/') + 1)) rename(path, name)
  renaming.value = null
}
function cancelRename() {
  renameCommitted = true
  renaming.value = null
}
const vFocusRename = {
  mounted: (el) => {
    el.focus()
    el.select()
  },
}

// sort modes for the desktop (macOS: Sort By ▸)
const sortMode = ref('none') // 'none' | 'name' | 'kind'

const laidOutIcons = computed(() => {
  let source = desktopIcons.value
  if (sortMode.value === 'name') {
    source = [source[0], ...source.slice(1).sort((a, b) => a.label.localeCompare(b.label))]
  } else if (sortMode.value === 'kind') {
    source = [source[0], ...source.slice(1).sort((a, b) => (a.type === b.type ? a.label.localeCompare(b.label) : a.type === 'dir' ? -1 : 1))]
  }
  const icons = source.map((ic) => ({
    ...ic,
    pos: positions.value[ic.path] ? { ...positions.value[ic.path] } : null,
    drag: null,
    suppress: false,
  }))
  const used = new Set()
  icons.forEach((ic) => ic.pos && used.add(ic.pos.col + ':' + ic.pos.row))
  let col = 0
  let row = 0
  for (const ic of icons) {
    if (ic.pos) continue
    while (used.has(col + ':' + row)) {
      row++
      if (row > maxRow()) {
        row = 0
        col++
      }
    }
    ic.pos = { col, row }
    used.add(col + ':' + row)
    row++
  }
  return icons
})

function cellXY(pos) {
  return {
    x: window.innerWidth - RIGHT - (pos.col + 1) * CELL_W,
    y: TOP + pos.row * CELL_H,
  }
}
function iconStyle(ic) {
  if (ic.drag) return { left: ic.drag.x + 'px', top: ic.drag.y + 'px', zIndex: 50 }
  const { x, y } = cellXY(ic.pos)
  return { left: x + 'px', top: y + 'px' }
}
function cellFromPoint(clientX, clientY) {
  const col = Math.max(0, Math.round((window.innerWidth - RIGHT - clientX) / CELL_W - 0.5))
  const row = Math.min(maxRow(), Math.max(0, Math.round((clientY - TOP) / CELL_H - 0.5)))
  return { col, row }
}

function startIconDrag(e, ic) {
  if (e.button !== 0) return
  const el = e.currentTarget
  const orig = { ...ic.pos }
  const startX = e.clientX
  const startY = e.clientY
  let moved = false
  el.setPointerCapture(e.pointerId)
  el.onpointermove = (ev) => {
    if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 5) moved = true
    if (moved) {
      ic.drag = { x: ev.clientX - CELL_W / 2, y: ev.clientY - 24 }
      ic.suppress = true
    }
  }
  el.onpointerup = (ev) => {
    el.onpointermove = null
    el.onpointerup = null
    ic.drag = null
    if (!moved) return
    setTimeout(() => (ic.suppress = false), 0)
    const target = cellFromPoint(ev.clientX, ev.clientY)
    if (target.col === orig.col && target.row === orig.row) return
    const other = laidOutIcons.value.find(
      (o) => o !== ic && o.pos.col === target.col && o.pos.row === target.row,
    )
    if (other) positions.value = { ...positions.value, [other.path]: orig, [ic.path]: target }
    else positions.value = { ...positions.value, [ic.path]: target }
    savePositions()
  }
}

function cleanUpDesktop() {
  positions.value = {}
  sortMode.value = 'none'
  savePositions()
}

// brief slide animation when switching spaces
const spaceSlide = ref('')
watch(
  () => wm.activeSpace,
  () => {
    spaceSlide.value = wm.spaceDir > 0 ? 'slide-left' : wm.spaceDir < 0 ? 'slide-right' : ''
    if (spaceSlide.value) setTimeout(() => (spaceSlide.value = ''), 320)
  },
)

// translucent tiling preview frame shown while edge-dragging a window
const tilePreviewStyle = computed(() => {
  if (!wm.tilePreview) return null
  const r = tileRectFor(wm.tilePreview, window.innerWidth, window.innerHeight)
  return { left: r.x + 'px', top: r.y + 'px', width: r.width + 'px', height: r.height + 'px' }
})

function openDesktopIcon(icon) {
  if (icon.fixed || icon.type === 'dir') wm.openApp('finder', { props: { path: icon.path } })
  else wm.openApp('vscode', { props: { openPath: icon.path } })
}

function duplicateIcon(icon) {
  if (icon.type === 'dir') {
    makeDir(`${icon.path} copy`)
  } else {
    const content = readFile(icon.path)
    if (content !== null) {
      const dot = icon.label.lastIndexOf('.')
      const name = dot > 0 ? `${icon.label.slice(0, dot)} copy.${icon.label.slice(dot + 1)}` : `${icon.label} copy`
      writeFile(`${DESKTOP}/${name}`, content)
    }
  }
}

const iconInfo = ref(null)
function iconMenu(e, icon) {
  selected.value = laidOutIcons.value.findIndex((i) => i.path === icon.path)
  const info = () =>
    (iconInfo.value = { icon, x: Math.min(e.clientX, window.innerWidth - 280), y: e.clientY })
  if (icon.fixed) {
    system.openContextMenu(e.clientX, e.clientY, [
      { label: 'Open', action: () => openDesktopIcon(icon) },
      { separator: true },
      { label: 'Get Info', action: info },
    ])
    return
  }
  system.openContextMenu(e.clientX, e.clientY, [
    { label: 'Open', action: () => openDesktopIcon(icon) },
    { separator: true },
    { label: 'Get Info', action: info },
    { separator: true },
    { label: 'Rename', action: () => startRename(icon) },
    { label: 'Copy', action: () => (system.fileClipboard = { path: icon.path, name: icon.label, type: icon.type, cut: false }) },
    { label: 'Duplicate', action: () => duplicateIcon(icon) },
    { label: 'Move to Trash', action: () => moveToTrash(icon.path) },
  ])
}

function pasteToDesktop() {
  const clip = system.fileClipboard
  if (!clip) return
  if (clip.type === 'file') {
    const content = readFile(clip.path)
    if (content !== null) writeFile(`${DESKTOP}/${clip.name}`, content)
  } else {
    makeDir(`${DESKTOP}/${clip.name}`)
  }
}

// macOS: New Folder appears selected with its name ready to edit
function newFolder() {
  const base = '/Users/guest/Desktop'
  const names = (listDir(base) || []).map((e) => e.name)
  let name = 'untitled folder'
  let i = 2
  while (names.includes(name)) name = `untitled folder ${i++}`
  makeDir(`${base}/${name}`)
  startRename({ path: `${base}/${name}`, label: name })
}

function onContextMenu(e) {
  system.openContextMenu(e.clientX, e.clientY, [
    { label: 'New Folder', action: newFolder },
    { label: 'Paste', action: pasteToDesktop, disabled: !system.fileClipboard },
    { label: 'Get Info', disabled: true },
    { separator: true },
    { label: 'Clean Up', action: cleanUpDesktop },
    { label: 'Sort By Name', checked: sortMode === 'name', action: () => (sortMode.value = 'name') },
    { label: 'Sort By Kind', checked: sortMode === 'kind', action: () => (sortMode.value = 'kind') },
    { separator: true },
    { label: 'Change Wallpaper…', action: () => wm.openApp('settings', { props: { section: 'Wallpaper' } }) },
    { label: system.dark ? 'Use Light Mode' : 'Use Dark Mode', action: () => system.toggleDark() },
    { separator: true },
    { label: 'System Settings…', action: () => wm.openApp('settings') },
  ])
}

function onKey(e) {
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.code === 'Space') {
    e.preventDefault()
    system.toggleOverlay('spotlightOpen')
  } else if (e.ctrlKey && !e.metaKey && e.key === 'ArrowUp') {
    e.preventDefault()
    system.toggleOverlay('missionControlOpen')
  } else if (e.ctrlKey && !e.metaKey && e.key === 'ArrowLeft') {
    e.preventDefault()
    wm.nextSpace(-1)
  } else if (e.ctrlKey && !e.metaKey && e.key === 'ArrowRight') {
    e.preventDefault()
    wm.nextSpace(1)
  } else if (e.ctrlKey && e.metaKey && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault()
    if (wm.activeWindow) wm.toggleMaximize(wm.activeWindow.id)
  } else if (e.metaKey && e.key === ',') {
    e.preventDefault()
    wm.openApp('settings')
  } else if (e.key === 'Escape') {
    system.closeOverlays()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  system.hydrate() // child mounts before App.vue's hydrate — ensure persisted state is loaded first
  const q = new URLSearchParams(location.search).get('open')
  if (q) q.split(',').forEach((id) => wm.openApp(id.trim()))
  else system.loginItems.forEach((id) => wm.openApp(id))
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="desktop">
    <div
      class="wallpaper"
      :style="{ background: system.wallpaper.css, filter: `brightness(${system.brightness}%)` }"
      @pointerdown="system.closeOverlays()"
      @contextmenu.prevent="onContextMenu"
    ></div>

    <div class="icons">
      <div
        v-for="(icon, i) in laidOutIcons"
        :key="icon.path"
        class="dicon"
        :class="{ sel: selected === i, dragging: !!icon.drag }"
        :style="iconStyle(icon)"
        @pointerdown="startIconDrag($event, icon)"
        @click="!icon.suppress && (selected = i)"
        @dblclick="!icon.suppress && openDesktopIcon(icon)"
        @contextmenu.prevent.stop="iconMenu($event, icon)"
      >
        <span class="glyph"><AppIcon :icon="icon.icon" :size="56" /></span>
        <input
          v-if="renaming && renaming.path === icon.path"
          class="name rename"
          v-model="renaming.value"
          v-focus-rename
          @keydown.enter.prevent="commitRename"
          @keydown.esc.stop="cancelRename"
          @blur="commitRename"
          @click.stop
          @dblclick.stop
          @contextmenu.stop
        />
        <span v-else class="name">{{ icon.label }}</span>
      </div>
    </div>

    <div class="windows-layer" :class="spaceSlide">
      <WindowFrame v-for="w in wm.windows" :key="w.id" :win="w" />
    </div>

    <div v-if="tilePreviewStyle" class="tile-preview" :style="tilePreviewStyle"></div>

    <template v-if="iconInfo">
      <div class="info-backdrop" @pointerdown="iconInfo = null" @contextmenu.prevent="iconInfo = null"></div>
      <div class="icon-info glass-strong" :style="{ left: iconInfo.x + 'px', top: iconInfo.y + 'px' }">
        <button class="info-close" @click="iconInfo = null">✕</button>
        <AppIcon :icon="iconInfo.icon.icon" :size="64" />
        <div class="info-name">{{ iconInfo.icon.label }}</div>
        <div class="info-row"><span>Kind</span>{{ iconInfo.icon.type === 'volume' ? 'Volume' : iconInfo.icon.type === 'dir' ? 'Folder' : 'Document' }}</div>
        <div class="info-row"><span>Path</span>{{ iconInfo.icon.path }}</div>
      </div>
    </template>

    <MenuBar />
    <Dock />
    <Launchpad />
    <Spotlight />
    <ControlCenter />
    <NotificationCenter />
    <MissionControl />
    <ContextMenu />
  </div>
</template>

<style scoped>
.desktop {
  position: fixed;
  inset: 0;
  overflow: hidden;
}
.wallpaper {
  position: absolute;
  inset: 0;
  background-size: cover;
  transition: filter 0.2s;
}
.icons {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.dicon {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 92px;
  padding: 4px 0 2px;
  border-radius: 8px;
  pointer-events: auto;
  touch-action: none;
}
.dicon.dragging {
  opacity: 0.85;
  z-index: 50;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
}
.dicon .glyph {
  font-size: 40px;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
}
.dicon .name {
  font-size: 12px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  padding: 1px 6px;
  border-radius: 5px;
  max-width: 92px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dicon.sel .name {
  background: rgba(10, 132, 255, 0.75);
}
.name.rename {
  background: #fff;
  color: #000;
  border: 2px solid var(--accent);
  border-radius: 5px;
  font-size: 12px;
  text-align: center;
  width: 92px;
  outline: none;
  padding: 1px 2px;
  user-select: text;
  -webkit-user-select: text;
}
.windows-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.windows-layer.slide-left {
  animation: space-left 0.3s cubic-bezier(0.32, 0.72, 0.35, 1);
}
.windows-layer.slide-right {
  animation: space-right 0.3s cubic-bezier(0.32, 0.72, 0.35, 1);
}
@keyframes space-left {
  from {
    transform: translateX(60px);
    opacity: 0.4;
  }
}
@keyframes space-right {
  from {
    transform: translateX(-60px);
    opacity: 0.4;
  }
}
.windows-layer > * {
  pointer-events: auto;
}
.tile-preview {
  position: fixed;
  z-index: 9000;
  background: rgba(255, 255, 255, 0.28);
  border: 2px solid rgba(255, 255, 255, 0.65);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  transition: all 0.12s ease-out;
  animation: tp-in 0.15s ease-out;
}
@keyframes tp-in {
  from {
    opacity: 0;
  }
}
.info-backdrop {
  position: fixed;
  inset: 0;
  z-index: 7800;
}
.icon-info {
  position: fixed;
  z-index: 7801;
  width: 260px;
  padding: 18px 14px 12px;
  border-radius: 12px;
  border: 0.5px solid var(--border);
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.info-close {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(128, 128, 128, 0.25);
  font-size: 10px;
  display: grid;
  place-items: center;
}
.info-name {
  font-weight: 700;
  font-size: 15px;
}
.info-row {
  width: 100%;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.info-row span {
  color: var(--text-dim);
}
</style>
