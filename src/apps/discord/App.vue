<script setup>
import { ref, reactive, computed, nextTick } from 'vue'

const servers = [
  { id: 'dm', icon: 'DM', name: 'Direct Messages' },
  { id: 'vue', icon: 'VH', name: 'Vue Hangout' },
  { id: 'dev', icon: 'DD', name: 'Dev Den' },
  { id: 'gaming', icon: 'GN', name: 'Game Night' },
  { id: 'music', icon: 'MC', name: 'Music Club' },
]
const activeServer = ref('vue')

const channels = [
  { id: 'general', name: 'general', topic: 'General chat — be nice!' },
  { id: 'random', name: 'random', topic: 'Off-topic nonsense' },
  { id: 'macos-web', name: 'macos-web', topic: 'Talk about the macOS Web clone' },
]
const activeChannel = ref('general')

const members = [
  { name: 'syd', color: '#f0b232', online: true },
  { name: 'kai', color: '#23a55b', online: true },
  { name: 'maya', color: '#5865f2', online: true },
  { name: 'leo', color: '#e74c8b', online: false },
  { name: 'guest', color: '#1abc9c', online: true, self: true },
]

// avatar letter shown white on the member's color circle ("syd" → "S")
function initialOf(name) {
  return (name || '?')[0].toUpperCase()
}

const seed = {
  general: [
    { user: 'syd', text: 'has anyone tried the new macOS Tahoe beta? the Liquid Glass look is gorgeous', time: '4:02 PM' },
    { user: 'kai', text: 'yeah! the transparent menu bar is so clean', time: '4:03 PM' },
    { user: 'kai', text: 'the dock magnification still feels perfect too', time: '4:03 PM' },
    { user: 'maya', text: 'I rebuilt my whole setup around it, no regrets', time: '4:05 PM' },
    { user: 'syd', text: 'someone should recreate it in the browser with Vue 👀', time: '4:07 PM' },
    { user: 'maya', text: 'funny you should say that…', time: '4:08 PM' },
  ],
  random: [
    { user: 'kai', text: 'coffee count today: 4 ☕', time: '1:15 PM' },
    { user: 'leo', text: 'rookie numbers', time: '1:16 PM' },
    { user: 'syd', text: 'my rubber duck just judged my code and it was right', time: '2:44 PM' },
  ],
  'macos-web': [
    { user: 'maya', text: 'the window dragging feels so smooth', time: '3:21 PM' },
    { user: 'syd', text: 'spotlight with cmd+space actually works!', time: '3:22 PM' },
    { user: 'kai', text: 'try `neofetch` in the terminal app 👌', time: '3:24 PM' },
  ],
}

const messages = reactive(JSON.parse(JSON.stringify(seed)))

const replies = [
  'lol true',
  'yeah agreed',
  'omg yes',
  'wait really??',
  'that is actually a great point',
  'haha classic',
  'I was just about to say that',
  '+1',
  'shipping it 🚢',
  'works on my machine ¯\\_(ツ)_/¯',
]

const draft = ref('')
const listEl = ref(null)
const me = members.find((m) => m.self)

const activeTopic = computed(() => channels.find((c) => c.id === activeChannel.value)?.topic)
const visibleMessages = computed(() => {
  const list = messages[activeChannel.value] || []
  return list.map((m, i) => ({
    ...m,
    grouped: i > 0 && list[i - 1].user === m.user && list[i - 1].time === m.time,
    member: members.find((mb) => mb.name === m.user) || me,
  }))
})

function memberOf(name) {
  return members.find((m) => m.name === name) || me
}

async function scrollDown() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

