<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  buildWorld, FAVORITES, LANDMARKS, MY_LOCATION, BRIDGES, TRANSIT_LINES,
  nearestH, nearestV, nearestAnyH, nearestAnyV,
} from './mapdata'
import MapIcon from './MapIcon.vue'

const world = buildWorld()
const allPlaces = [...FAVORITES, ...LANDMARKS]
const bridges = BRIDGES
const transitLines = TRANSIT_LINES
const MIN_Z = 0.5
const MAX_Z = 3

const wrapEl = ref(null)
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const rotation = ref(0) // degrees, clockwise — map bearing
const tilted = ref(false) // 3D perspective view
const mapMode = ref('standard') // 'standard' | 'satellite' | 'transit'
const dragging = ref(false)
const query = ref('')
const pin = ref(null)
const dirMode = ref(false)
const fromText = ref('')
const toText = ref('')
const route = ref(null)

/* ---------- map transform ---------- */

const DEG = Math.PI / 180
function rotPt(p, deg) {
  const a = deg * DEG
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }
}

const worldStyle = computed(() => ({
  transform: `translate(${pan.value.x}px, ${pan.value.y}px) scale(${zoom.value}) rotate(${rotation.value}deg)`,
}))
const surfaceStyle = computed(() =>
  tilted.value
    ? { transform: 'perspective(1200px) rotateX(38deg)', transformStyle: 'preserve-3d' }
    : {}
)
// pins/markers stay upright and constant-size regardless of zoom/bearing/tilt
const markerTf = computed(
  () =>
    `translate(-50%, -100%) rotate(${-rotation.value}deg)` +
    (tilted.value ? ' rotateX(-38deg)' : '') +
    ` scale(${1 / zoom.value})`
)
const pinStyle = computed(() =>
  pin.value ? { left: pin.value.x + 'px', top: pin.value.y + 'px', transform: markerTf.value } : {}
)
const spinStyle = (p) => ({ left: p.x + 'px', top: p.y + 'px', transform: markerTf.value })
const meStyle = computed(() => ({
  left: MY_LOCATION.x + 'px',
  top: MY_LOCATION.y + 'px',
  transform: `translate(-50%, -50%) scale(${1 / zoom.value})`,
}))
const labelStyle = (l) => ({
  left: l.x + 'px',
  top: l.y + 'px',
  transform:
    `translate(-50%, -50%)${l.rotate ? ` rotate(${l.rotate}deg)` : ''}` +
    (tilted.value ? ' rotateX(-38deg)' : ''),
  ...(l.size ? { fontSize: l.size + 'px' } : {}),
})
const stLabelStyle = (s) => ({
  left: s.x + 'px',
  top: s.y + 'px',
  transform:
    (s.side === 'right' ? 'translate(10px, -50%)' : 'translate(-50%, 11px)') +
    (tilted.value ? ' rotateX(-38deg)' : ''),
})

function wrapSize() {
  const r = wrapEl.value?.getBoundingClientRect()
  return { w: r?.width || 800, h: r?.height || 600 }
}
function centerOn(p, z = zoom.value, rot = rotation.value) {
  const { w, h } = wrapSize()
  const rp = rotPt(p, rot)
  pan.value = { x: w / 2 - rp.x * z, y: h / 2 - rp.y * z }
}
// inverse of the world transform: client px -> world units
function screenToWorld(clientX, clientY) {
  const r = wrapEl.value.getBoundingClientRect()
  const px = (clientX - r.left - pan.value.x) / zoom.value
  const py = (clientY - r.top - pan.value.y) / zoom.value
  return rotPt({ x: px, y: py }, -rotation.value)
}
function zoomBy(f) {
  const nz = Math.min(MAX_Z, Math.max(MIN_Z, zoom.value * f))
  if (nz === zoom.value) return
  const { w, h } = wrapSize()
  const cx = w / 2
  const cy = h / 2
  pan.value = {
    x: cx - ((cx - pan.value.x) * nz) / zoom.value,
    y: cy - ((cy - pan.value.y) * nz) / zoom.value,
  }
  zoom.value = nz
}

/* ---------- bearing (Option-drag rotates, compass resets) ---------- */

let rotStart = null
function beginRotate(e) {
  const r = wrapEl.value.getBoundingClientRect()
  rotStart = {
    a0: Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)),
    rot0: rotation.value,
    wc: screenToWorld(r.left + r.width / 2, r.top + r.height / 2), // world point at view center
  }
  dragging.value = true // suppress the transform transition while rotating
  e.currentTarget.setPointerCapture?.(e.pointerId)
}
function moveRotate(e) {
  const r = wrapEl.value.getBoundingClientRect()
  const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2))
  rotation.value = rotStart.rot0 + (a - rotStart.a0) / DEG
  centerOn(rotStart.wc) // keep the view center pinned
}
function resetNorth() {
  if (!rotation.value) return
  const r = wrapEl.value.getBoundingClientRect()
  const wc = screenToWorld(r.left + r.width / 2, r.top + r.height / 2)
  rotation.value = 0
  centerOn(wc, zoom.value, 0)
}
const needleStyle = computed(() => ({
  transform: `rotate(${-rotation.value}deg)`,
  transformOrigin: '18px 18px',
}))

