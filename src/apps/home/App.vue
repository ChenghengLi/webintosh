<script setup>
import { ref, computed, watch } from 'vue'

const STORE_KEY = 'macos-web:home'

const FAN_SPEEDS = ['Off', 'Low', 'Medium', 'High']

// --- state model -----------------------------------------------------------
// accessory: { id, type, name, on?, temp?, locked?, speed? (0-3), open? (0-100) }
function seedHome() {
  return [
    {
      id: 'living',
      name: 'Living Room',
      accessories: [
        { id: 'lr-light', type: 'light', name: 'Ceiling Light', on: true },
        { id: 'lr-lamp', type: 'light', name: 'Floor Lamp', on: false },
        { id: 'lr-tv', type: 'tv', name: 'Apple TV', on: false },
        { id: 'lr-blinds', type: 'blinds', name: 'Blinds', open: 60 },
      ],
    },
    {
      id: 'bedroom',
      name: 'Bedroom',
      accessories: [
        { id: 'br-light', type: 'light', name: 'Bedside Lamp', on: false },
        { id: 'br-thermo', type: 'thermostat', name: 'Thermostat', temp: 21 },
        { id: 'br-fan', type: 'fan', name: 'Ceiling Fan', speed: 0 },
      ],
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      accessories: [
        { id: 'kt-light', type: 'light', name: 'Counter Light', on: true },
        { id: 'kt-blinds', type: 'blinds', name: 'Window Blinds', open: 100 },
      ],
    },
    {
      id: 'office',
      name: 'Office',
      accessories: [
        { id: 'of-light', type: 'light', name: 'Desk Lamp', on: false },
        { id: 'of-lock', type: 'lock', name: 'Door Lock', locked: true },
        { id: 'of-fan', type: 'fan', name: 'Desk Fan', speed: 0 },
      ],
    },
  ]
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Array.isArray(data.rooms)) return null
    return data.rooms.filter((r) => r && Array.isArray(r.accessories))
  } catch {
    return null
  }
}

const rooms = ref(loadState() || seedHome())
const editingId = ref(null) // tile with an open slider (thermostat / blinds)

watch(
  rooms,
  (val) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ rooms: val }))
    } catch {
      /* storage full — ignore */
    }
  },
  { deep: true }
)

// --- helpers ---------------------------------------------------------------
function eachAccessory(fn) {
  rooms.value.forEach((room) => room.accessories.forEach(fn))
}

function isOn(acc) {
  switch (acc.type) {
    case 'light':
    case 'tv':
      return !!acc.on
    case 'fan':
      return acc.speed > 0
    case 'lock':
      return !acc.locked
    case 'blinds':
      return acc.open > 0
    default:
      return false
  }
}

function stateText(acc) {
  switch (acc.type) {
    case 'light':
    case 'tv':
      return acc.on ? 'On' : 'Off'
    case 'thermostat':
      return `${acc.temp}°`
    case 'lock':
      return acc.locked ? 'Locked' : 'Unlocked'
    case 'fan':
      return FAN_SPEEDS[acc.speed] || 'Off'
    case 'blinds':
      return acc.open > 0 ? `${acc.open}% Open` : 'Closed'
    default:
      return ''
  }
}

const onCount = computed(() => {
  let n = 0
  eachAccessory((a) => {
    if (isOn(a)) n += 1
  })
  return n
})

const statusSummary = computed(() => {
  const n = onCount.value
  if (n === 0) return 'All accessories off'
  return `${n} accessor${n === 1 ? 'y' : 'ies'} on`
})

// --- interactions ----------------------------------------------------------
function tileClick(acc) {
  if (acc.type === 'thermostat' || acc.type === 'blinds') {
    editingId.value = editingId.value === acc.id ? null : acc.id
    return
  }
  editingId.value = null
  if (acc.type === 'light' || acc.type === 'tv') acc.on = !acc.on
  else if (acc.type === 'lock') acc.locked = !acc.locked
  else if (acc.type === 'fan') acc.speed = (acc.speed + 1) % FAN_SPEEDS.length
}

function adjust(acc, value) {
  const v = Math.round(Number(value))
  if (acc.type === 'thermostat') acc.temp = Math.min(30, Math.max(10, v))
  else if (acc.type === 'blinds') acc.open = Math.min(100, Math.max(0, v))
}

// --- scenes ----------------------------------------------------------------
const SCENES = [
  { id: 'morning', name: 'Good Morning' },
  { id: 'movie', name: 'Movie Night' },
  { id: 'night', name: 'Good Night' },
]

