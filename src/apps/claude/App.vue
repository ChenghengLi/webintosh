<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { generateReply } from './ai'
import { renderMarkdown } from './markdown'

const LS_KEY = 'macos-web:claude-chats'
const MODELS = ['Claude Sonnet 4.5', 'Claude Opus 4.1', 'Claude Haiku 3.5']

// ---------- state ----------
const chats = ref(loadChats())
const activeId = ref(chats.value[0]?.id || null)
const draft = ref('')
const busy = ref(false) // typing or streaming
const streamingId = ref(null) // message id currently streaming
const renamingId = ref(null)
const renameDraft = ref('')
const model = ref(MODELS[0])
const modelMenuOpen = ref(false)
const listEl = ref(null)
const inputEl = ref(null)

const activeChat = computed(() => chats.value.find((c) => c.id === activeId.value) || null)
const sortedChats = computed(() => [...chats.value].sort((a, b) => b.updatedAt - a.updatedAt))

const greeting = computed(() => {
  const h = new Date().getHours()
  const part = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return `${part}, guest`
})

const suggestions = ['Explain quantum computing', 'Write a haiku about macOS', 'Debug my code']

// ---------- persistence ----------
function loadChats() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
watch(chats, (v) => localStorage.setItem(LS_KEY, JSON.stringify(v)), { deep: true })

// ---------- chat actions ----------
function newChat() {
  const chat = { id: 'c' + Date.now().toString(36), title: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] }
  chats.value.unshift(chat)
  activeId.value = chat.id
  focusInput()
}

function selectChat(id) {
  if (busy.value) return
  activeId.value = id
  renamingId.value = null
}

function deleteChat(id) {
  const i = chats.value.findIndex((c) => c.id === id)
  if (i === -1) return
  chats.value.splice(i, 1)
  if (activeId.value === id) activeId.value = sortedChats.value[0]?.id || null
  if (renamingId.value === id) renamingId.value = null
}

function startRename(chat) {
  renamingId.value = chat.id
  renameDraft.value = chat.title
}

function commitRename(chat) {
  const t = renameDraft.value.trim()
  if (t) chat.title = t.slice(0, 60)
  renamingId.value = null
}

// ---------- messaging ----------
let streamTimer = null
let typeTimer = null

function send(text) {
  const content = String(text ?? draft.value).trim()
  if (!content || busy.value) return
  if (!activeChat.value) newChat()
  const chat = activeChat.value
  if (chat.messages.length === 0) {
    chat.title = content.length > 42 ? content.slice(0, 42).trimEnd() + '…' : content
  }
  chat.messages.push({ id: 'm' + Date.now().toString(36) + 'u', role: 'user', content })
  chat.updatedAt = Date.now()
  draft.value = ''
  busy.value = true
  scrollToBottom()

  const reply = generateReply(content)
  const msg = reactive({ id: 'm' + Date.now().toString(36) + 'a', role: 'assistant', content: '' })

  // typing dots for a beat, then stream token-by-token
  typeTimer = setTimeout(() => {
    chat.messages.push(msg)
    streamingId.value = msg.id
    scrollToBottom()
    let i = 0
    streamTimer = setInterval(() => {
      i += 2 // ~2 chars per tick at 30ms
      msg.content = reply.slice(0, i)
      chat.updatedAt = Date.now()
      scrollToBottom()
      if (i >= reply.length) {
        clearInterval(streamTimer)
        streamTimer = null
        msg.content = reply
        busy.value = false
        streamingId.value = null
        focusInput()
      }
    }, 30)
  }, 650)
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function stopStream() {
  if (typeTimer) { clearTimeout(typeTimer); typeTimer = null }
  if (streamTimer) { clearInterval(streamTimer); streamTimer = null }
  busy.value = false
  streamingId.value = null
}

onBeforeUnmount(stopStream)

// ---------- ui helpers ----------
function scrollToBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
}

function focusInput() {
  nextTick(() => inputEl.value?.focus())
}