/* ---------- current location ---------- */

const meOff = computed(() => {
  const r = wrapEl.value?.getBoundingClientRect()
  if (!r) return false
  const rp = rotPt(MY_LOCATION, rotation.value)
  const sx = pan.value.x + rp.x * zoom.value
  const sy = pan.value.y + rp.y * zoom.value
  return Math.hypot(sx - r.width / 2, sy - r.height / 2) > 30
})
function locateMe() {
  centerOn(MY_LOCATION)
}

/* ---------- pan by dragging; click drops a pin ---------- */

let dragStart = null
function onPointerDown(e) {
  if (e.button !== 0 || e.target.closest('.pin-wrap')) return
  if (e.altKey) {
    beginRotate(e)
    return
  }
  dragStart = { x: e.clientX, y: e.clientY, pan: { ...pan.value }, moved: false }
  e.currentTarget.setPointerCapture?.(e.pointerId)
}
function onPointerMove(e) {
  if (rotStart) {
    moveRotate(e)
    return
  }
  if (!dragStart) return
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  if (!dragStart.moved && Math.hypot(dx, dy) > 4) {
    dragStart.moved = true
    dragging.value = true
  }
  if (dragStart.moved) pan.value = { x: dragStart.pan.x + dx, y: dragStart.pan.y + dy }
}
function onPointerUp(e) {
  if (rotStart) {
    rotStart = null
    dragging.value = false
    return
  }
  if (!dragStart) return
  if (!dragStart.moved) dropPinAt(e)
  dragStart = null
  dragging.value = false
}
function dropPinAt(e) {
  const w = screenToWorld(e.clientX, e.clientY)
  pin.value = {
    icon: 'pin',
    name: 'Dropped Pin',
    sub: 'San Francisco, CA',
    x: Math.round(w.x),
    y: Math.round(w.y),
  }
}

/* ---------- search / places ---------- */

const searchResults = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return allPlaces.filter(
    (p) => p.name.toLowerCase().includes(q) || p.sub.toLowerCase().includes(q)
  )
})
// distance from the current location, shown next to each search result
const distKm = (p) =>
  (Math.hypot(p.x - MY_LOCATION.x, p.y - MY_LOCATION.y) * KM_PER_UNIT).toFixed(1)
const sections = computed(() =>
  query.value.trim()
    ? [{ label: 'Results', items: searchResults.value }]
    : [
        { label: 'Favorites', items: FAVORITES },
        { label: 'Nearby', items: LANDMARKS },
      ]
)

function selectPlace(p) {
  pin.value = p
  centerOn(p)
}
function clearSearch() {
  query.value = ''
}
function searchGo() {
  if (searchResults.value[0]) selectPlace(searchResults.value[0])
}

/* ---------- directions ---------- */

function toggleDirs() {
  dirMode.value = !dirMode.value
  if (dirMode.value && !fromText.value) fromText.value = 'My Location'
}
function resolve(text) {
  const t = (text || '').trim().toLowerCase()
  if (!t || t === 'my location') return MY_LOCATION
  if (pin.value && pin.value.name.toLowerCase() === t) return pin.value
  // fuzzy match against favorites + landmarks (name and subtitle)
  const score = (p) => {
    const name = p.name.toLowerCase()
    const sub = p.sub.toLowerCase()
    if (name === t || sub === t) return 100
    if (name.startsWith(t)) return 80
    if (name.includes(t) || sub.includes(t)) return 60
    const words = t.split(/\s+/)
    if (words.length > 1 && words.every((w) => name.includes(w))) return 50
    if (t.length >= 3) {
      let i = 0
      for (const ch of name) if (ch === t[i]) i++
      if (i >= t.length) return 30
    }
    return 0
  }
  let best = null
  let bestScore = 0
  for (const p of allPlaces) {
    const s = score(p)
    if (s > bestScore) {
      best = p
      bestScore = s
    }
  }
  if (best) return best
  // fake geocoder: any other text hashes to a stable spot in the city
  let h = 0
  for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return { name: text.trim(), sub: 'San Francisco, CA', x: 540 + (h % 1480), y: 140 + ((h >> 8) % 1160) }
}

/* ----- grid routing: snap both ends to the arterial grid, then pick the
   shorter of the two L/Z shapes (vertical-first vs horizontal-first) ----- */

const KM_PER_UNIT = 0.0064 // world unit ≈ 6.4 m (was 0.004 mi)

