<script setup>
import { ref, watch } from 'vue'
import StickyNote from './StickyNote.vue'

const STORE_KEY = 'macos-web:stickies'

// Paper palette — `fold` is a darker shade of each sheet, used for the dog-ear corner.
const COLORS = {
  yellow: { bg: '#fff9a8', fold: '#e9dd7f' },
  pink: { bg: '#ffd6e0', fold: '#f2b7c8' },
  green: { bg: '#dcf7c5', fold: '#bfe79d' },
  blue: { bg: '#d6e9ff', fold: '#b2d1f2' },
  purple: { bg: '#ead9ff', fold: '#cfb6f0' },
}
const COLOR_KEYS = Object.keys(COLORS)

function seedStickies() {
  return [
    {
      id: 's-welcome',
      text:
        'Welcome to Stickies! 📌\n\n' +
        '• Click anywhere on a note and just type — it saves as you go\n' +
        '• Drag a note around by its top strip\n' +
        '• Double-click the strip to roll the note up into a bar',
      color: 'yellow',
      x: 60, y: 52, rot: -1.2, collapsed: false, z: 1,
    },
    {
      id: 's-hover',
      text:
        'Hover a note to reveal its secrets:\n\n' +
        '✕  close it (top-left)\n' +
        '● ● ● ● ●  repaint it (bottom)\n\n' +
        'The ＋ button above grows a fresh note.',
      color: 'pink',
      x: 336, y: 118, rot: 0.9, collapsed: false, z: 2,
    },
    {
      id: 's-paper',
      text:
        'Notes keep their slightly wonky rotation and folded corner — like real paper stuck to a desk.\n\n' +
        'Everything lives in your browser. No cloud required ☁️🚫',
      color: 'green',
      x: 618, y: 68, rot: 1.4, collapsed: false, z: 3,
    },
  ]
}

function loadStickies() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY))
    if (!Array.isArray(data)) return null
    const valid = data.filter((n) => n && typeof n.id === 'string' && COLORS[n.color])
    return valid.length ? valid : null
  } catch {
    return null
  }
}

const stickies = ref(loadStickies() || seedStickies())
let topZ = stickies.value.reduce((m, n) => Math.max(m, n.z || 0), 0)
let cascade = 0

// Debounced autosave — dragging a note patches it many times per second.
let saveTimer = null
watch(
  stickies,
  () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(stickies.value))
      } catch {
        /* storage full — ignore */
      }
    }, 250)
  },
  { deep: true }
)

const byId = (id) => stickies.value.find((n) => n.id === id)

function patchNote(id, patch) {
  const note = byId(id)
  if (note) Object.assign(note, patch)
}

function bringToFront(id) {
  const note = byId(id)
  if (note && note.z !== topZ) note.z = ++topZ
}

function removeNote(id) {
  const i = stickies.value.findIndex((n) => n.id === id)
  if (i !== -1) stickies.value.splice(i, 1)
}

function addSticky() {
  const color = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)]
  const step = (cascade++ % 6) * 30
  stickies.value.push({
    id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: '',
    color,
    x: 96 + step,
    y: 72 + step,
    rot: Math.round((Math.random() * 3 - 1.5) * 10) / 10,
    collapsed: false,
    z: ++topZ,
  })
}
</script>

<template>
  <div class="app-root stickies-app">
    <div class="toolbar">
      <button class="new-note" title="New Note" @click="addSticky">
        <span class="plus">＋</span> New Note
      </button>
      <span class="spacer" />
      <span class="count">{{ stickies.length }} {{ stickies.length === 1 ? 'note' : 'notes' }}</span>
    </div>

    <div class="board">
      <StickyNote
        v-for="note in stickies"
        :key="note.id"
        :note="note"
        :colors="COLORS"
        @patch="patchNote(note.id, $event)"
        @remove="removeNote(note.id)"
        @front="bringToFront(note.id)"
      />

      <div v-if="!stickies.length" class="empty">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><polyline points="15 3 15.5 8.5 21 8.5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></div>
        <p>No stickies on the board</p>
        <button class="new-note" @click="addSticky"><span class="plus">＋</span> New Note</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stickies-app {
  background: var(--window-bg);
}

.toolbar {
  flex: none;
  height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-bottom: 0.5px solid var(--border);
  background: var(--sidebar-bg);
}

.spacer {
  flex: 1;
}

.new-note {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 11px;
  border-radius: 7px;
  border: 0.5px solid var(--border);
  background: var(--window-bg);
  color: var(--text);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.new-note:hover {
  background: var(--hover);
}

.new-note:active {
  transform: scale(0.97);
}

.plus {
  font-size: 14px;
  line-height: 1;
}

.count {
  font-size: 12px;
  color: var(--text-dim);
}

.board {
  position: relative;
  flex: 1;
  overflow: hidden;
  background-color: var(--window-bg);
  background-image: radial-gradient(circle, rgba(127, 127, 127, 0.22) 1px, transparent 1.2px);
  background-size: 24px 24px;
}

.empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-dim);
  pointer-events: none;
}

.empty .new-note {
  pointer-events: auto;
}

.empty-icon {
  opacity: 0.6;
}
.empty-icon svg {
  width: 46px;
  height: 46px;
  display: block;
  margin: 0 auto;
}

.empty p {
  margin: 0 0 6px;
  font-size: 13px;
}
</style>