function relTime(ts) {
  const d = Date.now() - ts
  const m = Math.floor(d / 60000)
  if (m < 1) return 'now'
  if (m < 60) return m + 'm'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h'
  const days = Math.floor(h / 24)
  if (days < 30) return days + 'd'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function pickModel(m) {
  model.value = m
  modelMenuOpen.value = false
}

const render = renderMarkdown

// local directive: autofocus + select for rename inputs
const vFocus = { mounted: (el) => { el.focus(); el.select() } }
</script>

<template>
  <div class="app-root claude-root">
    <!-- sidebar -->
    <aside class="side">
      <button class="new-chat" @click="newChat">
        <span class="nc-plus">＋</span> New chat
      </button>

      <div class="side-label">Recents</div>
      <div class="chat-list">
        <div v-if="!sortedChats.length" class="no-chats">No chats yet</div>
        <div
          v-for="c in sortedChats"
          :key="c.id"
          class="chat-row"
          :class="{ active: c.id === activeId }"
          @click="selectChat(c.id)"
        >
          <template v-if="renamingId === c.id">
            <input
              class="rename-input"
              v-model="renameDraft"
              @keydown.enter.prevent="commitRename(c)"
              @keydown.esc.prevent="renamingId = null"
              @blur="commitRename(c)"
              @click.stop
              v-focus
            />
          </template>
          <template v-else>
            <div class="chat-meta">
              <span class="chat-title">{{ c.title }}</span>
              <span class="chat-time">{{ relTime(c.updatedAt) }}</span>
            </div>
            <div class="chat-actions" @click.stop>
              <button class="icon-btn" title="Rename" @click="startRename(c)">
                <svg viewBox="0 0 16 16" width="13" height="13"><path fill="currentColor" d="M11.7 1.3a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4l-8.9 8.9-2.8.7a.5.5 0 0 1-.6-.6l.7-2.8 8.6-9.2ZM3.6 10.7l-.4 1.7 1.7-.4 8-8-1.3-1.3-8 8Z"/></svg>
              </button>
              <button class="icon-btn" title="Delete" @click="deleteChat(c.id)">
                <svg viewBox="0 0 16 16" width="13" height="13"><path fill="currentColor" d="M6.5 1.5h3a.5.5 0 0 1 .5.5v1h3.5v1h-.8l-.6 9.1a1.5 1.5 0 0 1-1.5 1.4H5.4a1.5 1.5 0 0 1-1.5-1.4L3.3 4h-.8V3h3.5V2a.5.5 0 0 1 .5-.5Zm.5 1h2v-.5H7V3Zm-2.7 1.5.6 9a.5.5 0 0 0 .5.5h5.2a.5.5 0 0 0 .5-.5l.6-9H4.3ZM6 6h1v6H6V6Zm3 0h1v6H9V6Z"/></svg>
              </button>
            </div>
          </template>
        </div>
      </div>

      <div class="side-bottom">
        <button class="side-item">
          <svg viewBox="0 0 16 16" width="15" height="15"><path fill="currentColor" d="M8 5.5A2.5 2.5 0 1 1 8 10.5 2.5 2.5 0 0 1 8 5.5Zm0 1A1.5 1.5 0 1 0 8 9.5 1.5 1.5 0 0 0 8 6.5Z"/><path fill="currentColor" d="M6.9 1h2.2l.4 1.6c.5.2 1 .5 1.4.8l1.6-.6 1.1 1.9-1.2 1.1c.1.4.1.7.1 1.2s0 .8-.1 1.2l1.2 1.1-1.1 1.9-1.6-.6c-.4.4-.9.7-1.4.8L9.1 15H6.9l-.4-1.6a5.6 5.6 0 0 1-1.4-.8l-1.6.6-1.1-1.9 1.2-1.1a5 5 0 0 1-.1-1.2c0-.5 0-.8.1-1.2L2.4 4.7l1.1-1.9 1.6.6c.4-.4.9-.7 1.4-.8L6.9 1Zm1.1 1h-.1l-.3 1.4-1.1.5c-.3.1-.5.3-.8.5l-1 .6-1.1-.6-.1.1 1 1-.4 1.1c-.1.3-.1.5-.1.9 0 .3 0 .6.1.9l.4 1.1-1 1 .1.1 1.1-.6 1 .6c.3.2.5.4.8.5l1.1.5.3 1.4h.1l.3-1.4 1.1-.5c.3-.1.5-.3.8-.5l1-.6 1.1.6.1-.1-1-1 .4-1.1c.1-.3.1-.6.1-.9 0-.4 0-.6-.1-.9l-.4-1.1 1-1-.1-.1-1.1.6-1-.6a4.6 4.6 0 0 0-.8-.5l-1.1-.5L8 2Z"/></svg>
          Settings
        </button>
        <div class="side-item user-row">
          <span class="user-avatar">G</span>
          <span class="user-name">Guest</span>
          <span class="user-plan">Free plan</span>
        </div>
      </div>
    </aside>

    <!-- main -->
    <main class="main" @click="modelMenuOpen = false">
      <!-- empty state -->
      <div v-if="!activeChat || !activeChat.messages.length" class="empty">
        <img class="empty-star" src="/icons/claude.svg" alt="Claude" draggable="false" />
        <h1 class="empty-title">{{ greeting }}</h1>
        <div class="chips">
          <button v-for="s in suggestions" :key="s" class="chip" @click="send(s)">{{ s }}</button>
        </div>
      </div>

      <!-- messages -->
      <div v-else ref="listEl" class="messages">
        <div v-for="m in activeChat.messages" :key="m.id" class="msg" :class="m.role">
          <template v-if="m.role === 'user'">
            <div class="user-bubble">{{ m.content }}</div>
          </template>
          <template v-else>
            <img class="a-avatar" src="/icons/claude.svg" alt="" draggable="false" />
            <div class="a-body">
              <div class="a-text" v-html="render(m.content)"></div>
              <span v-if="streamingId === m.id" class="cursor">▍</span>
            </div>
          </template>
        </div>
        <div v-if="busy && !streamingId" class="msg assistant">
          <img class="a-avatar" src="/icons/claude.svg" alt="" draggable="false" />
          <div class="a-body typing"><span></span><span></span><span></span></div>
        </div>
      </div>

      <!-- composer -->
      <div class="composer-wrap">
        <div class="composer">
          <button class="plus-btn" title="Add attachment">＋</button>
          <textarea
            ref="inputEl"
            v-model="draft"
            class="input"
            rows="1"
            placeholder="How can I help you today?"
            @keydown="onKeydown"
          ></textarea>
          <div class="composer-right">
            <div class="model-pill-wrap" @click.stop>
              <button class="model-pill" @click="modelMenuOpen = !modelMenuOpen">
                {{ model }}
                <svg viewBox="0 0 10 6" width="8" height="5"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </button>
              <div v-if="modelMenuOpen" class="model-menu">
                <button
                  v-for="m in MODELS"
                  :key="m"
                  class="model-opt"
                  :class="{ sel: m === model }"
                  @click="pickModel(m)"
                >
                  <span class="check">{{ m === model ? '✓' : '' }}</span>{{ m }}
                </button>
              </div>
            </div>
            <button class="send-btn" :disabled="!draft.trim() || busy" title="Send" @click="send()">
              <svg viewBox="0 0 14 14" width="14" height="14"><path d="M7 12V2M2.5 6.5 7 2l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        <div class="composer-hint">Claude is simulated locally — no real AI was harmed. Enter to send, Shift+Enter for a new line.</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.claude-root {
  flex-direction: row;
  background: #f5f4ef;
  color: #1f1e1b;
  font-size: 14px;
}