function gridPath(a, b) {
  const vA = nearestV(a.x)
  const hA = nearestH(a.y)
  const vB = nearestV(b.x)
  const hB = nearestH(b.y)
  const mk = (raw) => {
    const out = []
    for (const p of raw) {
      const l = out[out.length - 1]
      if (!l || Math.abs(p.x - l.x) + Math.abs(p.y - l.y) > 1) out.push(p)
    }
    return out
  }
  const vhv = mk([
    { x: a.x, y: a.y },
    { x: vA.x, y: a.y },
    { x: vA.x, y: hB.y },
    { x: b.x, y: hB.y },
    { x: b.x, y: b.y },
  ])
  const hvh = mk([
    { x: a.x, y: a.y },
    { x: a.x, y: hA.y },
    { x: vB.x, y: hA.y },
    { x: vB.x, y: b.y },
    { x: b.x, y: b.y },
  ])
  const cost = (pts) => {
    let L = 0
    for (let i = 1; i < pts.length; i++) L += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y)
    return L
  }
  return cost(vhv) <= cost(hvh) ? vhv : hvh
}

function pathSegments(pts) {
  const segs = []
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    const len = Math.abs(dx) + Math.abs(dy)
    if (len < 2) continue
    const horiz = Math.abs(dx) > Math.abs(dy)
    const heading = horiz ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'south' : 'north'
    const street = horiz ? nearestAnyH(pts[i].y).name : nearestAnyV(pts[i].x).name
    segs.push({ heading, street, len })
  }
  return segs
}

const HEADING_VEC = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }

function buildSteps(segs, dest) {
  const steps = []
  segs.forEach((s, i) => {
    const km = (s.len * KM_PER_UNIT).toFixed(1)
    if (i === 0) {
      const next = segs[1]
      if (s.len < 30 && next && next.street !== s.street) {
        steps.push({ text: `Head ${s.heading} toward ${next.street}`, km })
      } else {
        steps.push({ text: `Head ${s.heading} on ${s.street}`, km })
      }
      return
    }
    const p = segs[i - 1]
    const cross =
      HEADING_VEC[p.heading][0] * HEADING_VEC[s.heading][1] -
      HEADING_VEC[p.heading][1] * HEADING_VEC[s.heading][0]
    if (s.street === p.street || cross === 0) steps.push({ text: `Continue on ${s.street}`, km })
    else steps.push({ text: `Turn ${cross < 0 ? 'left' : 'right'} onto ${s.street}`, km })
  })
  steps.push({ text: `Arrive at ${dest.name}`, km: 0 })
  return steps
}

function computeRoute() {
  const a = resolve(fromText.value)
  const b = resolve(toText.value)
  if (!toText.value.trim() || (a.x === b.x && a.y === b.y)) return
  const pts = gridPath(a, b)
  if (pts.length < 2) return
  const segs = pathSegments(pts)
  let len = 0
  for (const s of segs) len += s.len
  const km = Math.max(0.1, len * KM_PER_UNIT)
  const main = segs.reduce((m, s) => (s.len > (m ? m.len : -1) ? s : m), null)
  route.value = {
    points: pts.map((p) => `${p.x},${p.y}`).join(' '),
    start: pts[0],
    end: pts[pts.length - 1],
    km: km.toFixed(1),
    mins: Math.max(1, Math.round((km / 40) * 60)), // 40 km/h city driving
    via: main ? main.street : '',
    steps: buildSteps(segs, b),
  }
  pin.value = { ...b }
  fitRoute(pts)
}
function fitRoute(pts) {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const bw = Math.max(...xs) - Math.min(...xs) + 340
  const bh = Math.max(...ys) - Math.min(...ys) + 340
  const { w, h } = wrapSize()
  const z = Math.min(MAX_Z, Math.max(MIN_Z, Math.min(w / bw, h / bh)))
  zoom.value = z
  centerOn({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }, z)
}
function dirTo(p) {
  dirMode.value = true
  toText.value = p.name === 'My Location' ? '' : p.name
  if (!fromText.value) fromText.value = 'My Location'
  computeRoute()
}
function dirFrom(p) {
  dirMode.value = true
  fromText.value = p.name
  if (!toText.value) toText.value = ''
  if (toText.value.trim()) computeRoute()
}
function swapDir() {
  const t = fromText.value
  fromText.value = toText.value
  toText.value = t
  if (route.value) computeRoute()
}
function clearRoute() {
  route.value = null
  fromText.value = ''
  toText.value = ''
}

/* ---------- scale bar ---------- */

const SCALE_OPTS = [
  { u: 15.6, label: '100 m' },
  { u: 31.2, label: '200 m' },
  { u: 78, label: '500 m' },
  { u: 156, label: '1 km' },
  { u: 312, label: '2 km' },
]
const scaleBar = computed(() => {
  let best = SCALE_OPTS[0]
  for (const o of SCALE_OPTS) if (o.u * zoom.value <= 150) best = o
  return { w: Math.round(best.u * zoom.value), label: best.label }
})

/* ---------- render helpers ---------- */

