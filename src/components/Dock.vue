<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { apps } from '../apps'
import { useSystemStore, DOCK_DEFAULT } from '../stores/system'
import { useWindowsStore } from '../stores/windows'
import AppIcon from './AppIcon.vue'
import { trashCount, emptyTrash, moveToTrash, TRASH } from '../fs'

const system = useSystemStore()
const wm = useWindowsStore()

const DOCK_ORDER = DOCK_DEFAULT

const items = computed(() => {
  const ids = DOCK_ORDER.filter((id) => !system.dockHidden.includes(id))
  for (const id of system.dockExtraPinned) if (!ids.includes(id)) ids.push(id)
  const list = []
  for (const id of ids) {
    if (id === 'launchpad') {
      list.push({ id: 'launchpad', name: 'Launchpad', icon: '/icons/launchpad.png', iconBg: '' })
      continue
    }
    if (apps[id]) list.push(apps[id])
  }
  return list
})

const bouncing = ref(new Set())
const dockPeek = ref(false)

// running apps that aren't pinned appear on the right side of the Dock (like macOS)
const runningExtras = computed(() =>
  wm.openAppIds
    .filter((id) => !DOCK_ORDER.includes(id))
    .map((id) => apps[id])
    .filter(Boolean),
)

// the Dock shrinks its icons to fit everything on screen (like macOS),
// measured from the real rendered width so it can never overflow
const viewportW = ref(window.innerWidth)
const dockEl = ref(null)
const iconSize = ref(56)
watch(
  [items, runningExtras, viewportW],
  async () => {
    iconSize.value = 56
    await nextTick()
    const el = dockEl.value
    if (!el) return
    const available = window.innerWidth - 24
    if (el.scrollWidth > available) {
      // gaps/padding/separators don't shrink — subtract them before sizing icons
      const n = items.value.length + runningExtras.value.length + 1 // +1 = Trash
      const fixed = el.scrollWidth - n * 56
      const size = Math.floor((available - fixed) / n)
      iconSize.value = Math.max(18, Math.min(56, size))
    }
  },
  { immediate: true, flush: 'post' },
)
const dockGap = computed(() => (iconSize.value < 48 ? '5px' : '6px'))

// macOS-style dock icon menu: Open / Keep in Dock / Open at Login / Show in Finder / Hide / Quit
function iconMenu(e, app) {
  const running = wm.openAppIds.includes(app.id)
  const pinned =
    !system.dockHidden.includes(app.id) &&
    (DOCK_ORDER.includes(app.id) || system.dockExtraPinned.includes(app.id))
  system.openContextMenu(e.clientX, e.clientY, [
    { label: 'Open', action: () => click(app) },
    { separator: true },
    { label: 'Keep in Dock', checked: pinned, action: () => system.toggleDockPin(app.id) },
    {
      label: 'Open at Login',
      checked: system.loginItems.includes(app.id),
      action: () => system.toggleLoginItem(app.id),
    },
    { label: 'Show in Finder', action: () => wm.openApp('finder', { props: { path: '/Applications' } }) },
    { separator: true },
    {
      label: 'Hide',
      disabled: !running,
      action: () => wm.windows.filter((w) => w.appId === app.id).forEach((w) => wm.minimizeWindow(w.id)),
    },
    { label: 'Quit', disabled: !running, action: () => wm.quitApp(app.id) },
  ])
}

const trashFull = computed(() => trashCount() > 0)