/* ---------- sidebar ---------- */
.side {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #ecebe4;
  border-right: 0.5px solid #dcd9cf;
  padding: 12px 10px 8px;
}
.new-chat {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 10px;
  background: #d97757;
  color: #fff;
  font-size: 13.5px;
  font-weight: 550;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.new-chat:hover { background: #c9663f; }
.nc-plus { font-size: 15px; line-height: 1; }

.side-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8a877c;
  padding: 14px 8px 6px;
}
.chat-list { flex: 1; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }
.no-chats { color: #a3a094; font-size: 12.5px; padding: 6px 8px; }

.chat-row {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 8px;
  padding: 7px 8px;
  cursor: pointer;
  color: #4a483f;
}
.chat-row:hover { background: #e2e0d6; }
.chat-row.active { background: #dcd9cd; color: #1f1e1b; }
.chat-meta { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 6px; }
.chat-title {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}
.chat-time { font-size: 11px; color: #9c998d; flex-shrink: 0; }
.chat-actions { display: none; gap: 2px; flex-shrink: 0; }
.chat-row:hover .chat-actions { display: flex; }
.chat-row:hover .chat-time { display: none; }
.icon-btn {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #7c796e;
  cursor: pointer;
}
.icon-btn:hover { background: #cfccc0; color: #1f1e1b; }
.rename-input {
  width: 100%;
  border: 1px solid #d97757;
  border-radius: 6px;
  padding: 3px 6px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  outline: none;
}

.side-bottom { border-top: 0.5px solid #dcd9cf; padding-top: 6px; }
.side-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #4a483f;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}
.side-item:hover { background: #e2e0d6; }
.user-row { cursor: default; }
.user-avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(160deg, #e8a586, #d97757);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.user-name { font-weight: 550; }
.user-plan { margin-left: auto; font-size: 11px; color: #9c998d; }

/* ---------- main ---------- */
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding-bottom: 40px;
}
.empty-star { width: 58px; height: 58px; }
.empty-title {
  margin: 0;
  font-family: 'New York', 'Iowan Old Style', Georgia, 'Times New Roman', serif;
  font-size: 30px;
  font-weight: 500;
  color: #2c2b26;
  letter-spacing: -0.01em;
}
.chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 480px; }
.chip {
  padding: 8px 14px;
  border: 0.5px solid #d5d2c6;
  border-radius: 999px;
  background: #fbfaf6;
  color: #4a483f;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.chip:hover { background: #f0eee6; border-color: #c6c3b6; }

/* ---------- messages ---------- */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px 12px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.user-bubble {
  max-width: 70%;
  background: #e8e6dc;
  border-radius: 16px;
  padding: 9px 14px;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.assistant { gap: 12px; align-items: flex-start; }
.a-avatar { width: 22px; height: 22px; margin-top: 2px; flex-shrink: 0; }
.a-body { flex: 1; min-width: 0; font-size: 14px; line-height: 1.65; color: #2c2b26; }
.a-text :deep(p) { margin: 0 0 10px; }
.a-text :deep(p:last-child) { margin-bottom: 0; }
.a-text :deep(code) {
  background: #ebe9e0;
  border: 0.5px solid #dcd9cd;
  border-radius: 4px;
  padding: 1px 5px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12.5px;
}
.a-text :deep(pre) {
  background: #26241f;
  color: #f0ede4;
  border-radius: 10px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 10px 0;
}
.a-text :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
  color: inherit;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12.5px;
  line-height: 1.55;
}
.a-text :deep(strong) { font-weight: 650; }
.cursor { color: #d97757; animation: blink 0.8s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }

.typing { display: flex; gap: 4px; align-items: center; height: 24px; }
.typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #b8b4a7;
  animation: bounce 1.2s ease-in-out infinite;
}
.typing span:nth-child(2) { animation-delay: 0.15s; }
.typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-4px); opacity: 1; }
}

/* ---------- composer ---------- */
.composer-wrap { padding: 8px 28px 14px; }
.composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #fbfaf6;
  border: 0.5px solid #d5d2c6;
  border-radius: 18px;
  padding: 8px 10px;
  box-shadow: 0 1px 4px rgba(60, 55, 40, 0.06);
}
.composer:focus-within { border-color: #c0bcaf; }
.plus-btn {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #8a877c;
  font-size: 17px;
  cursor: pointer;
}
.plus-btn:hover { background: #efeee6; }
.input {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  padding: 5px 0;
  max-height: 140px;
  color: #1f1e1b;
}
.input::placeholder { color: #a3a094; }
.composer-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.model-pill-wrap { position: relative; }
.model-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #7c796e;
  font-size: 12px;
  font-family: inherit;
  padding: 5px 9px;
  cursor: pointer;
}
.model-pill:hover { background: #efeee6; }
.model-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  background: #fbfaf6;
  border: 0.5px solid #d5d2c6;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(60, 55, 40, 0.16);
  padding: 4px;
  z-index: 10;
}
.model-opt {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  border: none;
  border-radius: 8px;
  background: transparent;
  padding: 7px 10px;
  font-size: 13px;
  font-family: inherit;
  color: #2c2b26;
  cursor: pointer;
  text-align: left;
}
.model-opt:hover { background: #efeee6; }
.check { width: 14px; color: #d97757; font-size: 12px; }

.send-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: #d97757;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.send-btn:hover:not(:disabled) { background: #c9663f; }
.send-btn:disabled { opacity: 0.35; cursor: default; }

.composer-hint {
  text-align: center;
  font-size: 11px;
  color: #a3a094;
  margin-top: 7px;
}
</style>