const rectStyle = (r) => ({
  left: r.x + 'px',
  top: r.y + 'px',
  width: r.w + 'px',
  height: r.h + 'px',
  ...(r.r ? { borderRadius: r.r } : {}),
  ...(r.rotate ? { transform: `rotate(${r.rotate}deg)` } : {}),
})
const ptsString = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ')
// two tower ticks perpendicular to a bridge deck, at 35% / 65% of the span
function bridgeTowers(b) {
  const dx = b.x2 - b.x1
  const dy = b.y2 - b.y1
  const len = Math.hypot(dx, dy)
  const nx = (-dy / len) * 13
  const ny = (dx / len) * 13
  return [0.35, 0.65].map((t) => {
    const cx = b.x1 + dx * t
    const cy = b.y1 + dy * t
    return { x1: cx - nx, y1: cy - ny, x2: cx + nx, y2: cy + ny }
  })
}

onMounted(() => centerOn(MY_LOCATION))
</script>

<template>
  <div class="app-root maps">
    <aside class="sidebar">
      <div class="side-head">
        <div class="search-wrap">
          <svg class="s-ico" viewBox="0 0 16 16">
            <circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6" />
            <line x1="10.2" y1="10.2" x2="14" y2="14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <input
            v-model="query"
            class="search"
            type="text"
            placeholder="Search Maps"
            @keydown.enter="searchGo"
            @keydown.esc="clearSearch"
          />
          <button v-if="query" class="s-clear" @click="clearSearch">✕</button>
        </div>
        <button class="dir-btn" :class="{ on: dirMode }" title="Directions" @click="toggleDirs">
          <svg viewBox="0 0 24 24">
            <path d="M21.7 2.3a1 1 0 0 0-1.1-.2L3.6 9.4a1 1 0 0 0 .1 1.9l7 2.3 2.3 7a1 1 0 0 0 1.9.1l7.3-17a1 1 0 0 0-.5-1.4z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div v-if="!dirMode" class="side-scroll">
        <template v-for="sec in sections" :key="sec.label">
          <div class="side-label">{{ sec.label }}</div>
          <div
            v-for="p in sec.items"
            :key="p.name"
            class="side-row"
            :class="{ active: pin && pin.name === p.name }"
            @click="selectPlace(p)"
          >
            <span class="row-ico"><MapIcon :name="p.icon" /></span>
            <span class="row-txt">
              <span class="row-name">{{ p.name }}</span>
              <span class="row-sub">{{ p.sub }}<template v-if="query.trim()"> · {{ distKm(p) }} km</template></span>
            </span>
          </div>
        </template>
        <div v-if="query && !searchResults.length" class="side-empty">No Results</div>
      </div>

      <div v-else class="side-scroll dirs">
        <div class="dirs-head">
          <span class="dirs-title">Directions</span>
          <button class="done-btn" @click="dirMode = false">Done</button>
        </div>
        <div class="dir-inputs">
          <div class="dir-row">
            <span class="dot dot-a"></span>
            <input v-model="fromText" list="maps-places" placeholder="From" @keydown.enter="computeRoute" />
          </div>
          <div class="dir-row">
            <span class="dot dot-b"></span>
            <input v-model="toText" list="maps-places" placeholder="To" @keydown.enter="computeRoute" />
          </div>
          <button class="swap" title="Swap" @click="swapDir">⇅</button>
        </div>
        <datalist id="maps-places">
          <option value="My Location" />
          <option v-for="p in allPlaces" :key="p.name" :value="p.name" />
        </datalist>
        <button class="go-btn" :disabled="!toText.trim()" @click="computeRoute">Go</button>

        <div v-if="route" class="route-card">
          <div class="rc-head">
            <span class="rc-mins">{{ route.mins }} min</span>
            <span class="rc-sub">{{ route.km }} km<span v-if="route.via"> · via {{ route.via }}</span></span>
          </div>
          <div class="rc-steps">
            <div v-for="(s, i) in route.steps" :key="i" class="rc-step">
              <span class="rc-n">{{ i + 1 }}</span>
              <span class="rc-step-body">
                <span>{{ s.text }}</span>
                <span v-if="s.km > 0" class="rc-km">{{ s.km }} km</span>
              </span>
            </div>
          </div>
          <button class="rc-clear" @click="clearRoute">Clear Route</button>
        </div>
        <div class="dirs-hint">Tip: click anywhere on the map to drop a pin.</div>
      </div>
    </aside>

    <div
      ref="wrapEl"
      class="map-wrap"
      :class="{
        grabbing: dragging,
        sat: mapMode === 'satellite',
        transit: mapMode === 'transit',
        tilted,
      }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="surface" :style="surfaceStyle">
      <div class="world" :class="{ dragging }" :style="worldStyle">
        <div class="land"></div>
        <div v-for="(s, i) in world.streetsH" :key="'h' + i" class="street st-h" :style="{ top: s.y - 7 + 'px' }"></div>
        <div v-for="(s, i) in world.streetsV" :key="'v' + i" class="street st-v" :style="{ left: s.x - 7 + 'px' }"></div>
        <div v-for="(s, i) in world.minorH" :key="'mh' + i" class="street st-h minor" :style="{ top: s.y - 3.5 + 'px' }"></div>
        <div v-for="(s, i) in world.minorV" :key="'mv' + i" class="street st-v minor" :style="{ left: s.x - 3.5 + 'px' }"></div>
        <div v-for="(w, i) in world.water" :key="'w' + i" class="water" :style="rectStyle(w)"></div>
        <div v-for="(w, i) in world.islands" :key="'i' + i" class="island" :style="rectStyle(w)"></div>
        <div v-for="(p, i) in world.parks" :key="'p' + i" class="park" :style="rectStyle(p)"></div>
        <div v-for="(l, i) in world.lakes" :key="'l' + i" class="water" :style="rectStyle(l)"></div>
        <div v-for="(t, i) in world.trees" :key="'t' + i" class="tree" :style="{ left: t.x + 'px', top: t.y + 'px', fontSize: t.s + 'px' }">🌳</div>
        <div v-for="(b, i) in world.buildings" :key="'b' + i" class="bldg" :class="{ dark: b.dark }" :style="rectStyle(b)"></div>
        <div v-for="(hw, i) in world.highways" :key="'hw' + i" class="highway" :style="rectStyle(hw)"></div>

        <svg class="overlay-svg" :viewBox="`0 0 ${world.W} ${world.H}`" :width="world.W" :height="world.H">
          <g v-for="(b, i) in bridges" :key="'br' + i">
            <line :x1="b.x1" :y1="b.y1" :x2="b.x2" :y2="b.y2" class="br-casing" />
            <line :x1="b.x1" :y1="b.y1" :x2="b.x2" :y2="b.y2" class="br-deck" />
            <line
              v-for="(t, j) in bridgeTowers(b)"
              :key="'bt' + j"
              :x1="t.x1"
              :y1="t.y1"
              :x2="t.x2"
              :y2="t.y2"
              class="br-tower"
            />
          </g>
        </svg>

        <template v-if="mapMode === 'transit'">
          <svg class="overlay-svg" :viewBox="`0 0 ${world.W} ${world.H}`" :width="world.W" :height="world.H">
            <g v-for="l in transitLines" :key="l.id">
              <polyline :points="ptsString(l.points)" class="tl-casing" />
              <polyline :points="ptsString(l.points)" class="tl-line" :style="{ stroke: l.color }" />
              <circle
                v-for="s in l.stations"
                :key="l.id + s.name"
                :cx="s.x"
                :cy="s.y"
                r="6"
                class="tl-station"
                :style="{ stroke: l.color }"
              />
            </g>
          </svg>
          <template v-for="l in transitLines" :key="'tll' + l.id">
            <div
              v-for="s in l.stations"
              :key="'tls' + s.name"
              class="mlabel t-l"
              :style="stLabelStyle(s)"
            >
              {{ s.name }}
            </div>
          </template>
        </template>

        <div v-for="(l, i) in world.labels" :key="'lb' + i" class="mlabel" :class="l.kind" :style="labelStyle(l)">{{ l.text }}</div>

        <svg v-if="route" class="route-svg" :viewBox="`0 0 ${world.W} ${world.H}`" :width="world.W" :height="world.H">
          <polyline :points="route.points" class="r-casing" />
          <polyline :points="route.points" class="r-line" />
          <circle :cx="route.start.x" :cy="route.start.y" r="9" class="r-start" />
          <circle :cx="route.end.x" :cy="route.end.y" r="9" class="r-end" />
        </svg>

        <div class="me" :style="meStyle"><span class="me-pulse"></span><span class="me-dot"></span></div>

        <div
          v-for="p in searchResults"
          :key="'sp' + p.name"
          class="pin-wrap spin"
          :class="{ hid: pin && pin.name === p.name }"
          :style="spinStyle(p)"
        >
          <div class="pin gray small"><span class="pin-hole"></span></div>
        </div>

        <div v-if="pin" class="pin-wrap" :style="pinStyle">
          <div class="callout">
            <div class="co-name">{{ pin.name }}</div>
            <div class="co-sub">{{ pin.sub }}</div>
            <div class="co-btns">
              <button class="co-dir" @click.stop="dirTo(pin)">Directions</button>
              <button class="co-from" @click.stop="dirFrom(pin)">From Here</button>
            </div>
            <button class="co-x" @click.stop="pin = null">✕</button>
          </div>
          <div class="pin"><span class="pin-hole"></span></div>
        </div>
      </div>
      </div>

      <div class="modes glass-strong" @pointerdown.stop>
        <button
          v-for="m in ['Standard', 'Satellite', 'Transit']"
          :key="m"
          :class="{ on: mapMode === m.toLowerCase() }"
          @click="mapMode = m.toLowerCase()"
        >
          {{ m }}
        </button>
      </div>
      <button
        class="compass glass-strong"
        title="Reset to north (Option-drag to rotate)"
        @pointerdown.stop
        @click="resetNorth"
      >
        <svg viewBox="0 0 36 36">
          <g :style="needleStyle">
            <path d="M18 5.5 21.2 18 18 15.6 14.8 18Z" fill="#ff3b30" />
            <path d="M18 30.5 14.8 18 18 20.4 21.2 18Z" fill="currentColor" opacity="0.55" />
            <text x="18" y="12.5" text-anchor="middle" class="cp-n">N</text>
          </g>
        </svg>
      </button>
      <button v-if="route && !dirMode" class="eta glass-strong" @pointerdown.stop @click="dirMode = true">
        <svg class="eta-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 11.5 6.6 7a2 2 0 0 1 1.9-1.4h7a2 2 0 0 1 1.9 1.4l1.6 4.5" />
          <rect x="3.5" y="11.5" width="17" height="5.5" rx="1.6" />
          <line x1="7" y1="14.2" x2="9.2" y2="14.2" />
          <line x1="14.8" y1="14.2" x2="17" y2="14.2" />
          <path d="M5.5 17v1.8M18.5 17v1.8" />
        </svg>
        {{ route.mins }} min · {{ route.km }} km
      </button>
      <div class="scale">
        <div class="scale-line" :style="{ width: scaleBar.w + 'px' }"></div>
        <span>{{ scaleBar.label }}</span>
      </div>
      <button
        class="tilt glass-strong"
        :class="{ on: tilted }"
        title="3D view"
        @pointerdown.stop
        @click="tilted = !tilted"
      >
        3D
      </button>
      <button
        class="locate glass-strong"
        :class="{ off: meOff }"
        title="My Location"
        @pointerdown.stop
        @click="locateMe"
      >
        <svg v-if="meOff" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
          <path d="M12 3.5 18.5 20.5 12 16.6 5.5 20.5Z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3.5 18.5 20.5 12 16.6 5.5 20.5Z" />
        </svg>
      </button>
      <div class="zoom glass-strong" @pointerdown.stop>
        <button :disabled="zoom >= MAX_Z" @click="zoomBy(1.45)">+</button>
        <div class="z-sep"></div>
        <button :disabled="zoom <= MIN_Z" @click="zoomBy(1 / 1.45)">−</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.maps {
  flex-direction: row;
}

