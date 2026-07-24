<script setup>
import { ref, computed, watch } from 'vue'
import { seedMessages } from './messages.js'
import ComposeSheet from './ComposeSheet.vue'

const STORE_KEY = 'macos-web:mail'

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Array.isArray(data.messages)) return null
    return data.messages
  } catch {
    return null
  }
}

const messages = ref(loadState() || seedMessages())
watch(messages, (m) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ messages: m })) } catch { /* ignore */ }
}, { deep: true })

const boxes = [
  { id: 'inbox', name: 'Inbox' },
  { id: 'vip', name: 'VIP' },
  { id: 'sent', name: 'Sent' },
  { id: 'archive', name: 'Archive' },
  { id: 'junk', name: 'Junk' },
  { id: 'trash', name: 'Trash' },
]

const box = ref('inbox')
const query = ref('')
const selectedId = ref(messages.value.find((m) => m.mailbox === 'inbox')?.id ?? null)

const unreadCount = computed(() => messages.value.filter((m) => m.mailbox === 'inbox' && m.unread).length)
const currentBox = computed(() => boxes.find((b) => b.id === box.value))

function inBox(m) {
  if (box.value === 'vip') return m.vip && m.mailbox !== 'trash'
  return m.mailbox === box.value
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return messages.value
    .filter((m) => inBox(m))
    .filter((m) => !q
      || m.from.name.toLowerCase().includes(q)
      || m.subject.toLowerCase().includes(q)
      || m.body.toLowerCase().includes(q))
    .sort((a, b) => b.date - a.date)
})

const sel = computed(() => messages.value.find((m) => m.id === selectedId.value) || null)

function selectBox(b) {
  box.value = b.id
  const first = filtered.value[0]
  selectedId.value = first ? first.id : null
  if (first) first.unread = false
}

function selectMessage(m) {
  selectedId.value = m.id
  m.unread = false
}

function deleteMessage() {
  const m = sel.value
  if (!m) return
  const list = filtered.value
  const idx = list.findIndex((x) => x.id === m.id)
  if (m.mailbox === 'trash') {
    messages.value = messages.value.filter((x) => x.id !== m.id)
  } else {
    m.mailbox = 'trash'
  }
  const next = list[idx + 1] || list[idx - 1]
  selectedId.value = next && next.id !== m.id ? next.id : null
}

function archiveMessage() {
  const m = sel.value
  if (!m || m.mailbox !== 'inbox') return
  const list = filtered.value
  const idx = list.findIndex((x) => x.id === m.id)
  m.mailbox = 'archive'
  const next = list[idx + 1] || list[idx - 1]
  selectedId.value = next && next.id !== m.id ? next.id : null
}

// ── Compose ────────────────────────────────────────────────
const composeOpen = ref(false)
const toast = ref('')
let toastTimer = null