function applyScene(id) {
  eachAccessory((a) => {
    if (id === 'morning') {
      if (a.type === 'light') a.on = true
      else if (a.type === 'blinds') a.open = 100
      else if (a.type === 'thermostat') a.temp = 22
      else if (a.type === 'tv') a.on = false
      else if (a.type === 'lock') a.locked = false
      else if (a.type === 'fan') a.speed = 0
    } else if (id === 'movie') {
      if (a.type === 'light') a.on = a.id === 'lr-lamp'
      else if (a.type === 'blinds') a.open = 0
      else if (a.type === 'tv') a.on = a.id === 'lr-tv'
      else if (a.type === 'fan') a.speed = 0
    } else if (id === 'night') {
      if (a.type === 'light') a.on = false
      else if (a.type === 'blinds') a.open = 0
      else if (a.type === 'thermostat') a.temp = 19
      else if (a.type === 'tv') a.on = false
      else if (a.type === 'lock') a.locked = true
      else if (a.type === 'fan') a.speed = 0
    }
  })
  editingId.value = null
}

// --- toast -----------------------------------------------------------------
const toast = ref(null)
let toastTimer = null

function runScene(scene) {
  applyScene(scene.id)
  toast.value = `Running “${scene.name}”…`
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = `“${scene.name}” complete`
    toastTimer = setTimeout(() => (toast.value = null), 1400)
  }, 900)
}
</script>

<template>
  <div class="app-root home" @click.self="editingId = null">
    <!-- Header -->
    <header class="home-header">
      <div class="home-title-row">
        <span class="home-glyph">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 11.2 12 4l8 7.2" />
            <path d="M6.2 9.6V20h11.6V9.6" />
            <path d="M10 20v-5.6h4V20" />
          </svg>
        </span>
        <div>
          <h1>My Home</h1>
          <p class="status">{{ statusSummary }}</p>
        </div>
      </div>
    </header>

    <!-- Scenes -->
    <div class="scenes">
      <button v-for="s in SCENES" :key="s.id" class="scene glass" @click="runScene(s)">
        <span class="scene-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <!-- sunrise -->
            <template v-if="s.id === 'morning'">
              <path d="M3.5 18.5h17" />
              <path d="M7.5 18.5a4.5 4.5 0 0 1 9 0" />
              <path d="M12 8.5v1.6 M6.4 10.4l1.2 1.2 M17.6 10.4l-1.2 1.2" />
              <path d="M12 2.8v2.6 M10.3 4.6 12 2.9l1.7 1.7" />
            </template>
            <!-- film clapper -->
            <template v-else-if="s.id === 'movie'">
              <path d="M4 10.5h16a.8.8 0 0 1 .8.8V19a1.5 1.5 0 0 1-1.5 1.5H4.7A1.5 1.5 0 0 1 3.2 19v-7.7a.8.8 0 0 1 .8-.8z" />
              <path d="M4 10.5l.6-5.1 16.3 1.4-.6 3.7z" />
              <path d="M8 10.2l.5-4.6 M12.5 10.2l.5-4.6 M17 10.2l.5-4.6" />
            </template>
            <!-- moon -->
            <template v-else>
              <path d="M20.2 13.8A8.2 8.2 0 1 1 10.2 3.8a6.6 6.6 0 0 0 10 10z" />
            </template>
          </svg>
        </span>
        <span class="scene-name">{{ s.name }}</span>
      </button>
    </div>

    <!-- Rooms -->
    <div class="rooms" @click.self="editingId = null">
      <section v-for="room in rooms" :key="room.id" class="room">
        <h2>{{ room.name }}</h2>
        <div class="tile-grid">
          <div
            v-for="acc in room.accessories"
            :key="acc.id"
            class="tile"
            :class="{ active: isOn(acc), editing: editingId === acc.id, lit: acc.type === 'light' && acc.on }"
            @click="tileClick(acc)"
          >
            <span
              class="tile-icon"
              :class="{
                'fan-spin': acc.type === 'fan' && acc.speed > 0,
                ['speed-' + acc.speed]: acc.type === 'fan',
              }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <!-- bulb -->
                <template v-if="acc.type === 'light'">
                  <path d="M12 3a5.8 5.8 0 0 0-3.5 10.4c.7.6 1 1.1 1 2.1h5c0-1 .3-1.5 1-2.1A5.8 5.8 0 0 0 12 3z" />
                  <path d="M9.7 18.5h4.6 M10.4 21h3.2" />
                </template>
                <!-- thermometer -->
                <template v-else-if="acc.type === 'thermostat'">
                  <path d="M10 13.8V5a2 2 0 1 1 4 0v8.8a4.5 4.5 0 1 1-4 0z" />
                  <path d="M12 9v5.5" />
                  <path d="M13.8 17.3a1.8 1.8 0 1 0-3.6 0 1.8 1.8 0 0 0 3.6 0z" fill="currentColor" stroke="none" />
                </template>
                <!-- padlock -->
                <template v-else-if="acc.type === 'lock'">
                  <path d="M6 10.5h12a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19v-7A1.5 1.5 0 0 1 6 10.5z" />
                  <path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7" />
                  <path d="M12 14.5v2" />
                </template>
                <!-- fan blades -->
                <template v-else-if="acc.type === 'fan'">
                  <path d="M12 12c.8-4.2 2.6-7.2 4.9-6.4 2 .7.7 5.6-4.9 6.4z" />
                  <path d="M12 12c4.2.8 7.2 2.6 6.4 4.9-.7 2-5.6.7-6.4-4.9z" />
                  <path d="M12 12c-.8 4.2-2.6 7.2-4.9 6.4-2-.7-.7-5.6 4.9-6.4z" />
                  <path d="M12 12c-4.2-.8-7.2-2.6-6.4-4.9.7-2 5.6-.7 6.4 4.9z" />
                  <path d="M13 12a1 1 0 1 0-2 0 1 1 0 0 0 2 0z" fill="currentColor" stroke="none" />
                </template>
                <!-- TV screen -->
                <template v-else-if="acc.type === 'tv'">
                  <path d="M4 6h16a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 4 6z" />
                  <path d="M8.5 21.5h7" />
                </template>
                <!-- blinds slats -->
                <template v-else>
                  <path d="M5 3.5h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" />
                  <path d="M4 8.2h16 M4 12.4h16 M4 16.6h16" />
                  <path d="M17.5 3.5v3.2" />
                </template>
              </svg>
            </span>
            <div class="tile-text">
              <span class="tile-name">{{ acc.name }}</span>
              <span class="tile-state" :class="{ on: isOn(acc) }">{{ stateText(acc) }}</span>
            </div>
            <div v-if="editingId === acc.id" class="tile-slider" @click.stop>
              <input
                type="range"
                :min="acc.type === 'thermostat' ? 10 : 0"
                :max="acc.type === 'thermostat' ? 30 : 100"
                :value="acc.type === 'thermostat' ? acc.temp : acc.open"
                @input="adjust(acc, $event.target.value)"
              />
              <span class="slider-value">{{ acc.type === 'thermostat' ? acc.temp + '°C' : acc.open + '%' }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast" class="toast glass-strong">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.home {
  background: var(--window-bg);
  color: var(--text);
  overflow: hidden;
  position: relative;
}