/* ---------- sidebar (theme-aware chrome) ---------- */
.sidebar {
  width: 258px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.side-head {
  display: flex;
  gap: 8px;
  padding: 10px 12px 8px;
  align-items: center;
}
.search-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}
.s-ico {
  position: absolute;
  left: 8px;
  width: 12px;
  height: 12px;
  color: var(--text-dim);
  pointer-events: none;
}
.search {
  width: 100%;
  padding: 5px 24px 5px 26px;
  font-size: 13px;
  color: var(--text);
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  outline: none;
}
.search:focus {
  box-shadow: 0 0 0 3px var(--selection);
}
.s-clear {
  position: absolute;
  right: 5px;
  width: 15px;
  height: 15px;
  font-size: 8px;
  border: none;
  border-radius: 50%;
  background: var(--text-dim);
  color: var(--sidebar-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dir-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 0.5px solid var(--border);
  background: var(--hover);
  color: var(--text-dim);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dir-btn svg {
  width: 14px;
  height: 14px;
}
.dir-btn.on,
.dir-btn:hover {
  color: var(--accent);
}
.side-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 12px;
}
.side-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  padding: 12px 16px 4px;
}
.side-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 1px 8px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: default;
}
.side-row:hover:not(.active) {
  background: var(--hover);
}
.side-row.active {
  background: var(--selection);
}
.row-ico {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.row-ico svg {
  width: 22px;
  height: 22px;
  display: block;
}
.row-txt {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.row-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-sub {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.side-empty {
  padding: 14px 16px;
  color: var(--text-dim);
  font-size: 13px;
}

/* ---------- directions panel ---------- */
.dirs {
  padding: 2px 12px 12px;
}
.dirs-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 4px 8px;
}
.dirs-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
}
.done-btn {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
}
.dir-inputs {
  position: relative;
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 10px;
}
.dir-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}
.dir-row:first-child {
  border-bottom: 0.5px solid var(--border);
}
.dir-row input {
  flex: 1;
  min-width: 0;
  padding: 8px 0;
  background: none;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text);
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-a {
  background: #8e8e93;
}
.dot-b {
  background: #ff3b30;
}
.swap {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 12px;
  z-index: 1;
}
.go-btn {
  width: 100%;
  margin-top: 8px;
  padding: 6px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.go-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.route-card {
  margin-top: 10px;
  background: var(--window-bg);
  border: 0.5px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
}
.rc-head {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-bottom: 8px;
  border-bottom: 0.5px solid var(--border);
}
.rc-mins {
  font-size: 17px;
  font-weight: 700;
  color: var(--accent);
}
.rc-sub {
  font-size: 12px;
  color: var(--text-dim);
}
.rc-steps {
  padding: 6px 0;
}
.rc-step {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12.5px;
  padding: 3px 0;
}
.rc-step-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-top: 1px;
}
.rc-km {
  font-size: 11px;
  color: var(--text-dim);
}
.rc-n {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--hover);
  color: var(--text-dim);
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.rc-clear {
  width: 100%;
  margin-top: 6px;
  padding: 5px;
  border: 0.5px solid var(--border);
  background: var(--hover);
  color: var(--text);
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}
.dirs-hint {
  margin-top: 10px;
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
}

