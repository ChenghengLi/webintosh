<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { contacts, seedConversations } from './data.js'

const STORE_KEY = 'macos-web:messages:v1'

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY))
    if (saved && Array.isArray(saved.convos) && saved.convos.length) return saved.convos
  } catch {
    /* fall through to seeds */
  }
  return seedConversations()
}

const convos = ref(load())
const activeId = ref(convos.value[0]?.id)
const query = ref('')
const draft = ref('')
const typingIn = ref(null) // conversation id currently showing the typing indicator
const threadEl = ref(null)
const inputEl = ref(null)

watch(
  convos,
  (v) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ convos: v }))
    } catch {
      /* storage full/blocked — non-fatal */
    }
  },
  { deep: true }
)

const activeConvo = computed(() => convos.value.find((c) => c.id === activeId.value))
const activeContact = computed(() => contacts[activeConvo.value?.contactId] || {})

// Real-app style avatars: initials on a saturated gradient picked by name hash.
const AVATAR_GRADS = [
  'linear-gradient(160deg,#6ec1ff,#0a84ff)', // blue
  'linear-gradient(160deg,#7be382,#28b93c)', // green
  'linear-gradient(160deg,#ffc46b,#ff8f0a)', // orange
  'linear-gradient(160deg,#ff8fa8,#f23a68)', // pink
  'linear-gradient(160deg,#c99df5,#8b46d9)', // purple
  'linear-gradient(160deg,#7fe3e0,#12a3ad)', // teal
  'linear-gradient(160deg,#b5b5bd,#6e6e73)', // gray
  'linear-gradient(160deg,#8f9bf7,#4d54e0)', // indigo
]

function avatarGrad(contact) {
  const name = contact?.name || ''
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_GRADS[h % AVATAR_GRADS.length]
}

function initialsOf(name = '') {
  const parts = name.split(/\s+/).filter(Boolean)
  return parts.map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function lastText(c) {
  const m = c.messages[c.messages.length - 1]
  return m ? m.text : ''
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return convos.value
  return convos.value.filter(
    (c) => contacts[c.contactId].name.toLowerCase().includes(q) || lastText(c).toLowerCase().includes(q)
  )
})

// Group consecutive same-sender messages: first/last flags drive corner radii and tails.
const decorated = computed(() => {
  const list = activeConvo.value?.messages || []
  return list.map((m, i) => ({
    ...m,
    first: i === 0 || list[i - 1].from !== m.from,
    last: i === list.length - 1 || list[i + 1].from !== m.from,
  }))
})

const showReceipt = computed(() => {
  const list = activeConvo.value?.messages
  if (!list?.length || typingIn.value === activeId.value) return false
  return list[list.length - 1].from === 'me'
})