function onResize() {
  viewportW.value = window.innerWidth
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

function trashMenu(e) {
  system.openContextMenu(e.clientX, e.clientY, [
    { label: 'Open', action: () => wm.openApp('finder', { props: { path: TRASH } }) },
    { label: 'Empty Trash…', disabled: !trashFull.value, action: () => emptyTrash() },
  ])
}

// Dock drop targets: drag a file onto an app icon to open it, onto Trash to delete it
const dropTarget = ref(null)
function acceptsDrop(appId) {
  return appId === 'vscode' || appId === 'textedit' || appId === 'trash'
}
function onIconDragOver(e, appId) {
  if (!acceptsDrop(appId) || !e.dataTransfer.types.includes('text/plain')) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dropTarget.value = appId
}
function onIconDrop(e, appId) {
  dropTarget.value = null
  const path = e.dataTransfer.getData('text/plain')
  if (!path.startsWith('/')) return
  if (appId === 'trash') moveToTrash(path)
  else wm.openApp(appId, { props: { openPath: path } })
}

function click(app) {
  if (app.id === 'launchpad') {
    system.toggleOverlay('launchpadOpen')
    return
  }
  bouncing.value = new Set([...bouncing.value, app.id])
  setTimeout(() => {
    const s = new Set(bouncing.value)
    s.delete(app.id)
    bouncing.value = s
  }, 700)
  system.closeOverlays()
  wm.openApp(app.id)
}
</script>

<template>
  <div class="dock-wrap" :class="{ 'auto-hidden': wm.fullscreenActive && !dockPeek }">
    <div v-if="wm.fullscreenActive" class="dock-edge" @pointerenter="dockPeek = true"></div>
    <div ref="dockEl" class="dock glass" :style="{ gap: dockGap, padding: iconSize < 48 ? '5px 7px' : '7px 9px' }" @pointerleave="dockPeek = false">
      <div v-for="app in items" :key="app.id" class="dock-item">
        <span class="tip">{{ app.name }}</span>
        <button
          class="icon"
          :class="{ bouncing: bouncing.has(app.id), 'drop-hi': dropTarget === app.id }"
          @click="click(app)"
          @contextmenu.prevent="app.id !== 'launchpad' && iconMenu($event, app)"
          @dragover="onIconDragOver($event, app.id)"
          @dragleave="dropTarget === app.id && (dropTarget = null)"
          @drop.prevent="onIconDrop($event, app.id)"
        >
          <AppIcon :icon="app.icon" :iconBg="app.iconBg" :size="iconSize" :pad="app.iconPad" :scale="app.iconScale || 1" />
        </button>
        <span v-if="wm.openAppIds.includes(app.id)" class="dot"></span>
      </div>
      <template v-if="runningExtras.length">
        <div class="separator"></div>
        <div v-for="app in runningExtras" :key="app.id" class="dock-item">
          <span class="tip">{{ app.name }}</span>
          <button
            class="icon"
            :class="{ bouncing: bouncing.has(app.id), 'drop-hi': dropTarget === app.id }"
            @click="click(app)"
            @contextmenu.prevent="iconMenu($event, app)"
            @dragover="onIconDragOver($event, app.id)"
            @dragleave="dropTarget === app.id && (dropTarget = null)"
            @drop.prevent="onIconDrop($event, app.id)"
          >
            <AppIcon :icon="app.icon" :iconBg="app.iconBg" :size="iconSize" :pad="app.iconPad" :scale="app.iconScale || 1" />
          </button>
          <span class="dot"></span>
        </div>
      </template>
      <div class="separator"></div>
      <div class="dock-item">
        <span class="tip">Trash</span>
        <button
          class="icon trash"
          :class="{ 'drop-hi': dropTarget === 'trash' }"
          @click="wm.openApp('finder', { props: { path: TRASH } })"
          @contextmenu.prevent="trashMenu"
          @dragover="onIconDragOver($event, 'trash')"
          @dragleave="dropTarget === 'trash' && (dropTarget = null)"
          @drop.prevent="onIconDrop($event, 'trash')"
        >
          <AppIcon :icon="trashFull ? '/icons/trash-full.png' : '/icons/trash.png'" :size="iconSize" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dock-wrap {
  position: fixed;
  bottom: 10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 5500;
  pointer-events: none;
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0.35, 1);
}
.dock-wrap.auto-hidden {
  transform: translateY(calc(100% + 16px));
  pointer-events: none;
}
.dock-wrap.auto-hidden .dock-edge {
  pointer-events: auto;
}
.dock-edge {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
}
.dock {
  pointer-events: auto;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 24px;
  border: 0.5px solid var(--border);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28);
}
.dock-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.icon {
  display: grid;
  place-items: center;
  transform-origin: bottom center;
  transition: transform 0.12s ease-out;
}
.icon:active {
  filter: brightness(0.75);
}
.icon.drop-hi {
  outline: 2.5px solid var(--accent);
  outline-offset: 2px;
  border-radius: 13px;
}
.bouncing {
  animation: bounce 0.65s ease;
}
@keyframes bounce {
  0%,
  100% {
    translate: 0 0;
  }
  40% {
    translate: 0 -34px;
  }
  70% {
    translate: 0 -8px;
  }
}
.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text);
  opacity: 0.8;
  margin-top: 3px;
}
.separator {
  width: 1px;
  align-self: stretch;
  margin: 4px 2px;
  background: var(--border);
}
.tip {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  translate: -50% 0;
  background: var(--glass-strong);
  backdrop-filter: blur(20px);
  color: var(--text);
  padding: 3px 10px;
  border-radius: 7px;
  font-size: 13px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  border: 0.5px solid var(--border);
  transition: opacity 0.12s ease;
}
.dock-item:hover .tip {
  opacity: 1;
}
</style>
