<script setup>
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { useWindowsStore } from '../../stores/windows'
import {
  state, togglePlay, stepFrame, pause, goStart, splitAtPlayhead,
  rippleDelete, removeClip, importVideo, selectedClip,
} from './state'
import Icon from './Icon.vue'
import MediaPool from './MediaPool.vue'
import Viewer from './Viewer.vue'
import Inspector from './Inspector.vue'
import Transport from './Transport.vue'
import Timeline from './Timeline.vue'
import ColorPage from './ColorPage.vue'

const windows = useWindowsStore()
const windowId = inject('windowId', null)

const PAGES = [
  { name: 'Media', icon: 'page-media' },
  { name: 'Cut', icon: 'page-cut' },
  { name: 'Edit', icon: 'page-edit' },
  { name: 'Fusion', icon: 'page-fusion' },
  { name: 'Color', icon: 'page-color' },
  { name: 'Fairlight', icon: 'page-fairlight' },
  { name: 'Deliver', icon: 'page-deliver' },
]

/* --------------------------- menu strip --------------------------- */

const openMenu = ref(null)

function closeWindow() {
  pause()
  if (windowId) windows.closeWindow(windowId)
}

const MENUS = {
  File: () => [
    { label: 'Import Media…', icon: 'import', action: () => importVideo() },
    { separator: true },
    { label: 'Save Project', icon: 'save', disabled: true },
    { label: 'Export Project…', icon: 'export', disabled: true },
    { separator: true },
    { label: 'Close Window', icon: 'close', action: closeWindow },
  ],
  Edit: () => [
    { label: 'Split at Playhead', icon: 'scissors', disabled: !selectedClip.value, action: () => splitAtPlayhead(selectedClip.value) },
    { label: 'Ripple Delete', icon: 'ripple', disabled: !selectedClip.value, action: () => rippleDelete(selectedClip.value) },
    { label: 'Delete', icon: 'trash', disabled: !selectedClip.value, action: () => removeClip(selectedClip.value) },
    { separator: true },
    { label: 'Deselect All', icon: 'deselect', action: () => (state.selectedClipId = null) },
  ],
  Timeline: () => [
    { label: 'Go to Start', icon: 'skip-start', action: goStart },
    { label: 'Zoom In', icon: 'zoom-in', action: () => (state.pxPerSec = Math.min(160, state.pxPerSec + 20)) },
    { label: 'Zoom Out', icon: 'zoom-out', action: () => (state.pxPerSec = Math.max(20, state.pxPerSec - 20)) },
  ],
  Playback: () => [
    { label: state.playing ? 'Pause' : 'Play', icon: state.playing ? 'pause' : 'play', action: togglePlay },
    { label: 'Stop', icon: 'stop', action: () => { pause(); goStart() } },
    { separator: true },
    { label: 'Loop', icon: 'loop', checked: state.loop, action: () => (state.loop = !state.loop) },
    { separator: true },
    { label: 'Step Frame Forward', icon: 'step-forward', action: () => stepFrame(1) },
    { label: 'Step Frame Backward', icon: 'step-back', action: () => stepFrame(-1) },
  ],
}

const menuItems = ref([])

function toggleMenu(name, e) {
  e.stopPropagation()
  if (openMenu.value === name) {
    openMenu.value = null
    menuItems.value = []
    return
  }
  openMenu.value = name
  menuItems.value = MENUS[name]()
}

function runItem(item) {
  if (item.disabled) return
  openMenu.value = null
  item.action?.()
}

function closeMenus() {
  openMenu.value = null
}

/* --------------------------- keyboard --------------------------- */

function onKey(e) {
  if (windows.activeAppId !== 'resolve') return
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (e.code === 'Space') {
    e.preventDefault()
    togglePlay()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    stepFrame(-1)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    stepFrame(1)
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  pause()
})
</script>

