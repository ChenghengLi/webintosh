<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

// Voice Memos has a fixed dark theme on macOS — this app does too.
const BAR_COUNT = 90
const LS_KEY = 'macos-web:voicememos'

// ---------- helpers ----------
function fmtTime(s) {
  s = Math.max(0, Math.round(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
function fmtTimer(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const tenth = Math.floor((s % 1) * 10)
  return `${m}:${String(sec).padStart(2, '0')}.${tenth}`
}
function fmtDate(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
}
// Natural-looking pseudo-random waveform (deterministic per seed).
function makeBars(seed, n = BAR_COUNT) {
  let x = (seed % 100000) * 9973 + 7
  const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647 }
  const bars = []
  let level = 0.3
  for (let i = 0; i < n; i++) {
    level += (rnd() - 0.5) * 0.35
    level = Math.min(0.98, Math.max(0.08, level))
    const envelope = 0.55 + 0.45 * Math.sin((i / n) * Math.PI) // quieter ends
    bars.push(Math.round(level * envelope * 100) / 100)
  }
  return bars
}
// Fit any number of recorded bars into BAR_COUNT for display.
function normalizeBars(src) {
  if (!src.length) return makeBars(Date.now())
  if (src.length <= BAR_COUNT) {
    return Array.from({ length: BAR_COUNT }, (_, i) => src[Math.floor((i / BAR_COUNT) * src.length)])
  }
  const out = []
  const chunk = src.length / BAR_COUNT
  for (let i = 0; i < BAR_COUNT; i++) {
    let sum = 0, c = 0
    for (let j = Math.floor(i * chunk); j < Math.floor((i + 1) * chunk); j++) { sum += src[j]; c++ }
    out.push(Math.round((sum / Math.max(1, c)) * 100) / 100)
  }
  return out
}

// ---------- recordings list ----------
function seedMemos() {
  const now = Date.now()
  const day = 86400000
  return [
    { id: 'm1', name: 'New Recording 3', date: now - 2 * 3600000, duration: 47, bars: makeBars(11) },
    { id: 'm2', name: 'Guitar riff idea', date: now - day, duration: 82, bars: makeBars(29) },
    { id: 'm3', name: 'Lecture — Week 7', date: now - 4 * day, duration: 213, bars: makeBars(53) },
  ]
}
function loadMemos() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list) && list.every((m) => m && m.id && Array.isArray(m.bars))) return list
    }
  } catch { /* fall through to seeds */ }
  return seedMemos()
}

const memos = ref(loadMemos())
const selectedId = ref(memos.value[0]?.id || null)
const selected = computed(() => memos.value.find((m) => m.id === selectedId.value) || null)

watch(memos, (list) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}, { deep: true })

function selectMemo(id) {
  if (recording.value || id === selectedId.value) return
  pause()
  selectedId.value = id
  elapsed.value = 0
}
function playMemo(m) {
  if (recording.value) return
  if (m.id === selectedId.value) {
    togglePlay()
    return
  }
  selectMemo(m.id)
  play()
}
function removeMemo(id) {
  const i = memos.value.findIndex((m) => m.id === id)
  if (i === -1) return
  const wasSelected = selectedId.value === id
  memos.value.splice(i, 1)
  if (wasSelected) {
    pause()
    selectedId.value = memos.value[0]?.id || null
    elapsed.value = 0
  }
}

// ---------- rename (double-click) ----------
const editingId = ref(null)
const editName = ref('')
function beginRename(m) {
  editingId.value = m.id
  editName.value = m.name
  nextTick(() => document.querySelector('.rename-input')?.select())
}
function commitRename(m) {
  const name = editName.value.trim()
  if (name) m.name = name
  editingId.value = null
}

// ---------- playback ----------
const playing = ref(false)
const elapsed = ref(0)
let playTimer = null

const playedBars = computed(() => {
  const m = selected.value
  if (!m) return 0
  return Math.floor((elapsed.value / m.duration) * m.bars.length)
})

