<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import ListIcon from './ListIcon.vue'

const STORE_KEY = 'macos-web:reminders'
const DAY = 86400000

const SMART = [
  { id: 'today', name: 'Today', icon: 'calendar', color: '#007aff' },
  { id: 'scheduled', name: 'Scheduled', icon: 'clock', color: '#ff3b30' },
  { id: 'all', name: 'All', icon: 'tray', color: '#8e8e93' },
  { id: 'flagged', name: 'Flagged', icon: 'flag', color: '#ff9500' },
]

const LISTS = [
  { id: 'groceries', name: 'Groceries', icon: 'cart', color: '#34c759' },
  { id: 'work', name: 'Work', icon: 'briefcase', color: '#007aff' },
  { id: 'personal', name: 'Personal', icon: 'home', color: '#af52de' },
]

const listOf = (r) => LISTS.find((l) => l.id === r.listId) || LISTS[0]
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function seedReminders() {
  const t = startOfToday()
  const at = (dayOffset, h, m = 0) => t + dayOffset * DAY + h * 3600000 + m * 60000
  const mk = (id, listId, title, notes, due, flagged) => ({
    id,
    listId,
    title,
    notes,
    due,
    flagged,
    completed: false,
    created: t + id * 1000,
  })
  return [
    mk(1, 'groceries', 'Milk & eggs', '2% milk, free-range eggs', at(0, 18, 30), false),
    mk(2, 'groceries', 'Coffee beans', '', null, true),
    mk(3, 'work', 'Finish quarterly report', 'Send to Sarah for review', at(0, 17), true),
    mk(4, 'work', 'Prepare 1:1 agenda', '', at(1, 9, 30), false),
    mk(5, 'personal', 'Call grandma', 'Ask about the lake house trip', at(0, 19), false),
    mk(6, 'personal', 'Book dentist appointment', '', at(6, 10), true),
    {
      ...mk(7, 'groceries', 'Buy dish soap', '', null, false),
      completed: true,
      completedAt: t - 3600000,
    },
  ]
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Array.isArray(data.reminders)) return null
    return data.reminders.filter((r) => r && typeof r.title === 'string')
  } catch {
    return null
  }
}

const reminders = ref(loadState() || seedReminders())
const view = ref('today')
const draft = ref('')
const showCompleted = ref(true)
const addInput = ref(null)

watch(
  reminders,
  (val) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ reminders: val }))
    } catch {
      /* storage full — ignore */
    }
  },
  { deep: true }
)

const isSmart = computed(() => SMART.some((s) => s.id === view.value))
const current = computed(() => SMART.find((s) => s.id === view.value) || LISTS.find((l) => l.id === view.value))

function matches(r, v) {
  if (r.completed) return false
  if (v === 'today') return r.due != null && r.due <= startOfToday() + DAY - 1
  if (v === 'scheduled') return r.due != null
  if (v === 'all') return true
  if (v === 'flagged') return r.flagged
  return r.listId === v
}

const countFor = (v) => reminders.value.filter((r) => matches(r, v)).length

const visible = computed(() => {
  const list = reminders.value.filter((r) => matches(r, view.value))
  if (view.value === 'today' || view.value === 'scheduled') return list.sort((a, b) => a.due - b.due)
  return list.sort((a, b) => b.created - a.created)
})

const completedInView = computed(() =>
  isSmart.value
    ? []
    : reminders.value.filter((r) => r.completed && r.listId === view.value).sort((a, b) => b.created - a.created)
)

const newId = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

function addReminder() {
  const title = draft.value.trim()
  if (!title) return
  const t = startOfToday()
  const r = {
    id: newId(),
    listId: isSmart.value ? 'personal' : view.value,
    title,
    notes: '',
    due: null,
    flagged: view.value === 'flagged',
    completed: false,
    created: Date.now(),
  }
  if (view.value === 'today') r.due = t + 18 * 3600000
  if (view.value === 'scheduled') r.due = t + DAY + 9 * 3600000
  reminders.value.unshift(r)
  draft.value = ''
  nextTick(() => addInput.value?.focus())
}