<template>
  <div class="app-root resolve" @click="closeMenus" @contextmenu="closeMenus">
    <!-- top menu strip -->
    <div class="menu-strip" @click.stop>
      <img src="/icons/resolve.svg" class="strip-logo" alt="" draggable="false" />
      <span class="strip-title">DaVinci Resolve</span>
      <div v-for="name in Object.keys(MENUS)" :key="name" class="menu-wrap">
        <button class="menu-btn" :class="{ open: openMenu === name }" @click="toggleMenu(name, $event)">
          {{ name }}
        </button>
        <div v-if="openMenu === name" class="dropdown" @click.stop>
          <template v-for="(item, i) in menuItems" :key="i">
            <div v-if="item.separator" class="dd-sep" />
            <button v-else class="dd-item" :disabled="item.disabled" @click="runItem(item)">
              <Icon :name="item.icon" :size="13" class="dd-ico" />
              <span class="dd-label">{{ item.label }}</span>
              <Icon v-if="item.checked" name="check" :size="11" class="dd-check" />
            </button>
          </template>
        </div>
      </div>
      <span class="strip-project">Untitled Project 1</span>
    </div>

    <template v-if="state.page === 'Edit'">
      <!-- upper section: media pool / viewer / inspector -->
      <div class="upper">
        <MediaPool class="pool-pane" />
        <Viewer class="viewer-pane" />
        <Inspector class="inspector-pane" />
      </div>
      <Transport />
      <Timeline class="timeline-pane" />
    </template>

    <!-- Color page: live grading on the program video -->
    <ColorPage v-else-if="state.page === 'Color'" />

    <!-- other Resolve pages -->
    <div v-else class="coming-soon">
      <Icon
        :name="PAGES.find(p => p.name === state.page)?.icon || 'film'"
        :size="42" class="cs-icon"
      />
      <div class="cs-title">{{ state.page }}</div>
      <div class="cs-sub">The {{ state.page }} page is coming soon to this studio.</div>
      <button class="cs-btn" @click="state.page = 'Edit'">Back to Edit</button>
    </div>

    <!-- page tabs -->
    <div class="page-tabs">
      <button
        v-for="p in PAGES"
        :key="p.name"
        class="tab"
        :class="{ active: state.page === p.name }"
        @click.stop="state.page = p.name"
      >
        <span class="tab-icon"><Icon :name="p.icon" :size="15" /></span>
        <span class="tab-name">{{ p.name }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.resolve {
  --panel: #1e1e21;
  --panel-2: #232327;
  --edge: #28282c;
  --edge-2: #343439;
  --txt: #d8d8dc;
  --dim: #8a8a90;
  --orange: #e8862e;
  background: #161618;
  color: var(--txt);
  font-size: 12px;
  user-select: none;
  overflow: hidden;
}

/* menu strip */
.menu-strip {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 30px;
  padding: 0 10px;
  background: var(--panel);
  border-bottom: 1px solid var(--edge);
  flex: none;
}
.strip-logo {
  width: 17px;
  height: 17px;
  margin-right: 6px;
}
.strip-title {
  font-weight: 600;
  font-size: 12px;
  margin-right: 12px;
  color: #ececf0;
}
.strip-project {
  margin-left: auto;
  color: var(--dim);
  font-size: 11px;
}
.menu-wrap {
  position: relative;
}
.menu-btn {
  background: none;
  border: none;
  color: var(--txt);
  font-size: 12px;
  padding: 4px 9px;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
}
.menu-btn:hover,
.menu-btn.open {
  background: var(--edge-2);
}
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 190px;
  background: #2b2b30;
  border: 1px solid #45454c;
  border-radius: 8px;
  padding: 4px;
  z-index: 200;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
}
.dd-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--txt);
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
}
.dd-ico {
  opacity: 0.85;
}
.dd-label {
  flex: 1;
  min-width: 0;
}
.dd-item:hover:not(:disabled) {
  background: var(--orange);
  color: #17130c;
}
.dd-item:disabled {
  color: #60606a;
  cursor: default;
}
.dd-sep {
  height: 1px;
  background: #45454c;
  margin: 4px 8px;
}

/* upper panes */
.upper {
  flex: 1 1 46%;
  min-height: 0;
  display: flex;
  border-bottom: 1px solid var(--edge);
}
.pool-pane {
  width: 240px;
  flex: none;
  border-right: 1px solid var(--edge);
}
.viewer-pane {
  flex: 1;
  min-width: 0;
}
.inspector-pane {
  width: 250px;
  flex: none;
  border-left: 1px solid var(--edge);
}
.timeline-pane {
  flex: 1 1 40%;
  min-height: 190px;
}

/* coming soon */
.coming-soon {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--dim);
}
.cs-icon {
  color: #4c4c54;
}
.cs-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--txt);
}
.cs-sub {
  font-size: 12px;
}
.cs-btn {
  margin-top: 10px;
  background: var(--orange);
  color: #17130c;
  border: none;
  border-radius: 7px;
  padding: 6px 16px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

/* page tabs */
.page-tabs {
  flex: none;
  display: flex;
  justify-content: center;
  gap: 2px;
  background: var(--panel);
  border-top: 1px solid var(--edge);
  padding: 3px 8px;
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 64px;
  padding: 4px 6px 3px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--dim);
  cursor: pointer;
  font-family: inherit;
}
.tab:hover {
  color: var(--txt);
}
.tab.active {
  color: var(--orange);
  border-bottom-color: var(--orange);
}
.tab-icon {
  display: flex;
  line-height: 1;
}
.tab-name {
  font-size: 10px;
}
</style>