function sendMessage(draft) {
  messages.value.push({
    id: 'm' + Date.now().toString(36),
    mailbox: 'sent',
    unread: false,
    vip: false,
    date: Date.now(),
    from: { name: 'Guest', email: 'guest@icloud.com' },
    to: draft.to || '(no recipient)',
    subject: draft.subject || '(no subject)',
    body: draft.body,
  })
  composeOpen.value = false
  toast.value = 'Message sent'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

// ── Formatting ─────────────────────────────────────────────
function formatTime(ts) {
  const d = new Date(ts)
  const nowD = new Date()
  if (d.toDateString() === nowD.toDateString()) {
    const h = d.getHours() % 12 || 12
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
  }
  if (nowD - ts < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString('en-US', { weekday: 'long' })
  }
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
}

function fullDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

const preview = (m) => m.body.replace(/\s+/g, ' ').trim()
const paragraphs = (m) => m.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
const initials = (m) => m.from.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
</script>

<template>
  <div class="app-root mail">
    <!-- Toolbar -->
    <div class="toolbar">
      <button class="tb-btn" title="Compose new message" @click="composeOpen = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
      </button>
      <span class="tb-sep" />
      <button class="tb-btn" title="Archive" :disabled="!sel || sel.mailbox !== 'inbox'" @click="archiveMessage">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" rx="1.5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
      </button>
      <button class="tb-btn" title="Move to Trash" :disabled="!sel" @click="deleteMessage">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
      </button>
      <div class="tb-spacer" />
      <div class="search">
        <span class="search-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </span>
        <input v-model="query" type="text" placeholder="Search" spellcheck="false" />
      </div>
    </div>

    <div class="mail-body">
      <!-- Mailbox sidebar -->
      <aside class="sidebar">
        <div class="side-title">Mailboxes</div>
        <button
          v-for="b in boxes"
          :key="b.id"
          class="side-item"
          :class="{ active: box === b.id }"
          @click="selectBox(b.id)"
        >
          <span class="side-icon">
            <svg v-if="b.id === 'inbox'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
            <svg v-else-if="b.id === 'vip'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <svg v-else-if="b.id === 'sent'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            <svg v-else-if="b.id === 'archive'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" rx="1.5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
            <svg v-else-if="b.id === 'junk'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="10.5" x2="14" y2="17.5" /><line x1="14" y1="10.5" x2="10" y2="17.5" /></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
          </span>
          <span class="side-name">{{ b.name }}</span>
          <span v-if="b.id === 'inbox' && unreadCount" class="badge">{{ unreadCount }}</span>
        </button>
      </aside>

      <!-- Message list -->
      <section class="msglist">
        <div class="list-head">{{ currentBox.name }}</div>
        <div class="rows">
          <button
            v-for="m in filtered"
            :key="m.id"
            class="row"
            :class="{ active: m.id === selectedId, unread: m.unread }"
            @click="selectMessage(m)"
          >
            <span class="dot" :class="{ on: m.unread }" />
            <div class="row-main">
              <div class="row-top">
                <span class="sender">{{ m.from.name }}<svg v-if="m.vip" class="vip-star" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg></span>
                <span class="time">{{ formatTime(m.date) }}</span>
              </div>
              <div class="subject">{{ m.subject }}</div>
              <div class="preview">{{ preview(m) }}</div>
            </div>
          </button>
          <div v-if="!filtered.length" class="empty-list">No Messages</div>
        </div>
      </section>

      <!-- Reading pane -->
      <section class="reading">
        <template v-if="sel">
          <div class="r-head">
            <div class="r-subject">{{ sel.subject }}</div>
            <div class="r-meta">
              <div class="avatar">{{ initials(sel) }}</div>
              <div class="r-who">
                <div class="r-from">
                  {{ sel.from.name }} <span class="r-email">&lt;{{ sel.from.email }}&gt;</span>
                </div>
                <div class="r-to">To: {{ sel.mailbox === 'sent' ? sel.to : 'guest@icloud.com' }}</div>
              </div>
              <div class="r-date">{{ fullDate(sel.date) }}</div>
            </div>
          </div>
          <div class="r-sep" />
          <div class="r-body">
            <p v-for="(p, i) in paragraphs(sel)" :key="i">{{ p }}</p>
          </div>
        </template>
        <div v-else class="no-sel">No Message Selected</div>

        <!-- Compose sheet -->
        <ComposeSheet v-if="composeOpen" @send="sendMessage" @discard="composeOpen = false" />

        <!-- Toast -->
        <transition name="toast">
          <div v-if="toast" class="toast">{{ toast }}</div>
        </transition>
      </section>
    </div>
  </div>
</template>

<style scoped>
.mail {
  background: var(--window-bg);
  color: var(--text);
  font-size: 13px;
}

/* ── Toolbar ── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;
}
.tb-btn {
  border: none;
  background: transparent;
  font-size: 15px;
  padding: 4px 8px;
  border-radius: 7px;
  cursor: pointer;
  color: var(--text);
}
.tb-btn:hover:not(:disabled) { background: var(--hover); }
.tb-btn:disabled { opacity: 0.35; cursor: default; }
.tb-btn svg { width: 15px; height: 15px; display: block; }
.tb-sep { width: 0.5px; height: 18px; background: var(--border); margin: 0 4px; }
.tb-spacer { flex: 1; }
.search {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  padding: 4px 9px;
  width: 200px;
}
.search-icon { display: flex; opacity: 0.6; }
.search-icon svg { width: 12px; height: 12px; display: block; }
.search input {
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  width: 100%;
  font-family: inherit;
}
.search input::placeholder { color: var(--text-dim); }

/* ── Layout ── */
.mail-body { display: flex; flex: 1; min-height: 0; }

/* ── Sidebar ── */
.sidebar {
  width: 190px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
  padding: 10px 8px;
  overflow-y: auto;
}
.side-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  padding: 2px 8px 6px;
}
.side-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  padding: 5px 8px;
  border-radius: 7px;
  cursor: pointer;
  text-align: left;
}
.side-item:hover:not(.active) { background: var(--hover); }
.side-item.active { background: var(--selection); }
.side-icon { width: 18px; display: flex; justify-content: center; color: var(--accent); flex-shrink: 0; }
.side-icon svg { width: 15px; height: 15px; display: block; }
.side-name { flex: 1; }
.badge {
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  padding: 1px 7px;
}

