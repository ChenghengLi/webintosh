<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const STORE_KEY = 'macos-web:notes'

function seedNotes() {
  const now = Date.now()
  return [
    {
      id: 'n-welcome',
      content:
        'Welcome to Notes\n' +
        'This is a fully working notes app, recreated in the style of macOS Tahoe.\n\n' +
        '• Click ✏️ in the toolbar to start a new note\n' +
        '• The first line becomes the title, styled big and bold\n' +
        '• Use the search field to filter notes by their content\n' +
        '• Select a note and click 🗑 to move it to Recently Deleted\n\n' +
        'Everything you write is saved automatically in your browser.',
      updated: now - 1000 * 60 * 60 * 26,
    },
    {
      id: 'n-todo',
      content:
        'To-Do List\n' +
        '☐ Buy groceries — milk, eggs, sourdough\n' +
        '☐ Water the plants\n' +
        '☑ Finish the macOS Web project\n' +
        '☐ Call grandma back\n' +
        '☐ Book flights for the trip\n' +
        '☐ Renew gym membership',
      updated: now - 1000 * 60 * 7,
    },
  ]
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Array.isArray(data.notes) || !Array.isArray(data.deleted)) return null
    return data
  } catch {
    return null
  }
}

const saved = loadState()
const notes = ref(saved ? saved.notes : seedNotes())
const deleted = ref(saved ? saved.deleted : [])

const folder = ref('notes') // 'notes' | 'deleted'
const query = ref('')
const selectedId = ref(notes.value[0]?.id ?? null)
const titleInput = ref(null)
const bodyInput = ref(null)

watch(
  [notes, deleted],
  () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ notes: notes.value, deleted: deleted.value }))
    } catch {
      /* storage full — ignore */
    }
  },
  { deep: true }
)

const firstLine = (c) => {
  const i = c.indexOf('\n')
  return i === -1 ? c : c.slice(0, i)
}
const restLines = (c) => {
  const i = c.indexOf('\n')
  return i === -1 ? '' : c.slice(i + 1)
}
const titleOf = (n) => firstLine(n.content).trim() || 'New Note'
const previewOf = (n) => restLines(n.content).replace(/\s+/g, ' ').trim() || 'No additional text'
const newId = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

const activeList = computed(() => (folder.value === 'notes' ? notes.value : deleted.value))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return [...activeList.value]
    .filter((n) => !q || n.content.toLowerCase().includes(q))
    .sort((a, b) => b.updated - a.updated)
})

const sel = computed(() => activeList.value.find((n) => n.id === selectedId.value) || null)
const isTrash = computed(() => folder.value === 'deleted')

const editTitle = computed({
  get: () => (sel.value ? firstLine(sel.value.content) : ''),
  set: (v) => {
    if (!sel.value || isTrash.value) return
    setContent(sel.value, v + '\n' + restLines(sel.value.content))
  },
})
const editBody = computed({
  get: () => (sel.value ? restLines(sel.value.content) : ''),
  set: (v) => {
    if (!sel.value || isTrash.value) return
    setContent(sel.value, firstLine(sel.value.content) + '\n' + v)
  },
})

function setContent(note, content) {
  note.content = content
  note.updated = Date.now()
}

function pruneEmpty(keepId) {
  notes.value = notes.value.filter((n) => n.id === keepId || n.content.trim() !== '')
}

function selectNote(n) {
  if (n.id === selectedId.value) return
  selectedId.value = n.id
  pruneEmpty(n.id)
}

function setFolder(f) {
  if (f === folder.value) return
  folder.value = f
  selectedId.value = filtered.value[0]?.id ?? null
  pruneEmpty(selectedId.value)
}

function newNote() {
  const n = { id: newId(), content: '', updated: Date.now() }
  notes.value.unshift(n)
  folder.value = 'notes'
  query.value = ''
  selectedId.value = n.id
  pruneEmpty(n.id)
  nextTick(() => titleInput.value?.focus())
}

function deleteNote() {
  if (!sel.value) return
  const target = sel.value
  if (isTrash.value) {
    deleted.value = deleted.value.filter((n) => n.id !== target.id)
  } else {
    notes.value = notes.value.filter((n) => n.id !== target.id)
    deleted.value.unshift(target)
  }
  selectedId.value = filtered.value.find((n) => n.id !== target.id)?.id ?? null
}

function listDate(ts) {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
}

