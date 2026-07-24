// Shared project state for the DaVinci Resolve clone.
// A module-level singleton: one "project" per app, preserved across window reopen.
import { reactive, computed } from 'vue'

export const FPS = 30

let uid = 0
const nid = (p) => `${p}${++uid}`

const pad2 = (n) => String(n).padStart(2, '0')

export function timecode(t) {
  t = Math.max(0, t || 0)
  const frames = Math.round((t % 1) * FPS) % FPS
  const s = Math.floor(t) % 60
  const m = Math.floor(t / 60) % 60
  const h = Math.floor(t / 3600)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}:${pad2(frames)}`
}

export const snap = (t) => Math.round(t * 2) / 2 // 0.5s grid
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// Real sample videos (CORS-open media.w3.org) — the pool's actual media.
// `icon` names a glyph from Icon.vue (film / reel / wave / city / music).
const IMPORT_SOURCES = [
  { name: 'Bunny Feature', icon: 'reel', grad: 'linear-gradient(135deg,#f7971e,#c33764)', url: 'https://media.w3.org/2010/05/bunny/movie.mp4' },
  { name: 'Sintel Trailer', icon: 'film', grad: 'linear-gradient(135deg,#41295a,#2f0743)', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' },
  { name: 'Bunny Trailer', icon: 'reel', grad: 'linear-gradient(135deg,#302b63,#7f53ff)', url: 'https://media.w3.org/2010/05/bunny/trailer.mp4' },
  { name: 'City Loop', icon: 'city', grad: 'linear-gradient(135deg,#2193b0,#6dd5ed)', url: 'https://media.w3.org/2010/05/video/movie_300.mp4' },
]

export const state = reactive({
  page: 'Edit', // Media / Cut / Edit / Fusion / Color / Fairlight / Deliver
  tool: 'select', // 'select' | 'blade'
  playhead: 0,
  playing: false,
  loop: false,
  pxPerSec: 60,
  selectedClipId: null,
  pool: [
    { id: nid('m'), name: 'Aurora 4K', icon: 'film', grad: 'linear-gradient(135deg,#302b63,#7f53ff)', duration: 12, url: 'https://media.w3.org/2010/05/bunny/trailer.mp4' },
    { id: nid('m'), name: 'Ocean B-roll', icon: 'wave', grad: 'linear-gradient(135deg,#0b486b,#3b8686)', duration: 8, url: 'https://media.w3.org/2010/05/sintel/trailer.mp4' },
    { id: nid('m'), name: 'City Timelapse', icon: 'city', grad: 'linear-gradient(135deg,#f7971e,#c33764)', duration: 10, url: 'https://media.w3.org/2010/05/video/movie_300.mp4' },
  ],
  tracks: [
    { id: 'v2', label: 'V2', kind: 'video', muted: false, locked: false },
    { id: 'v1', label: 'V1', kind: 'video', muted: false, locked: false },
    { id: 'a1', label: 'A1', kind: 'audio', muted: false, locked: false },
  ],
  clips: [],
  // Color page grade: wheel offsets in [-1, 1] plus primary sliders.
  grade: {
    lift: { x: 0, y: 0 },
    gamma: { x: 0, y: 0 },
    gain: { x: 0, y: 0 },
    saturation: 1,
    exposure: 0,
    contrast: 1,
  },
})

function mkClip(poolItem, trackId, start, duration) {
  return {
    id: nid('c'),
    poolId: poolItem.id,
    trackId,
    name: poolItem.name,
    icon: poolItem.icon || 'film',
    grad: poolItem.grad,
    url: poolItem.url || null,
    kind: trackId === 'a1' ? 'audio' : 'video',
    start: snap(Math.max(0, start)),
    duration: Math.max(1, duration ?? poolItem.duration),
    offset: 0,
    tx: 0,
    ty: 0,
    zoom: 1,
    opacity: 1,
  }
}

// Seed the timeline so the edit page is alive on first open.
state.clips.push(
  mkClip(state.pool[1], 'v1', 0, 8),
  mkClip(state.pool[2], 'v1', 8, 10),
  mkClip(state.pool[0], 'v2', 2, 6),
  mkClip({ id: 'mx', name: 'Ambient Pad', icon: 'music', grad: 'linear-gradient(135deg,#11998e,#38ef7d)', duration: 20 }, 'a1', 0, 20),
)

// Probe the real source duration from the video itself (loadedmetadata):
// update the pool item's duration and cap timeline clips that outrun it.
function probeDuration(item) {
  if (!item.url) return
  const v = document.createElement('video')
  v.preload = 'metadata'
  v.muted = true
  const done = () => {
    v.removeAttribute('src')
    v.load()
  }
  v.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(v.duration) && v.duration > 0) {
      item.duration = +v.duration.toFixed(3)
      for (const c of state.clips) {
        if (c.poolId === item.id && c.offset + c.duration > item.duration)
          c.duration = Math.max(1, snap(item.duration - c.offset))
      }
    }
    done()
  }, { once: true })
  v.addEventListener('error', done, { once: true })
  v.src = item.url
}

state.pool.forEach(probeDuration)

export const trackOf = (clip) => state.tracks.find((t) => t.id === clip.trackId)

export const contentEnd = computed(() =>
  state.clips.reduce((end, c) => Math.max(end, c.start + c.duration), 0),
)

// Ruler length: content plus a tail, minimum 30s.
export const timelineLen = computed(() => Math.max(30, Math.ceil(contentEnd.value + 8)))

export const selectedClip = computed(
  () => state.clips.find((c) => c.id === state.selectedClipId) || null,
)

// Topmost video clip under the playhead (V2 over V1), muted tracks skipped.
export const programClip = computed(() => {
  for (const track of state.tracks) {
    if (track.kind !== 'video' || track.muted) continue
    const hit = state.clips.find(
      (c) => c.trackId === track.id && state.playhead >= c.start && state.playhead < c.start + c.duration,
    )
    if (hit) return hit
  }
  return null
})

/* ------------------------------ playback ------------------------------ */

let timer = null

export function play() {
  if (state.playing) return
  if (state.playhead >= contentEnd.value) state.playhead = 0
  state.playing = true
  timer = setInterval(() => {
    state.playhead = +(state.playhead + 0.1).toFixed(3)
    if (state.playhead >= contentEnd.value) {
      if (state.loop) state.playhead = 0
      else {
        state.playhead = contentEnd.value
        pause()
      }
    }
  }, 100)
}

export function pause() {
  state.playing = false
  if (timer) clearInterval(timer)
  timer = null
}

export const togglePlay = () => (state.playing ? pause() : play())

export function stepFrame(dir) {
  pause()
  state.playhead = clamp(+(state.playhead + dir / FPS).toFixed(4), 0, contentEnd.value)
}

export const goStart = () => { state.playhead = 0 }
export const goEnd = () => { state.playhead = contentEnd.value }
export const nudge = (dt) => { state.playhead = clamp(state.playhead + dt, 0, contentEnd.value) }

/* ---------------------------- clip editing ---------------------------- */

let importIdx = 0

// Import cycles the real sample videos; repeats get a take number suffix.
export function importVideo() {
  const src = IMPORT_SOURCES[importIdx++ % IMPORT_SOURCES.length]
  const takes = state.pool.filter((p) => p.name === src.name || p.name.startsWith(`${src.name} `)).length
  const item = {
    id: nid('m'),
    name: takes ? `${src.name} ${takes + 1}` : src.name,
    icon: src.icon,
    grad: src.grad,
    url: src.url,
    duration: 8, // placeholder until the metadata probe reports the real length
  }
  state.pool.push(item)
  probeDuration(item)
  return item
}

export function addToTimeline(poolItem, trackId, at) {
  const track = state.tracks.find((t) => t.id === trackId)
  if (!track || track.locked) return null
  const clip = mkClip(poolItem, trackId, at, poolItem.duration)
  state.clips.push(clip)
  state.selectedClipId = clip.id
  return clip
}

export function splitClip(clip, at) {
  at = snap(at)
  if (at <= clip.start || at >= clip.start + clip.duration) return null
  if (clip.start + clip.duration - at < 1 || at - clip.start < 1) return null // keep 1s min
  const right = {
    ...clip,
    id: nid('c'),
    start: at,
    duration: clip.start + clip.duration - at,
    offset: clip.offset + (at - clip.start),
  }
  clip.duration = at - clip.start
  state.clips.push(right)
  state.selectedClipId = right.id
  return right
}

export const playheadInside = (clip) =>
  state.playhead > clip.start && state.playhead < clip.start + clip.duration

export function splitAtPlayhead(clip) {
  return playheadInside(clip) ? splitClip(clip, state.playhead) : null
}

export function removeClip(clip) {
  const i = state.clips.indexOf(clip)
  if (i >= 0) state.clips.splice(i, 1)
  if (state.selectedClipId === clip.id) state.selectedClipId = null
}

export function rippleDelete(clip) {
  const gap = clip.duration
  const { trackId, start } = clip
  removeClip(clip)
  for (const c of state.clips) {
    if (c.trackId === trackId && c.start >= start + gap) c.start = snap(c.start - gap)
  }
  if (state.playhead > contentEnd.value) state.playhead = contentEnd.value
}

export function selectClip(clip) {
  state.selectedClipId = clip ? clip.id : null
}

/* ------------------------------ color grade ----------------------------- */

// CSS-filter approximation of the wheel offsets + primaries. Lift/gamma/gain
// y biases brightness/contrast, x biases hue; sliders scale on top.
export const gradeFilter = computed(() => {
  const g = state.grade
  const hue = (g.lift.x * 0.5 + g.gamma.x + g.gain.x * 0.5) * 24
  const brightness = clamp(1 + g.exposure * 0.4 + g.gain.y * 0.22 + g.lift.y * 0.08, 0.3, 2.2)
  const contrast = clamp(g.contrast * (1 + g.gamma.y * 0.18 + g.lift.y * 0.06), 0.3, 2.5)
  const saturate = clamp(g.saturation * (1 + g.gamma.y * 0.12), 0, 3)
  return (
    `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) ` +
    `saturate(${saturate.toFixed(3)}) hue-rotate(${hue.toFixed(1)}deg)`
  )
})

export function resetGrade() {
  for (const w of ['lift', 'gamma', 'gain']) {
    state.grade[w].x = 0
    state.grade[w].y = 0
  }
  state.grade.saturation = 1
  state.grade.exposure = 0
  state.grade.contrast = 1
}