/* ── Message list ── */
.msglist {
  width: 300px;
  flex-shrink: 0;
  border-right: 0.5px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.list-head {
  font-size: 15px;
  font-weight: 700;
  padding: 12px 14px 8px;
  flex-shrink: 0;
}
.rows { overflow-y: auto; flex: 1; padding: 0 6px 6px; }
.row {
  display: flex;
  gap: 7px;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  text-align: left;
  padding: 8px 8px;
  border-radius: 9px;
  cursor: pointer;
}
.row:hover:not(.active) { background: var(--hover); }
.row.active { background: var(--selection); }
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  background: transparent;
}
.dot.on { background: var(--accent); }
.row-main { min-width: 0; flex: 1; }
.row-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.sender {
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.unread .sender { font-weight: 700; }
.vip-star {
  width: 10px;
  height: 10px;
  color: #ff9500;
  margin-left: 3px;
  vertical-align: -1px;
}
.time { font-size: 12px; color: var(--text-dim); flex-shrink: 0; }
.subject {
  font-size: 13px;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.unread .subject { font-weight: 600; }
.preview {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 1px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
}
.empty-list {
  color: var(--text-dim);
  text-align: center;
  padding: 40px 0;
}

/* ── Reading pane ── */
.reading {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.r-head { padding: 18px 24px 12px; flex-shrink: 0; }
.r-subject { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
.r-meta { display: flex; align-items: center; gap: 10px; }
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(160deg, #6e6e73, #48484a);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.r-who { flex: 1; min-width: 0; }
.r-from { font-weight: 600; }
.r-email { font-weight: 400; color: var(--text-dim); font-size: 12px; }
.r-to { font-size: 12px; color: var(--text-dim); margin-top: 1px; }
.r-date { font-size: 12px; color: var(--text-dim); flex-shrink: 0; }
.r-sep { height: 0.5px; background: var(--border); margin: 0 24px; flex-shrink: 0; }
.r-body {
  padding: 16px 24px 24px;
  overflow-y: auto;
  flex: 1;
  font-size: 13px;
  line-height: 1.55;
}
.r-body p { margin: 0 0 14px; white-space: pre-wrap; }
.no-sel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  font-size: 15px;
}

/* ── Toast ── */
.toast {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--titlebar-bg);
  border: 0.5px solid var(--border);
  color: var(--text);
  font-size: 13px;
  padding: 7px 16px;
  border-radius: 999px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  z-index: 20;
}
.toast-enter-active,
.toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>