function play() {
  const m = selected.value
  if (!m || recording.value) return
  if (elapsed.value >= m.duration) elapsed.value = 0
  playing.value = true
  clearInterval(playTimer)
  playTimer = setInterval(() => {
    const cur = selected.value
    if (!cur) { pause(); return }
    elapsed.value = Math.min(cur.duration, elapsed.value + 0.1)
    if (elapsed.value >= cur.duration) pause()
  }, 100)
}
function pause() {
  playing.value = false
  clearInterval(playTimer)
  playTimer = null
}
function togglePlay() {
  playing.value ? pause() : play()
}
function skip(delta) {
  const m = selected.value
  if (!m || recording.value) return
  elapsed.value = Math.min(m.duration, Math.max(0, elapsed.value + delta))
}
function seek(e) {
  const m = selected.value
  if (!m || recording.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  elapsed.value = Math.round(frac * m.duration * 10) / 10
}

// ---------- recording ----------
const recording = ref(false)
const recElapsed = ref(0)
const recBars = ref([])
const recWaveEl = ref(null)
let recTimer = null

function startRecording() {
  if (recording.value) return
  pause()
  recording.value = true
  recElapsed.value = 0
  recBars.value = []
  let level = 0.35
  recTimer = setInterval(() => {
    recElapsed.value += 0.25
    level += (Math.random() - 0.5) * 0.45
    level = Math.min(0.98, Math.max(0.1, level))
    recBars.value.push(Math.round(level * 100) / 100)
    nextTick(() => {
      const el = recWaveEl.value
      if (el) el.scrollLeft = el.scrollWidth
    })
  }, 250)
}
function stopRecording() {
  clearInterval(recTimer)
  recTimer = null
  recording.value = false
  if (recElapsed.value < 0.5) { recBars.value = []; return } // discard accidental taps
  const memo = {
    id: 'm' + Date.now(),
    name: `New Recording ${memos.value.length + 1}`,
    date: Date.now(),
    duration: Math.max(1, Math.round(recElapsed.value)),
    bars: normalizeBars(recBars.value),
  }
  recBars.value = []
  memos.value.unshift(memo)
  selectedId.value = memo.id
  elapsed.value = 0
}

onUnmounted(() => {
  clearInterval(playTimer)
  clearInterval(recTimer)
})
</script>

<template>
  <div class="app-root vm">
    <!-- sidebar: recordings list -->
    <aside class="sidebar">
      <div class="side-head">
        <span>All Recordings</span>
        <span class="count">{{ memos.length }}</span>
      </div>
      <div class="list">
        <div v-if="!memos.length" class="list-empty">No Recordings</div>
        <div
          v-for="m in memos"
          :key="m.id"
          class="row"
          :class="{ sel: m.id === selectedId }"
          @click="selectMemo(m.id)"
        >
          <button
            class="row-play"
            :class="{ active: m.id === selectedId && playing }"
            :title="m.id === selectedId && playing ? 'Pause' : 'Play'"
            @click.stop="playMemo(m)"
          >
            <svg v-if="!(m.id === selectedId && playing)" viewBox="0 0 24 24">
              <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
            </svg>
            <svg v-else viewBox="0 0 24 24">
              <rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" />
              <rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" />
            </svg>
          </button>
          <div class="row-main">
            <input
              v-if="editingId === m.id"
              v-model="editName"
              class="rename-input"
              @keyup.enter="commitRename(m)"
              @keyup.esc="editingId = null"
              @blur="commitRename(m)"
              @click.stop
            />
            <div v-else class="name" :title="m.name" @dblclick.stop="beginRename(m)">{{ m.name }}</div>
            <div class="meta">
              <span>{{ fmtDate(m.date) }}</span>
              <span class="dur">{{ fmtTime(m.duration) }}</span>
            </div>
          </div>
          <div class="row-actions">
            <button class="act" title="Edit name" @click.stop="beginRename(m)">
              <svg viewBox="0 0 24 24">
                <path
                  d="M17.2 3.3a2.2 2.2 0 0 1 3.1 3.1L8.6 18.1 4 19.4l1.3-4.6z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button class="act" title="Delete" @click.stop="removeMemo(m.id)">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4.5 6.5h15M9.5 6V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3V6M6.5 6.5l.9 12a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12M10 10.5v6M14 10.5v6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- main pane -->
    <main class="main">
      <!-- recording view -->
      <template v-if="recording">
        <div class="detail-head">
          <div class="d-title">New Recording</div>
          <div class="d-sub">{{ fmtDate(Date.now()) }}</div>
        </div>
        <div class="rec-timer">{{ fmtTimer(recElapsed) }}</div>
        <div class="rec-wave" ref="recWaveEl">
          <div class="rec-bars">
            <div
              v-for="(b, i) in recBars"
              :key="i"
              class="bar rec-bar"
              :style="{ height: b * 100 + '%' }"
            ></div>
            <div class="bar rec-bar live"></div>
          </div>
        </div>
        <div class="controls">
          <button class="stop-btn" title="Stop" @click="stopRecording">
            <span class="stop-sq"></span>
          </button>
        </div>
      </template>

      <!-- playback view -->
      <template v-else-if="selected">
        <div class="detail-head">
          <div class="d-title">{{ selected.name }}</div>
          <div class="d-sub">{{ fmtDate(selected.date) }}</div>
        </div>
        <div class="wave" @click="seek">
          <div
            v-for="(b, i) in selected.bars"
            :key="i"
            class="bar"
            :class="{ played: i < playedBars }"
            :style="{ height: b * 100 + '%' }"
          ></div>
          <div class="playhead" :style="{ left: (elapsed / selected.duration) * 100 + '%' }"></div>
        </div>
        <div class="times">
          <span :style="{ color: elapsed > 0 ? '#f2f2f7' : '' }">{{ fmtTime(elapsed) }}</span>
          <span>{{ fmtTime(selected.duration) }}</span>
        </div>
        <div class="controls">
          <button class="skip" title="Skip back 15 seconds" @click="skip(-15)">
            <svg viewBox="0 0 24 24">
              <path d="M12 5a7 7 0 1 1-6.3 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              <path d="M4.6 4v5h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
              <text x="13.4" y="15.8" font-size="7.5" font-weight="600" fill="currentColor" text-anchor="middle">15</text>
            </svg>
          </button>
          <button class="play-btn" :title="playing ? 'Pause' : 'Play'" @click="togglePlay">
            <svg v-if="!playing" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>
            <svg v-else viewBox="0 0 24 24"><rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor"/><rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor"/></svg>
          </button>
          <button class="skip" title="Skip forward 15 seconds" @click="skip(15)">
            <svg viewBox="0 0 24 24" style="transform: scaleX(-1)">
              <path d="M12 5a7 7 0 1 1-6.3 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              <path d="M4.6 4v5h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
              <text x="13.4" y="15.8" font-size="7.5" font-weight="600" fill="currentColor" text-anchor="middle" transform="translate(24,0) scale(-1,1)">15</text>
            </svg>
          </button>
          <div class="ctl-sep"></div>
          <button class="rec-btn small" title="Record" @click="startRecording">
            <span class="rec-dot"></span>
          </button>
        </div>
      </template>

      <!-- empty state -->
      <template v-else>
        <div class="empty">
          <div class="empty-title">No Recording Selected</div>
          <div class="empty-sub">Click the record button to start a new recording.</div>
          <button class="rec-btn" title="Record" @click="startRecording">
            <span class="rec-dot"></span>
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
/* Fixed dark theme, matching the real Voice Memos app. */
.vm {
  flex-direction: row;
  background: #1b1b1d;
  color: #f2f2f7;
  font-size: 13px;
  user-select: none;
}

/* ---------- sidebar ---------- */
.sidebar {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #232325;
  border-right: 0.5px solid rgba(255, 255, 255, 0.08);
}
.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  font-size: 15px;
  font-weight: 700;
}
.count {
  font-size: 11px;
  font-weight: 600;
  color: #8e8e93;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  padding: 1px 7px;
}
.list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}
.list-empty {
  padding: 20px 10px;
  color: #8e8e93;
  text-align: center;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: default;
  margin-bottom: 2px;
}
.row:hover:not(.sel) {
  background: rgba(255, 255, 255, 0.06);
}
.row.sel {
  background: #0a84ff;
}
.row-play {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #f2f2f7;
  cursor: pointer;
  padding: 6px;
  flex-shrink: 0;
  transition: background 0.15s;
}
.row-play:hover {
  background: rgba(255, 255, 255, 0.22);
}
.row-play svg {
  width: 100%;
  height: 100%;
  display: block;
}
.row.sel .row-play {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}
.row-main {
  flex: 1;
  min-width: 0;
}
.name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rename-input {
  width: 100%;
  font: inherit;
  font-weight: 600;
  color: #f2f2f7;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid #0a84ff;
  border-radius: 4px;
  padding: 1px 4px;
  outline: none;
  box-sizing: border-box;
}
.meta {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  font-size: 11px;
  color: #8e8e93;
}
.row.sel .meta {
  color: rgba(255, 255, 255, 0.75);
}
.dur {
  font-variant-numeric: tabular-nums;
}
.row-actions {
  display: none;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
  flex-shrink: 0;
}
.row:hover .row-actions,
.row.sel .row-actions {
  display: flex;
}
.act {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  padding: 5px;
}
.act:hover {
  background: rgba(255, 255, 255, 0.28);
}
.act svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* ---------- main pane ---------- */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 28px 22px;
  min-width: 0;
}
.detail-head {
  align-self: flex-start;
  margin-bottom: 8px;
}
.d-title {
  font-size: 17px;
  font-weight: 700;
}
.d-sub {
  font-size: 12px;
  color: #8e8e93;
  margin-top: 2px;
}