function timeNow() {
  const d = new Date()
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

async function scrollDown() {
  await nextTick()
  if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
}

function bumpToTop(convo) {
  const i = convos.value.indexOf(convo)
  if (i > 0) convos.value.splice(0, 0, convos.value.splice(i, 1)[0])
}

function pickConvo(id) {
  activeId.value = id
  const convo = convos.value.find((c) => c.id === id)
  if (convo) convo.unread = 0
  scrollDown()
}

function send() {
  const text = draft.value.trim()
  const convo = activeConvo.value
  if (!text || !convo) return
  const t = timeNow()
  convo.messages.push({ from: 'me', text, time: t })
  convo.stamp = t
  draft.value = ''
  bumpToTop(convo)
  scrollDown()

  const pool = contacts[convo.contactId].replies
  const reply = pool[Math.floor(Math.random() * pool.length)]
  setTimeout(() => {
    typingIn.value = convo.id
    if (convo.id === activeId.value) scrollDown()
  }, 350)
  setTimeout(
    () => {
      typingIn.value = null
      convo.messages.push({ from: 'them', text: reply, time: timeNow() })
      convo.stamp = timeNow()
      bumpToTop(convo)
      if (convo.id !== activeId.value) convo.unread++
      scrollDown()
    },
    1550 + Math.random() * 300
  )
}

function newMessage() {
  inputEl.value?.focus()
}

onMounted(() => {
  const convo = activeConvo.value
  if (convo) convo.unread = 0
  scrollDown()
})
</script>

<template>
  <div class="app-root messages">
    <!-- Conversation list -->
    <aside class="sidebar">
      <div class="side-head">
        <div class="search">
          <svg viewBox="0 0 16 16" class="s-icon"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M10 10l3.2 3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
          <input v-model="query" placeholder="Search" />
        </div>
        <button class="sq-btn" title="New Message" @click="newMessage">
          <svg viewBox="0 0 18 18" class="h-icon"><rect x="2" y="2" width="14" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.3" /><path d="M10.8 4.9l2.3 2.3-5.6 5.6-2.9.6.6-2.9 5.6-5.6z" fill="currentColor" /></svg>
        </button>
      </div>
      <div class="convo-list">
        <button
          v-for="c in filtered"
          :key="c.id"
          class="convo"
          :class="{ active: c.id === activeId, unread: c.unread > 0 }"
          @click="pickConvo(c.id)"
        >
          <span v-if="c.unread" class="dot"></span>
          <div class="avatar" :style="{ background: avatarGrad(contacts[c.contactId]) }">{{ initialsOf(contacts[c.contactId].name) }}</div>
          <div class="convo-info">
            <div class="convo-top">
              <span class="name">{{ contacts[c.contactId].name }}</span>
              <span class="stamp">{{ c.stamp }}</span>
            </div>
            <div class="preview">{{ lastText(c) }}</div>
          </div>
        </button>
        <div v-if="!filtered.length" class="no-results">No Results</div>
      </div>
    </aside>

    <!-- Chat pane -->
    <section class="chat">
      <header class="chat-head">
        <div class="peer">
          <div class="avatar sm" :style="{ background: avatarGrad(activeContact) }">{{ initialsOf(activeContact.name) }}</div>
          <span class="peer-name">{{ activeContact.name }} ›</span>
        </div>
        <div class="head-actions">
          <button class="sq-btn" title="FaceTime video">
            <svg viewBox="0 0 20 20" class="h-icon"><rect x="1.5" y="5" width="11" height="10" rx="2.5" fill="currentColor" /><path d="M13.5 9.2l4-2.4v6.4l-4-2.4v-1.6z" fill="currentColor" /></svg>
          </button>
          <button class="sq-btn" title="Details">
            <svg viewBox="0 0 20 20" class="h-icon"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M10 9v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /><circle cx="10" cy="6.2" r="1.1" fill="currentColor" /></svg>
          </button>
        </div>
      </header>

      <div ref="threadEl" class="thread">
        <div
          v-for="(m, i) in decorated"
          :key="i"
          class="msg-row"
          :class="[m.from === 'me' ? 'me' : 'them', { first: m.first, last: m.last }]"
        >
          <span class="msg-time">{{ m.time }}</span>
          <div class="bubble">{{ m.text }}</div>
        </div>

        <div v-if="typingIn === activeId" class="msg-row them first last typing-row">
          <span class="msg-time"></span>
          <div class="bubble typing"><i></i><i></i><i></i></div>
        </div>
        <div v-if="showReceipt" class="receipt">Delivered</div>
      </div>

      <footer class="composer">
        <div class="pill">
          <input
            ref="inputEl"
            v-model="draft"
            placeholder="iMessage"
            @keydown.enter="send"
          />
          <svg class="emoji-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9" /><path d="M8.2 14.2s1.4 1.8 3.8 1.8 3.8-1.8 3.8-1.8" /><path d="M9 9.3h.01M15 9.3h.01" stroke-width="2.6" /></svg>
          <button v-if="draft.trim()" class="send-btn" title="Send" @click="send">
            <svg viewBox="0 0 12 12"><path d="M6 10V2.5M2.8 5.5L6 2.2l3.2 3.3" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.messages {
  flex-direction: row;
}

/* ---------- sidebar ---------- */
.sidebar {
  width: 264px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  backdrop-filter: saturate(180%) blur(28px);
  -webkit-backdrop-filter: saturate(180%) blur(28px);
  border-right: 0.5px solid var(--border);
}
.side-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px 8px;
}
.search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  padding: 4px 8px;
  color: var(--text-dim);
}
.search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
}
.s-icon { width: 13px; height: 13px; flex-shrink: 0; }
.sq-btn {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  color: var(--text-dim);
}
.sq-btn:hover { background: var(--hover); color: var(--text); }
.h-icon { width: 17px; height: 17px; }
.convo-list {
  flex: 1;
  overflow-y: auto;
  padding: 2px 8px 8px;
}
.convo {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  text-align: left;
}
.convo:hover:not(.active) { background: var(--hover); }
.convo.active { background: var(--accent); color: #fff; }
.dot {
  position: absolute;
  left: 1px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.3px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.08);
}
.avatar.sm { width: 24px; height: 24px; font-size: 10px; }
.convo-info { flex: 1; min-width: 0; }
.convo-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stamp { font-size: 11px; color: var(--text-dim); flex-shrink: 0; }
.preview {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 1px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.convo.unread:not(.active) .name,
.convo.unread:not(.active) .preview {
  font-weight: 700;
  color: var(--text);
}
.convo.active .stamp,
.convo.active .preview { color: rgba(255, 255, 255, 0.75); }
.no-results { padding: 20px; text-align: center; color: var(--text-dim); }

/* ---------- chat pane ---------- */
.chat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.chat-head {
  position: relative;
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 0.5px solid var(--border);
}
.peer { display: flex; align-items: center; gap: 8px; }
.peer-name { font-size: 13px; font-weight: 600; }
.head-actions {
  position: absolute;
  right: 12px;
  display: flex;
  gap: 2px;
}

.thread {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px 10px;
  display: flex;
  flex-direction: column;
}
.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 2px;
}
.msg-row.last { margin-bottom: 10px; }
.msg-row.me { justify-content: flex-end; }
.msg-row.them .msg-time { order: 2; }
.msg-time {
  font-size: 10px;
  color: var(--text-dim);
  white-space: nowrap;
  margin-bottom: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.msg-row:hover .msg-time { opacity: 1; }

.bubble {
  position: relative;
  max-width: 62%;
  padding: 7px 12px;
  font-size: 13px;
  line-height: 1.35;
  border-radius: 18px;
  white-space: pre-wrap;
  word-break: break-word;
}
.me .bubble { background: var(--accent); color: #fff; }
.them .bubble { background: var(--hover); }

/* grouped corners: shrink the radius where bubbles touch */
.me:not(.first) .bubble { border-top-right-radius: 6px; }
.me:not(.last) .bubble { border-bottom-right-radius: 6px; }
.them:not(.first) .bubble { border-top-left-radius: 6px; }
.them:not(.last) .bubble { border-bottom-left-radius: 6px; }

/* bubble tails (last bubble of a group): radial-gradient carves the concave curve */
.me.last .bubble { border-bottom-right-radius: 4px; }
.me.last .bubble::after {
  content: '';
  position: absolute;
  right: -7px;
  bottom: 0;
  width: 10px;
  height: 14px;
  background: radial-gradient(circle at 100% 0%, transparent 9.5px, var(--accent) 10px);
}
.them.last .bubble { border-bottom-left-radius: 4px; }
.them.last .bubble::after {
  content: '';
  position: absolute;
  left: -7px;
  bottom: 0;
  width: 10px;
  height: 14px;
  background: radial-gradient(circle at 0% 0%, transparent 9.5px, var(--hover) 10px);
}

/* typing indicator */
.bubble.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 11px 13px;
}
.typing i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-dim);
  animation: tp 1s infinite ease-in-out;
}
.typing i:nth-child(2) { animation-delay: 0.15s; }
.typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes tp {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
  30% { transform: translateY(-3px); opacity: 1; }
}

.receipt {
  align-self: flex-end;
  font-size: 10px;
  color: var(--text-dim);
  margin: -6px 0 8px;
}

/* ---------- composer ---------- */
.composer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 12px;
}
.pill {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 4px 8px 4px 12px;
  background: var(--window-bg);
}
.pill:focus-within { border-color: var(--accent); }
.pill input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
}
.emoji-ico { width: 17px; height: 17px; opacity: 0.55; color: var(--text-dim); flex-shrink: 0; }
.send-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.send-btn svg { width: 12px; height: 12px; }
</style>