function timeNow() {
  const d = new Date()
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

function send() {
  const text = draft.value.trim()
  if (!text) return
  const time = timeNow()
  messages[activeChannel.value].push({ user: 'guest', text, time })
  draft.value = ''
  scrollDown()
  const pool = members.filter((m) => m.online && !m.self)
  const other = pool[Math.floor(Math.random() * pool.length)]
  const ch = activeChannel.value
  setTimeout(() => {
    messages[ch].push({
      user: other.name,
      text: replies[Math.floor(Math.random() * replies.length)],
      time: timeNow(),
    })
    if (ch === activeChannel.value) scrollDown()
  }, 900 + Math.random() * 800)
}

function pickChannel(id) {
  activeChannel.value = id
  scrollDown()
}
</script>

<template>
  <div class="app-root discord">
    <div class="rail">
      <button
        v-for="s in servers"
        :key="s.id"
        class="server"
        :class="{ active: activeServer === s.id }"
        :title="s.name"
        @click="activeServer = s.id"
      >
        <span class="pill"></span>
        <span class="circle">{{ s.icon }}</span>
      </button>
      <button class="server add" title="Add a Server"><span class="circle">＋</span></button>
    </div>

    <div class="chanbar">
      <div class="server-name">{{ servers.find((s) => s.id === activeServer)?.name || 'Vue Hangout' }}</div>
      <div class="chans">
        <div class="cat">TEXT CHANNELS</div>
        <button
          v-for="c in channels"
          :key="c.id"
          class="chan"
          :class="{ active: activeChannel === c.id }"
          @click="pickChannel(c.id)"
        >
          <span class="hash">#</span>{{ c.name }}
        </button>
        <div class="cat">VOICE CHANNELS</div>
        <div class="chan voice">
          <svg class="hash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 5 6.5 9H3v6h3.5L11 19V5z" />
            <path d="M15.2 8.8a4.5 4.5 0 0 1 0 6.4" />
            <path d="M17.8 6.2a8.2 8.2 0 0 1 0 11.6" />
          </svg>Lounge
        </div>
        <div class="voice-users">
          <div class="vuser">
            <span class="vav" :style="{ background: memberOf('syd').color }">{{ initialOf('syd') }}</span>syd
          </div>
          <div class="vuser">
            <span class="vav" :style="{ background: memberOf('maya').color }">{{ initialOf('maya') }}</span>maya
          </div>
        </div>
      </div>
      <div class="me">
        <span class="avatar sm" :style="{ background: me.color }">{{ initialOf(me.name) }}<i class="dot online"></i></span>
        <span class="me-meta"><b>guest</b><small>online</small></span>
        <span class="me-btns">
          <button class="me-btn" title="Mute">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <path d="M12 17v4" />
            </svg>
          </button>
          <button class="me-btn" title="Deafen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
              <rect x="3" y="13.5" width="4.5" height="7" rx="1.8" />
              <rect x="16.5" y="13.5" width="4.5" height="7" rx="1.8" />
            </svg>
          </button>
          <button class="me-btn" title="User Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5.5" />
              <circle cx="12" cy="12" r="2.2" />
              <path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20M6.3 6.3l1.8 1.8M15.9 15.9l1.8 1.8M17.7 6.3l-1.8 1.8M8.1 15.9l-1.8 1.8" />
            </svg>
          </button>
        </span>
      </div>
    </div>

    <div class="main">
      <div class="chat-head">
        <span class="hash">#</span><b>{{ activeChannel }}</b>
        <span class="topic">{{ activeTopic }}</span>
      </div>
      <div class="messages" ref="listEl">
        <div v-for="(m, i) in visibleMessages" :key="i" class="msg" :class="{ grouped: m.grouped }">
          <template v-if="!m.grouped">
            <span class="avatar" :style="{ background: m.member.color }">{{ initialOf(m.member.name) }}</span>
            <div class="body">
              <div class="head">
                <b :style="{ color: m.member.color }">{{ m.user }}</b>
                <small>Today at {{ m.time }}</small>
              </div>
              <div class="text">{{ m.text }}</div>
            </div>
          </template>
          <div v-else class="text cont">{{ m.text }}</div>
        </div>
      </div>
      <div class="composer">
        <span class="plus">＋</span>
        <input
          v-model="draft"
          :placeholder="`Message #${activeChannel}`"
          @keydown.enter="send"
        />
      </div>
    </div>

    <div class="members">
      <div class="cat">ONLINE — {{ members.filter((m) => m.online).length }}</div>
      <div v-for="m in members.filter((m) => m.online)" :key="m.name" class="member">
        <span class="avatar sm" :style="{ background: m.color }">{{ initialOf(m.name) }}<i class="dot online"></i></span>
        <span :style="{ color: m.color }">{{ m.name }}</span>
      </div>
      <div class="cat">OFFLINE — {{ members.filter((m) => !m.online).length }}</div>
      <div v-for="m in members.filter((m) => !m.online)" :key="m.name" class="member off">
        <span class="avatar sm" :style="{ background: m.color }">{{ initialOf(m.name) }}<i class="dot"></i></span>
        <span>{{ m.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discord {
  flex-direction: row;
  background: #313338;
  color: #dbdee1;
  font-size: 14px;
}
.rail {
  width: 68px;
  flex: none;
  background: #1e1f22;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  overflow-y: auto;
}
.server {
  position: relative;
  display: grid;
  place-items: center;
}
.circle {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #313338;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #dbdee1;
  transition: border-radius 0.15s, background 0.15s, color 0.15s;
}
.server:hover .circle,
.server.active .circle {
  border-radius: 16px;
  background: #5865f2;
  color: #fff;
}
.pill {
  position: absolute;
  left: -11px;
  width: 4px;
  height: 8px;
  border-radius: 0 4px 4px 0;
  background: #fff;
  transition: height 0.15s;
}
.server:hover .pill {
  height: 20px;
}
.server.active .pill {
  height: 36px;
}
.add .circle {
  color: #23a55b;
  font-size: 22px;
}
.chanbar {
  width: 232px;
  flex: none;
  background: #2b2d31;
  display: flex;
  flex-direction: column;
}
.server-name {
  padding: 14px 16px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
}
.chans {
  flex: 1;
  overflow-y: auto;
  padding: 10px 8px;
}
.cat {
  font-size: 11px;
  font-weight: 700;
  color: #949ba4;
  padding: 10px 8px 4px;
  letter-spacing: 0.02em;
}
.chan {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  padding: 5px 8px;
  border-radius: 5px;
  color: #949ba4;
}
.chan:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #dbdee1;
}
.chan.active {
  background: rgba(255, 255, 255, 0.09);
  color: #fff;
}
.chan .hash {
  font-size: 17px;
  color: #80848e;
}
.chan svg.hash {
  width: 18px;
  height: 18px;
  flex: none;
}
.voice {
  cursor: default;
}
.voice-users {
  padding-left: 30px;
  color: #949ba4;
  font-size: 13px;
}
.vuser {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}
.vav {
  width: 18px;
  height: 18px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
}
.me {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #232428;
}
.me-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  flex: 1;
}
.me-meta b {
  font-size: 13px;
  color: #fff;
}
.me-meta small {
  font-size: 11px;
  color: #949ba4;
}
.me-btns {
  display: flex;
  align-items: center;
  gap: 2px;
}
.me-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: #b5bac1;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}
.me-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #dbdee1;
}
.me-btn svg {
  width: 17px;
  height: 17px;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.chat-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
  color: #fff;
}
.chat-head .hash {
  color: #80848e;
  font-size: 20px;
}
.topic {
  color: #949ba4;
  font-size: 13px;
  border-left: 1px solid #3f4147;
  padding-left: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 16px 8px;
  display: flex;
  flex-direction: column;
}
.msg {
  display: flex;
  gap: 12px;
  margin-top: 14px;
}
.msg.grouped {
  margin-top: 2px;
}
.avatar {
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 50%;
  background: #5865f2;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  position: relative;
}
.avatar.sm {
  width: 32px;
  height: 32px;
  font-size: 13px;
}
.dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #80848e;
  border: 3px solid #2b2d31;
}
.dot.online {
  background: #23a55b;
}
.head b {
  font-size: 14px;
  margin-right: 8px;
}
.head small {
  color: #949ba4;
  font-size: 11px;
}
.text {
  color: #dbdee1;
  line-height: 1.35;
  word-break: break-word;
}
.text.cont {
  padding-left: 52px;
}
.composer {
  margin: 8px 16px 18px;
  background: #383a40;
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 0 12px;
}
.plus {
  font-size: 20px;
  color: #b5bac1;
  margin-right: 10px;
}
.composer input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #dbdee1;
  font-size: 14px;
  padding: 11px 0;
}
.composer input::placeholder {
  color: #6d6f78;
}
.members {
  width: 216px;
  flex: none;
  background: #2b2d31;
  overflow-y: auto;
  padding: 10px 8px;
}
.member {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 500;
}
.member:hover {
  background: rgba(255, 255, 255, 0.05);
}
.member.off {
  opacity: 0.45;
}
</style>
