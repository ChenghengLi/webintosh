<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apps } from '../apps'
import { useSystemStore } from '../stores/system'
import { useWindowsStore } from '../stores/windows'

const system = useSystemStore()
const wm = useWindowsStore()

const openMenu = ref(null)
const menuLeft = ref(0)
const wifiMenu = ref(false)
const menuPeek = ref(false)

// in fullscreen the menu bar hides and only reappears when hovering the top edge (real macOS)
const barHidden = computed(
  () =>
    wm.fullscreenActive &&
    !menuPeek.value &&
    !openMenu.value &&
    !wifiMenu.value &&
    !system.controlCenterOpen &&
    !system.notificationsOpen &&
    !system.spotlightOpen,
)
const now = ref(new Date())
let timer
onMounted(() => (timer = setInterval(() => (now.value = new Date()), 1000)))
onUnmounted(() => clearInterval(timer))

const activeApp = computed(() => apps[wm.activeAppId])
const activeName = computed(() => activeApp.value?.name || 'Finder')

function sleep() {
  wm.closeAll()
  system.closeOverlays()
  system.booting = true
}

const menuDefs = computed(() => {
  const active = wm.activeWindow
  const name = activeName.value
  return {
    apple: [
      { label: 'About This Mac', action: () => wm.openApp('settings', { props: { section: 'About' } }) },
      { separator: true },
      { label: 'System Settings…', action: () => wm.openApp('settings') },
      { label: 'App Store…', action: () => wm.openApp('appstore') },
      { separator: true },
      { label: 'Force Quit…', shortcut: '⌥⌘⎋', disabled: true },
      { separator: true },
      { label: 'Sleep', action: sleep },
      { label: 'Restart…', action: sleep },
      { label: 'Shut Down…', action: sleep },
      { separator: true },
      { label: 'Lock Screen', shortcut: '⌃⌘Q', action: sleep },
    ],
    app: [
      { label: `About ${name}`, action: () => wm.openApp('settings', { props: { section: 'About' } }) },
      { separator: true },
      { label: 'Settings…', shortcut: '⌘,', disabled: true },
      { separator: true },
      { label: `Hide ${name}`, shortcut: '⌘H', action: () => active && wm.minimizeWindow(active.id), disabled: !active },
      { separator: true },
      { label: `Quit ${name}`, shortcut: '⌘Q', action: () => wm.quitApp(wm.activeAppId), disabled: !active },
    ],
    File: [
      { label: 'New Window', shortcut: '⌘N', action: () => wm.openApp(wm.activeAppId), disabled: !active },
      { label: 'Close Window', shortcut: '⌘W', action: () => active && wm.closeWindow(active.id), disabled: !active },
    ],
    Edit: [
      { label: 'Undo', shortcut: '⌘Z', disabled: true },
      { label: 'Redo', shortcut: '⇧⌘Z', disabled: true },
      { separator: true },
      { label: 'Cut', shortcut: '⌘X', disabled: true },
      { label: 'Copy', shortcut: '⌘C', disabled: true },
      { label: 'Paste', shortcut: '⌘V', disabled: true },
      { label: 'Select All', shortcut: '⌘A', disabled: true },
    ],
    View: [
      {
        label: active?.maximized || active?.fullscreen ? 'Exit Full Screen' : 'Enter Full Screen',
        shortcut: '⌃⌘F',
        action: () => active && wm.toggleMaximize(active.id),
        disabled: !active,
      },
      { separator: true },
      { label: 'Mission Control', shortcut: '⌃↑', action: () => system.toggleOverlay('missionControlOpen') },
      { label: system.dark ? 'Use Light Mode' : 'Use Dark Mode', shortcut: '', action: () => system.toggleDark() },
    ],
    Window: [
      { label: 'Minimize', shortcut: '⌘M', action: () => active && wm.minimizeWindow(active.id), disabled: !active },
      { label: 'Zoom', action: () => active && wm.toggleMaximize(active.id), disabled: !active },
      { separator: true },
      ...wm.windows.map((w) => ({
        label: w.title,
        checked: active?.id === w.id,
        action: () => wm.focusWindow(w.id),
      })),
    ],
    Help: [{ label: `${name} Help`, disabled: true }],
  }
})