function fullDate(ts) {
  const d = new Date(ts)
  return (
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}
</script>

<template>
  <div class="app-root notes-root">
    <div class="toolbar">
      <button class="tb-btn" title="New note" @click="newNote">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="tb-btn" title="Delete note" :disabled="!sel" @click="deleteNote">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
      <div class="tb-spacer"></div>
      <div class="search-wrap">
        <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="query" class="search" type="text" placeholder="Search all notes" spellcheck="false" />
      </div>
    </div>

    <div class="body">
      <aside class="sidebar">
        <div class="side-label">iCloud</div>
        <div class="side-row" :class="{ active: folder === 'notes' }" @click="setFolder('notes')">
          <span class="side-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span>
          <span class="side-name">Notes</span>
          <span class="side-count">{{ notes.length }}</span>
        </div>
        <div class="side-row" :class="{ active: folder === 'deleted' }" @click="setFolder('deleted')">
          <span class="side-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span>
          <span class="side-name">Recently Deleted</span>
          <span class="side-count">{{ deleted.length }}</span>
        </div>
      </aside>

      <div class="list-pane">
        <div
          v-for="n in filtered"
          :key="n.id"
          class="note-row"
          :class="{ sel: n.id === selectedId }"
          @click="selectNote(n)"
        >
          <div class="nr-title">{{ titleOf(n) }}</div>
          <div class="nr-sub">
            <span class="nr-date">{{ listDate(n.updated) }}</span>
            <span class="nr-prev">{{ previewOf(n) }}</span>
          </div>
        </div>
        <div v-if="!filtered.length" class="list-empty">{{ query ? 'No Results' : 'No Notes' }}</div>
      </div>

      <main class="editor">
        <template v-if="sel">
          <div class="ed-date">{{ fullDate(sel.updated) }}</div>
          <input
            ref="titleInput"
            v-model="editTitle"
            class="ed-title"
            type="text"
            placeholder="Title"
            spellcheck="false"
            :disabled="isTrash"
            @keydown.enter.prevent="bodyInput?.focus()"
          />
          <textarea
            ref="bodyInput"
            v-model="editBody"
            class="ed-body"
            placeholder="Start writing"
            spellcheck="false"
            :disabled="isTrash"
          ></textarea>
        </template>
        <div v-else class="ed-empty">
          <div class="ed-empty-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
          <div>No Notes</div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.notes-root {
  background: var(--window-bg);
  color: var(--text);
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 46px;
  padding: 0 12px;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;
}
.tb-btn {
  font-size: 15px;
  padding: 5px 9px;
  border-radius: 7px;
  line-height: 1;
  display: flex;
  align-items: center;
}
.tb-btn svg {
  width: 16px;
  height: 16px;
  display: block;
}
.tb-btn:hover:not(:disabled) {
  background: var(--hover);
}
.tb-btn:disabled {
  opacity: 0.35;
}
.tb-spacer {
  flex: 1;
}
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-ico {
  position: absolute;
  left: 8px;
  width: 11px;
  height: 11px;
  opacity: 0.6;
  pointer-events: none;
}
.search {
  width: 190px;
  padding: 4px 8px 4px 24px;
  font-size: 12px;
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  outline: none;
}
.search:focus {
  box-shadow: 0 0 0 3px var(--selection);
}

/* Body layout */
.body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Sidebar */
.sidebar {
  width: 190px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
  padding-top: 10px;
  overflow-y: auto;
}
.side-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  padding: 0 14px 4px;
}
.side-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 1px 8px;
  padding: 5px 8px;
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
.side-ico {
  font-size: 13px;
  display: flex;
}
.side-ico svg {
  width: 14px;
  height: 14px;
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

/* Notes list */
.list-pane {
  width: 255px;
  flex-shrink: 0;
  border-right: 0.5px solid var(--border);
  overflow-y: auto;
}
.note-row {
  padding: 9px 14px;
  border-bottom: 0.5px solid var(--border);
  cursor: default;
}
.note-row.sel {
  background: rgba(255, 204, 0, 0.42);
}
.nr-title {
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}
.nr-sub {
  display: flex;
  gap: 7px;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
}
.nr-date {
  flex-shrink: 0;
}
.nr-prev {
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
}
.list-empty {
  padding: 30px 0;
  text-align: center;
  color: var(--text-dim);
}

/* Editor */
.editor {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 34px 0;
  overflow: hidden;
}
.ed-date {
  text-align: center;
  font-size: 11px;
  color: var(--text-dim);
  margin: 4px 0 8px;
  flex-shrink: 0;
}
.ed-title {
  font-size: 22px;
  font-weight: 700;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  flex-shrink: 0;
}
.ed-body {
  flex: 1;
  resize: none;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  line-height: 1.55;
  padding: 8px 0 24px;
  font-family: inherit;
}
.ed-title:disabled,
.ed-body:disabled {
  opacity: 0.75;
}
.ed-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-dim);
  font-size: 15px;
}
.ed-empty-ico {
  opacity: 0.5;
}
.ed-empty-ico svg {
  width: 46px;
  height: 46px;
  display: block;
}
</style>