function toggleComplete(r) {
  r.completed = !r.completed
  r.completedAt = r.completed ? Date.now() : null
}

const toggleFlag = (r) => (r.flagged = !r.flagged)
const remove = (r) => (reminders.value = reminders.value.filter((x) => x.id !== r.id))

const isOverdue = (r) => r.due != null && !r.completed && r.due < Date.now()

function dueLabel(ts) {
  const d = new Date(ts)
  const day = new Date(ts)
  day.setHours(0, 0, 0, 0)
  const diff = Math.round((day.getTime() - startOfToday()) / DAY)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  let when
  if (diff === 0) when = 'Today'
  else if (diff === 1) when = 'Tomorrow'
  else if (diff === -1) when = 'Yesterday'
  else when = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
  return `${when}, ${time}`
}

function circleStyle(r) {
  const c = listOf(r).color
  return r.completed ? { background: c, borderColor: c, color: '#fff' } : { borderColor: c + 'a6', color: 'transparent' }
}
</script>

<template>
  <div class="app-root rem-root">
    <aside class="sidebar">
      <div class="smart-grid">
        <div
          v-for="s in SMART"
          :key="s.id"
          class="smart-tile"
          :class="{ active: view === s.id }"
          @click="view = s.id"
        >
          <div class="st-top">
            <span class="st-badge" :style="{ background: s.color }"><ListIcon :name="s.icon" /></span>
            <span class="st-count">{{ countFor(s.id) }}</span>
          </div>
          <div class="st-name" :style="view === s.id ? { color: s.color } : {}">{{ s.name }}</div>
        </div>
      </div>

      <div class="side-label">My Lists</div>
      <div
        v-for="l in LISTS"
        :key="l.id"
        class="side-row"
        :class="{ active: view === l.id }"
        @click="view = l.id"
      >
        <span class="side-badge" :style="{ background: l.color }"><ListIcon :name="l.icon" /></span>
        <span class="side-name">{{ l.name }}</span>
        <span class="side-count">{{ countFor(l.id) }}</span>
      </div>
    </aside>

    <main class="main">
      <header class="head">
        <h1 class="title" :style="{ color: current.color }">{{ current.name }}</h1>
        <span class="head-count" :style="{ color: current.color }">{{ visible.length }}</span>
      </header>

      <div class="scroll">
        <div class="add-row">
          <span class="add-circle"></span>
          <input
            ref="addInput"
            v-model="draft"
            class="add-input"
            type="text"
            placeholder="Add Reminder"
            spellcheck="false"
            @keydown.enter.prevent="addReminder"
          />
        </div>

        <div v-if="!visible.length" class="empty">No Reminders</div>

        <div v-for="r in visible" :key="r.id" class="row">
          <button class="check" :style="circleStyle(r)" title="Complete" @click="toggleComplete(r)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
          <div class="row-main">
            <div class="row-title">{{ r.title }}</div>
            <div v-if="r.notes" class="row-notes">{{ r.notes }}</div>
            <div v-if="r.due" class="row-due" :class="{ overdue: isOverdue(r) }">
              {{ dueLabel(r.due) }}<template v-if="isSmart"> · {{ listOf(r).name }}</template>
            </div>
            <div v-else-if="isSmart" class="row-due">{{ listOf(r).name }}</div>
          </div>
          <div class="row-actions">
            <button
              class="act flag"
              :class="{ on: r.flagged }"
              :title="r.flagged ? 'Remove flag' : 'Flag'"
              @click="toggleFlag(r)"
            ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></button>
            <button class="act del" title="Delete" @click="remove(r)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>

        <template v-if="completedInView.length">
          <div class="comp-head">
            <span class="comp-count">{{ completedInView.length }} Completed</span>
            <button class="comp-toggle" @click="showCompleted = !showCompleted">
              {{ showCompleted ? 'Hide' : 'Show' }}
            </button>
          </div>
          <template v-if="showCompleted">
            <div v-for="r in completedInView" :key="r.id" class="row done">
              <button class="check" :style="circleStyle(r)" title="Mark incomplete" @click="toggleComplete(r)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
              <div class="row-main">
                <div class="row-title">{{ r.title }}</div>
                <div v-if="r.notes" class="row-notes">{{ r.notes }}</div>
              </div>
              <div class="row-actions">
                <button class="act del" title="Delete" @click="remove(r)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
            </div>
          </template>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.rem-root {
  flex-direction: row;
  background: var(--window-bg);
  color: var(--text);
}