/* waveform (saved memo) */
.wave {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 120px;
  max-height: 260px;
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 12px;
  cursor: crosshair;
}
.bar {
  flex: 1;
  min-width: 2px;
  border-radius: 2px;
  background: rgba(94, 141, 217, 0.35);
  transition: background 0.12s linear;
}
.bar.played {
  background: #5e8dd9;
}
.playhead {
  position: absolute;
  top: 6%;
  bottom: 6%;
  width: 1.5px;
  background: rgba(255, 255, 255, 0.85);
  transform: translateX(-50%);
  pointer-events: none;
  border-radius: 1px;
}
.times {
  width: 100%;
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #8e8e93;
}

/* recording view */
.rec-timer {
  font-size: 44px;
  font-weight: 200;
  font-variant-numeric: tabular-nums;
  margin: 26px 0 8px;
}
.rec-wave {
  flex: 1;
  width: 100%;
  min-height: 120px;
  max-height: 220px;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  align-items: center;
  scrollbar-width: none;
}
.rec-wave::-webkit-scrollbar {
  display: none;
}
.rec-bars {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 100%;
  min-width: 100%;
  justify-content: flex-end;
  padding: 0 2px;
  box-sizing: border-box;
}
.rec-bar {
  flex: 0 0 3px;
  background: #5e8dd9;
}
.rec-bar.live {
  height: 6% !important;
  background: rgba(94, 141, 217, 0.45);
  animation: pulse 0.5s ease-in-out infinite alternate;
}
@keyframes pulse {
  from { height: 4%; }
  to { height: 22%; }
}