/* ---------- map surface (fixed light palette, like the real app) ---------- */
.map-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  background: #aad3df;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.map-wrap.grabbing {
  cursor: grabbing;
}
.world {
  position: absolute;
  top: 0;
  left: 0;
  width: 2200px;
  height: 1500px;
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.3, 1);
  will-change: transform;
}
.world.dragging {
  transition: none;
}
.land {
  position: absolute;
  inset: 0;
  background: #e9e6dd;
}
.street {
  position: absolute;
  background: #fff;
  box-sizing: border-box;
}
.st-h {
  left: 440px;
  width: 1740px;
  height: 14px;
  border-top: 0.5px solid #dfdbcc;
  border-bottom: 0.5px solid #dfdbcc;
}
.st-v {
  top: 40px;
  height: 1420px;
  width: 14px;
  border-left: 0.5px solid #dfdbcc;
  border-right: 0.5px solid #dfdbcc;
}
.st-h.minor {
  height: 7px;
}
.st-v.minor {
  width: 7px;
}
.street.minor {
  border-color: #e5e1d4;
}
.water {
  position: absolute;
  background: #aad3df;
}
.island {
  position: absolute;
  background: #cfe0c0;
}
.park {
  position: absolute;
  background: #b7dfae;
  border-radius: 6px;
}
.tree {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.85;
}
.bldg {
  position: absolute;
  background: #ddd8cb;
  border-radius: 2px;
}
.bldg.dark {
  background: #d3cdbd;
}
.highway {
  position: absolute;
  background: #f3dfa8;
  border: 1px solid #e3c88b;
  border-radius: 4px;
  box-sizing: border-box;
}
.mlabel {
  position: absolute;
  font-size: 11px;
  color: #93907f;
  white-space: nowrap;
  pointer-events: none;
}
.st-l,
.st-m {
  text-shadow:
    0 0 3px rgba(233, 230, 221, 0.95),
    0 0 1px rgba(233, 230, 221, 0.95);
}
.st-m {
  font-size: 9px;
  color: #a5a190;
}
.park-l {
  color: #6f9463;
  font-weight: 600;
  font-size: 13px;
}
.water-l {
  color: #5e8b9c;
  font-style: italic;
  font-size: 13px;
  letter-spacing: 1.5px;
}
.hw-l {
  color: #a8842f;
  font-weight: 700;
  font-size: 10px;
  background: #fdf6dd;
  padding: 1px 5px;
  border-radius: 4px;
  border: 0.5px solid #e3c88b;
}