const barItems = computed(() => [
  { key: 'apple', icon: true },
  { key: 'app', label: activeName.value, bold: true },
  { key: 'File', label: 'File' },
  { key: 'Edit', label: 'Edit' },
  { key: 'View', label: 'View' },
  { key: 'Window', label: 'Window' },
  { key: 'Help', label: 'Help' },
])

function toggleMenu(key, e) {
  if (openMenu.value === key) {
    openMenu.value = null
    return
  }
  openMenu.value = key
  menuLeft.value = e.currentTarget.getBoundingClientRect().left
}
function hoverMenu(key, e) {
  if (!openMenu.value || openMenu.value === key) return
  openMenu.value = key
  menuLeft.value = e.currentTarget.getBoundingClientRect().left
}

function run(item) {
  if (item.disabled) return
  openMenu.value = null
  item.action?.()
}

const windowWidth = ref(window.innerWidth)

const clock = computed(() => {
  const d = now.value
  const wd = d.toLocaleDateString('en-US', { weekday: 'short' })
  const mon = d.toLocaleDateString('en-US', { month: 'short' })
  const m = String(d.getMinutes()).padStart(2, '0')
  if (system.use24h) {
    return `${wd} ${mon} ${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${m}`
  }
  const h = d.getHours() % 12 || 12
  const ap = d.getHours() < 12 ? 'AM' : 'PM'
  return `${wd} ${mon} ${d.getDate()}  ${h}:${m} ${ap}`
})

// status items (right side)
const inputMenu = ref(false)
const siriOpen = ref(false)
const currentGlyph = computed(() => system.inputSources.find((s) => s.id === system.inputSource)?.glyph || 'EN')
function pickSource(id) {
  inputMenu.value = false
  system.setInputSource(id)
}
</script>