/* ---------- controls ---------- */
.controls {
  display: flex;
  align-items: center;
  gap: 34px;
  margin-top: 16px;
  height: 52px;
}
.play-btn {
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #f2f2f7;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.1s;
}
.play-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
.play-btn:active {
  transform: scale(0.94);
}
.play-btn svg {
  width: 26px;
  height: 26px;
}
.skip {
  width: 34px;
  height: 34px;
  border: none;
  background: none;
  color: #c7c7cc;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}
.skip:hover {
  color: #fff;
}
.skip svg {
  width: 100%;
  height: 100%;
  display: block;
}
.ctl-sep {
  width: 0.5px;
  height: 30px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 -12px;
}
.rec-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.85);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: transform 0.1s;
  flex-shrink: 0;
}
.rec-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f2241b;
}
.rec-btn:hover {
  transform: scale(1.06);
}
.rec-btn:active {
  transform: scale(0.94);
}
.rec-btn.small {
  width: 30px;
  height: 30px;
  border-width: 2.5px;
}
.rec-btn.small .rec-dot {
  width: 18px;
  height: 18px;
}
.stop-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.85);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
}
.stop-btn:active {
  transform: scale(0.94);
}
.stop-sq {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: #f2241b;
}

/* empty state */
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.empty-title {
  font-size: 17px;
  font-weight: 700;
  color: #c7c7cc;
}
.empty-sub {
  font-size: 12px;
  color: #8e8e93;
  margin-bottom: 12px;
}
</style>