/* Header */
.home-header {
  padding: 18px 22px 10px;
  flex: none;
}

.home-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.home-glyph {
  font-size: 34px;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #ffd60a, #ff9f0a);
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(255, 159, 10, 0.35);
  color: #fff;
}

.home-glyph svg {
  width: 30px;
  height: 30px;
}

h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.3px;
}

.status {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-dim);
}

/* Scenes */
.scenes {
  display: flex;
  gap: 10px;
  padding: 6px 22px 12px;
  overflow-x: auto;
  flex: none;
}

.scene {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 12px;
  border: 0.5px solid var(--border);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.scene:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
}

.scene:active {
  transform: scale(0.97);
}

.scene-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
}

.scene-icon svg {
  width: 17px;
  height: 17px;
}

/* Rooms */
.rooms {
  flex: 1;
  overflow-y: auto;
  padding: 4px 22px 22px;
}

.room h2 {
  font-size: 15px;
  font-weight: 700;
  margin: 14px 0 8px;
  color: var(--text);
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

/* Tiles */
.tile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: var(--glass);
  border: 0.5px solid var(--border);
  cursor: pointer;
  user-select: none;
  transition: transform 0.12s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.tile:hover {
  background: var(--hover);
}

.tile.active {
  background: var(--selection);
}

.tile.lit {
  box-shadow: 0 0 18px rgba(255, 214, 10, 0.45), inset 0 0 12px rgba(255, 214, 10, 0.12);
  border-color: rgba(255, 190, 0, 0.55);
}

.tile-icon {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  color: var(--text);
  background: var(--hover);
  border: 0.5px solid var(--border);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.tile-icon svg {
  width: 20px;
  height: 20px;
}

.tile.lit .tile-icon {
  background: radial-gradient(circle at 40% 35%, #fff3b0, #ffd60a 70%);
  box-shadow: 0 0 14px rgba(255, 214, 10, 0.7);
  color: #8a6300;
}

.fan-spin {
  animation: spin 1.6s linear infinite;
}

.fan-spin.speed-2 {
  animation-duration: 0.9s;
}

.fan-spin.speed-3 {
  animation-duration: 0.45s;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.tile-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.tile-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-state {
  font-size: 12px;
  color: var(--text-dim);
}

.tile-state.on {
  color: var(--accent);
}

/* Slider popover inside tile */
.tile.editing {
  flex-wrap: wrap;
}

.tile-slider {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 8px;
}

.tile-slider input[type='range'] {
  flex: 1;
  accent-color: var(--accent);
  cursor: pointer;
}

.slider-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  min-width: 38px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Toast */
.toast {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  padding: 9px 18px;
  border-radius: 20px;
  border: 0.5px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
  pointer-events: none;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