<template>
  <div v-if="wm.fullscreenActive" class="menu-edge" @pointerenter="menuPeek = true"></div>
  <div class="menubar glass" :class="{ 'bar-hidden': barHidden }" @pointerleave="menuPeek = false">
    <div class="left">
      <button
        v-for="item in barItems"
        :key="item.key"
        class="mb-item"
        :class="{ bold: item.bold, open: openMenu === item.key }"
        @click.stop="toggleMenu(item.key, $event)"
        @pointerenter="hoverMenu(item.key, $event)"
      >
        <svg v-if="item.icon" width="14" height="14" viewBox="0 0 384 512" fill="currentColor">
          <path
            d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
          />
        </svg>
        <template v-else>{{ item.label }}</template>
      </button>
    </div>
    <div class="right">
      <button class="mb-item status" :class="{ open: system.controlCenterOpen, dim: !system.bluetooth }" @click.stop="system.toggleOverlay('controlCenterOpen')" title="Bluetooth">
        <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor">
          <path d="M196.8 169.6L141.33 128l55.47-41.6a8 8 0 0 0 0-12.8l-64-48A8 8 0 0 0 120 32v80L68.8 73.6a8 8 0 0 0-9.6 12.8l55.47 41.6l-55.47 41.6a8 8 0 1 0 9.6 12.8L120 144v80a8 8 0 0 0 12.8 6.4l64-48a8 8 0 0 0 0-12.8M136 48l42.67 32L136 112Zm0 160v-64l42.67 32Z" />
        </svg>
      </button>
      <button class="mb-item status" :class="{ focusOn: system.focus }" @click.stop="system.focus = !system.focus" title="Focus (Do Not Disturb)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
      <span class="mb-item status" title="Battery">
        <span class="pct">{{ system.battery }}%</span>
        <span class="battery"><span class="level" :style="{ width: system.battery + '%' }"></span></span>
      </span>
      <button class="mb-item status input-src" :class="{ open: inputMenu }" @click.stop="inputMenu = !inputMenu" title="Input Source">
        <span class="src-glyph">{{ currentGlyph }}</span>
      </button>
      <button class="mb-item status" :class="{ open: wifiMenu }" @click.stop="wifiMenu = !wifiMenu" title="Wi-Fi">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M5 12.5a10 10 0 0 1 14 0" />
          <path d="M8.5 15.8a5.5 5.5 0 0 1 7 0" />
          <circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button class="mb-item status" :class="{ open: system.spotlightOpen }" @click.stop="system.toggleOverlay('spotlightOpen')" title="Spotlight">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 21 21" />
        </svg>
      </button>
      <button class="mb-item status siri" :class="{ open: siriOpen }" @click.stop="siriOpen = !siriOpen" title="Siri">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" fill="url(#siriGrad)" />
          <path d="M12 7.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
          <circle cx="12" cy="12" r="1.2" fill="#fff" />
          <defs>
            <radialGradient id="siriGrad" cx="35%" cy="30%">
              <stop offset="0%" stop-color="#ff5fa2" />
              <stop offset="45%" stop-color="#a05cf7" />
              <stop offset="100%" stop-color="#3b7bff" />
            </radialGradient>
          </defs>
        </svg>
      </button>
      <button class="mb-item status" :class="{ open: system.controlCenterOpen }" @click.stop="system.toggleOverlay('controlCenterOpen')" title="Control Center">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="4" width="20" height="6.5" rx="3.25" opacity="0.45" />
          <rect x="2" y="13.5" width="20" height="6.5" rx="3.25" opacity="0.45" />
          <circle cx="9" cy="7.25" r="2.4" />
          <circle cx="15" cy="16.75" r="2.4" />
        </svg>
      </button>
      <button class="mb-item status clock" :class="{ open: system.notificationsOpen }" @click.stop="system.toggleOverlay('notificationsOpen')">{{ clock }}</button>
    </div>
  </div>

  <template v-if="openMenu">
    <div class="menu-backdrop" @pointerdown="openMenu = null" @contextmenu.prevent="openMenu = null"></div>
    <div class="dropdown glass-strong" :style="{ left: Math.min(menuLeft, windowWidth - 260) + 'px' }">
      <template v-for="(item, i) in menuDefs[openMenu]" :key="i">
        <div v-if="item.separator" class="sep"></div>
        <button v-else class="row" :class="{ disabled: item.disabled }" @click="run(item)">
          <span class="check">{{ item.checked ? '✓' : '' }}</span>
          <span class="lbl">{{ item.label }}</span>
          <span class="sc">{{ item.shortcut || '' }}</span>
        </button>
      </template>
    </div>
  </template>

  <template v-if="inputMenu">
    <div class="menu-backdrop" @pointerdown="inputMenu = false"></div>
    <div class="dropdown glass-strong input-panel">
      <div class="src-title">Input Sources</div>
      <button v-for="s in system.inputSources" :key="s.id" class="row" @click="pickSource(s.id)">
        <span class="check">{{ s.id === system.inputSource ? '✓' : '' }}</span>
        <span class="src-badge">{{ s.glyph }}</span>
        <span class="lbl">{{ s.name }}</span>
      </button>
    </div>
  </template>

  <template v-if="siriOpen">
    <div class="menu-backdrop" @pointerdown="siriOpen = false"></div>
    <div class="siri-panel glass-strong">
      <div class="siri-orb"></div>
      <div class="siri-q">What can I help you with?</div>
      <div class="siri-a">Try "Open Safari", "Play some music", or "Turn on Dark Mode"</div>
    </div>
  </template>

  <template v-if="wifiMenu">
    <div class="menu-backdrop" @pointerdown="wifiMenu = false"></div>
    <div class="dropdown glass-strong wifi-panel">
      <div class="row wrow" @click="system.wifi = !system.wifi">
        <span class="lbl"><b>Wi-Fi</b></span>
        <span class="switch" :class="{ on: system.wifi }"><span class="knob"></span></span>
      </div>
      <div class="sep"></div>
      <template v-if="system.wifi">
        <button
          v-for="n in system.wifiNetworks"
          :key="n"
          class="row"
          @click="system.joinNetwork(n)"
        >
          <span class="check">{{ n === system.wifiNetwork ? '✓' : '' }}</span>
          <span class="lbl">{{ n }}</span>
          <span class="sc">🔒</span>
        </button>
        <div class="sep"></div>
      </template>
      <button
        class="row"
        @click="wifiMenu = false; wm.openApp('settings', { props: { section: 'Wi-Fi' } })"
      >
        <span class="check"></span>
        <span class="lbl">Network Settings…</span>
      </button>
    </div>
  </template>
</template>

<style scoped>
.menubar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 28px;
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  font-size: 13px;
  box-shadow: 0 0.5px 0 var(--border);
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0.35, 1);
}
.menubar.bar-hidden {
  transform: translateY(-102%);
}
.menu-edge {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  z-index: 4999;
}
.left,
.right {
  display: flex;
  align-items: center;
}
.mb-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 5px;
  line-height: 1.4;
}
.mb-item.bold {
  font-weight: 700;
}
.mb-item.open,
.mb-item:active {
  background: var(--hover);
}
.status {
  padding: 2px 6px;
}
.battery {
  width: 22px;
  height: 11px;
  border: 1px solid currentColor;
  border-radius: 3px;
  padding: 1px;
  display: flex;
  opacity: 0.9;
}
.battery .level {
  background: currentColor;
  border-radius: 1px;
}
.pct {
  font-size: 12px;
}
.clock {
  font-variant-numeric: tabular-nums;
}
.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 5001;
}
.dropdown {
  position: fixed;
  top: 30px;
  z-index: 5002;
  min-width: 240px;
  padding: 5px;
  border-radius: 10px;
  border: 0.5px solid var(--border);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.3);
}
.row {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
}
.row:hover:not(.disabled) {
  background: var(--accent);
  color: #fff;
}
.row.disabled {
  color: var(--text-dim);
  opacity: 0.55;
}
.check {
  width: 16px;
  flex: none;
}
.lbl {
  flex: 1;
  text-align: left;
}
.sc {
  color: var(--text-dim);
  font-size: 12px;
}
.row:hover:not(.disabled) .sc {
  color: rgba(255, 255, 255, 0.8);
}
.sep {
  height: 1px;
  margin: 5px 12px;
  background: var(--border);
}
.wifi-panel {
  right: 10px;
  left: auto !important;
  top: 30px;
  min-width: 250px;
}
.wrow {
  cursor: default;
}
.wrow .lbl {
  font-size: 13px;
}
.switch {
  width: 38px;
  height: 22px;
  border-radius: 11px;
  background: rgba(128, 128, 128, 0.35);
  position: relative;
  transition: background 0.18s;
  flex: none;
}
.switch.on {
  background: #34c759;
}
.switch .knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.18s;
}
.switch.on .knob {
  transform: translateX(16px);
}
.mb-item.dim {
  opacity: 0.5;
}
.mb-item.focusOn {
  color: #5e5ce6;
}
.input-src .src-glyph {
  display: grid;
  place-items: center;
  min-width: 19px;
  height: 19px;
  padding: 0 3px;
  border-radius: 5px;
  background: rgba(128, 128, 128, 0.3);
  font-size: 11px;
  font-weight: 700;
}
.input-panel {
  right: 10px;
  left: auto !important;
  top: 30px;
  min-width: 250px;
}
.src-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  padding: 4px 10px 6px;
}
.src-badge {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.25);
  font-size: 11px;
  font-weight: 700;
  flex: none;
}
.siri-panel {
  position: fixed;
  top: 60px;
  right: 12px;
  z-index: 5002;
  width: 290px;
  padding: 22px 18px;
  border-radius: 18px;
  border: 0.5px solid var(--border);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  animation: siri-in 0.25s cubic-bezier(0.32, 0.72, 0.35, 1);
}
@keyframes siri-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
}
.siri-orb {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff5fa2, #a05cf7 45%, #3b7bff);
  box-shadow: 0 0 24px rgba(160, 92, 247, 0.55);
  animation: orb-pulse 2.4s ease-in-out infinite;
}
@keyframes orb-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
}
.siri-q {
  font-size: 15px;
  font-weight: 600;
}
.siri-a {
  font-size: 12px;
  color: var(--text-dim);
  text-align: center;
}
</style>