/* Sidebar */
.sidebar {
  width: 216px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
  padding: 12px 0 10px;
  overflow-y: auto;
}
.smart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 12px 12px;
}
.smart-tile {
  background: var(--window-bg);
  border: 0.5px solid var(--border);
  border-radius: 10px;
  padding: 8px 9px 7px;
  cursor: default;
}
.smart-tile:hover {
  background: var(--hover);
}
.smart-tile.active {
  background: var(--selection);
}
.st-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}
.st-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
}
.st-badge svg {
  width: 15px;
  height: 15px;
  display: block;
}
.st-count {
  font-size: 20px;
  font-weight: 700;
}
.st-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
}
.side-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  padding: 4px 16px 5px;
}
.side-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 1px 10px;
  padding: 4px 8px;
  border-radius: 7px;
  font-size: 13px;
  cursor: default;
}
.side-row:hover:not(.active) {
  background: var(--hover);
}
.side-row.active {
  background: var(--selection);
}
.side-badge {
  width: 23px;
  height: 23px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
  color: #fff;
}
.side-badge svg {
  width: 12px;
  height: 12px;
  display: block;
}
.side-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.side-count {
  color: var(--text-dim);
  font-size: 12px;
}

/* Main pane */
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 18px 26px 10px;
  flex-shrink: 0;
}
.title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
}
.head-count {
  font-size: 22px;
  font-weight: 700;
}
.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 24px;
}

/* Add row */
.add-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 0.5px solid var(--border);
}
.add-circle {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  border: 1.5px dashed var(--text-dim);
  flex-shrink: 0;
  opacity: 0.6;
}
.add-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  padding: 2px 0;
}

/* Reminder rows */
.row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 0.5px solid var(--border);
}
.check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid;
  background: transparent;
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 11px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  padding: 0;
}
.check svg {
  width: 10px;
  height: 10px;
  display: block;
}
.row:not(.done) .check:hover {
  color: var(--text-dim) !important;
}
.row-main {
  flex: 1;
  min-width: 0;
  cursor: default;
}
.row-title {
  font-size: 13px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.row-notes {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 1px;
  overflow-wrap: anywhere;
}
.row-due {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
}
.row-due.overdue {
  color: #ff3b30;
}
.row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.act {
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 6px;
  line-height: 1;
  opacity: 0;
  display: flex;
  align-items: center;
}
.act svg {
  width: 13px;
  height: 13px;
  display: block;
}
.row:hover .act {
  opacity: 0.65;
}
.act:hover {
  background: var(--hover);
  opacity: 1 !important;
}
.act.flag.on {
  opacity: 1;
  color: #ff9500;
}
.act.del {
  font-size: 11px;
}
.act.del svg {
  width: 11px;
  height: 11px;
}

/* Completed section */
.comp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 10px 4px;
}
.comp-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-dim);
}
.comp-toggle {
  font-size: 12px;
  color: var(--accent);
  padding: 2px 6px;
  border-radius: 6px;
}
.comp-toggle:hover {
  background: var(--hover);
}
.row.done .row-title {
  text-decoration: line-through;
  color: var(--text-dim);
}
.row.done .row-notes {
  opacity: 0.7;
}

.empty {
  padding: 42px 0;
  text-align: center;
  color: var(--text-dim);
  font-size: 14px;
}
</style>