/* ---------- route overlay ---------- */
.route-svg,
.overlay-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.r-casing {
  fill: none;
  stroke: #fff;
  stroke-width: 12;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.8;
}
.r-line {
  fill: none;
  stroke: #1b8ef2;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.r-start {
  fill: #34c759;
  stroke: #fff;
  stroke-width: 3.5;
}
.r-end {
  fill: #ff3b30;
  stroke: #fff;
  stroke-width: 3.5;
}

/* ---------- markers ---------- */
.me {
  position: absolute;
  z-index: 4;
  pointer-events: none;
}
.me-dot {
  display: block;
  width: 13px;
  height: 13px;
  background: #0a84ff;
  border: 2.5px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
}
.me-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 13px;
  height: 13px;
  margin: -6.5px;
  background: rgba(10, 132, 255, 0.3);
  border-radius: 50%;
  animation: mePulse 2.4s ease-out infinite;
}
@keyframes mePulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(3.2);
    opacity: 0;
  }
}
.pin-wrap {
  position: absolute;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: 50% 100%;
}
.callout {
  position: relative;
  width: 190px;
  background: var(--window-bg);
  border: 0.5px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.22);
  padding: 9px 11px;
  margin-bottom: 7px;
}
.callout::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 10px;
  height: 10px;
  background: var(--window-bg);
  border-right: 0.5px solid var(--border);
  border-bottom: 0.5px solid var(--border);
  transform: translateX(-50%) rotate(45deg);
}
.co-name {
  font-size: 13px;
  font-weight: 700;
  padding-right: 14px;
}
.co-sub {
  font-size: 11px;
  color: var(--text-dim);
  margin: 1px 0 7px;
}
.co-dir {
  padding: 4px 12px;
  border: none;
  border-radius: 7px;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.co-btns {
  display: flex;
  gap: 6px;
}
.co-from {
  padding: 4px 10px;
  border: 0.5px solid var(--border);
  border-radius: 7px;
  background: var(--hover);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.co-x {
  position: absolute;
  top: 7px;
  right: 8px;
  border: none;
  background: none;
  color: var(--text-dim);
  font-size: 10px;
  cursor: pointer;
}
.pin {
  width: 24px;
  height: 24px;
  background: #ff3b30;
  border: 1.5px solid #fff;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pin-hole {
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
}

/* ---------- floating controls (theme-aware chrome) ---------- */
.eta {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 0.5px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
.eta-ico {
  width: 16px;
  height: 16px;
  flex: none;
}
.scale {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6f6b5e;
  font-size: 10.5px;
  pointer-events: none;
}
.scale-line {
  height: 5px;
  border: 1px solid #6f6b5e;
  border-top: none;
}
.locate {
  position: absolute;
  right: 12px;
  bottom: 76px;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 0.5px solid var(--border);
  font-size: 15px;
  color: var(--accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.locate svg {
  width: 16px;
  height: 16px;
  display: block;
}
.zoom {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  border-radius: 9px;
  border: 0.5px solid var(--border);
  overflow: hidden;
}
.zoom button {
  width: 34px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: var(--text);
  cursor: pointer;
}
.zoom button:disabled {
  opacity: 0.35;
  cursor: default;
}
.z-sep {
  height: 0.5px;
  background: var(--border);
}

/* ---------- 3D tilt ---------- */
.surface {
  position: absolute;
  inset: 0;
  transition: transform 0.45s cubic-bezier(0.25, 0.8, 0.3, 1);
}
.tilted .world {
  transform-style: preserve-3d;
}
.tilted .me {
  transform-style: preserve-3d;
}
.tilted .me-dot {
  transform: rotateX(-38deg);
}

/* ---------- bridge ---------- */
.br-casing {
  stroke: #9c3a1d;
  stroke-width: 13;
  stroke-linecap: round;
}
.br-deck {
  stroke: #d9532b;
  stroke-width: 8;
  stroke-linecap: round;
}
.br-tower {
  stroke: #b8431f;
  stroke-width: 5;
  stroke-linecap: round;
}

/* ---------- transit overlay ---------- */
.tl-casing {
  fill: none;
  stroke: #fff;
  stroke-width: 11;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.85;
}
.tl-line {
  fill: none;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.tl-station {
  fill: #fff;
  stroke-width: 3;
}
.t-l {
  font-size: 10px;
  font-weight: 600;
  color: #6b675a;
  text-shadow:
    0 0 3px rgba(233, 230, 221, 0.95),
    0 0 1px rgba(233, 230, 221, 0.95);
}
.transit .bldg,
.transit .tree {
  opacity: 0.4;
}
.transit .highway {
  opacity: 0.55;
}

/* ---------- satellite palette ---------- */
.map-wrap.sat {
  background: #15242c;
}
.sat .land {
  background: #2f3226;
}
.sat .water {
  background: #15242c;
}
.sat .island {
  background: #29331f;
}
.sat .park {
  background: #253b20;
}
.sat .bldg {
  background: #3d4134;
}
.sat .bldg.dark {
  background: #353a2d;
}
.sat .street {
  background: rgba(224, 222, 206, 0.34);
  border-color: rgba(20, 24, 16, 0.35);
}
.sat .street.minor {
  background: rgba(224, 222, 206, 0.22);
}
.sat .highway {
  background: #6b5a33;
  border-color: #574a2c;
}
.sat .mlabel {
  color: #cfccb9;
}
.sat .st-l,
.sat .st-m,
.sat .t-l {
  text-shadow:
    0 0 3px rgba(24, 28, 20, 0.95),
    0 0 1px rgba(24, 28, 20, 0.95);
}
.sat .st-m {
  color: #a8a48f;
}
.sat .park-l {
  color: #9ccb8a;
}
.sat .water-l {
  color: #8fb9c9;
}
.sat .hw-l {
  color: #e8d9a8;
  background: rgba(60, 52, 30, 0.9);
  border-color: #6b5a33;
}
.sat .t-l {
  color: #d8d4c0;
}
.sat .br-casing {
  stroke: #7e3018;
}
.sat .br-deck {
  stroke: #b84927;
}
.sat .br-tower {
  stroke: #9c3c1e;
}
.sat .scale {
  color: #b8b4a4;
}
.sat .scale-line {
  border-color: #b8b4a4;
}

/* ---------- search pins ---------- */
.pin-wrap.spin {
  z-index: 4;
  pointer-events: none;
}
.pin-wrap.spin.hid {
  display: none;
}
.pin.gray {
  background: #8e8e93;
}
.pin.small {
  width: 17px;
  height: 17px;
}
.pin.small .pin-hole {
  width: 6px;
  height: 6px;
}

/* ---------- mode segmented control / compass / 3D ---------- */
.modes {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  border-radius: 9px;
  border: 0.5px solid var(--border);
  overflow: hidden;
  padding: 2px;
  gap: 2px;
}
.modes button {
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 7px;
  cursor: pointer;
}
.modes button.on {
  background: var(--selection);
  font-weight: 600;
}
.compass {
  position: absolute;
  top: 56px;
  right: 12px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 0.5px solid var(--border);
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.compass svg {
  width: 26px;
  height: 26px;
  display: block;
}
.cp-n {
  font-size: 8px;
  font-weight: 700;
  fill: var(--text);
}
.tilt {
  position: absolute;
  right: 12px;
  bottom: 122px;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 0.5px solid var(--border);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-dim);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tilt.on {
  color: var(--accent);
}
.locate.off {
  color: var(--text-dim);
}
</style>
