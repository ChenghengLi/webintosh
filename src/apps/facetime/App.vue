<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import CallView from './CallView.vue'
import { CONTACTS, contactById, initials, formatClock, formatDuration } from './data.js'

// Apps may be opened with { props: { dial: '<contact name>' } } to start a call directly.
const props = defineProps({
  dial: { type: String, default: '' },
})

const LS_KEY = 'macos-web:facetime-recents'

const query = ref('')
const tab = ref('all') // 'all' | 'missed'
const callee = ref(null) // contact object while a call view is open

function seedRecents() {
  const now = Date.now()
  return [
    { contactId: 'maya', ts: now - 2 * 3600e3, duration: 754, missed: false },
    { contactId: 'kai', ts: now - 26 * 3600e3, duration: 0, missed: true },
    { contactId: 'syd', ts: now - 50 * 3600e3, duration: 182, missed: false },
  ]
}

function loadRecents() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* corrupted storage — fall through to seed */
  }
  return seedRecents()
}

const recents = ref(loadRecents())

watch(
  recents,
  (list) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 40)))
    } catch {
      /* storage unavailable — recents just stay in memory */
    }
  },
  { deep: true }
)

const q = computed(() => query.value.trim().toLowerCase())

const filteredContacts = computed(() =>
  CONTACTS.filter((c) => !q.value || c.name.toLowerCase().includes(q.value))
)

const filteredRecents = computed(() =>
  recents.value.filter((r) => {
    if (tab.value === 'missed' && !r.missed) return false
    if (q.value && !contactById(r.contactId).name.toLowerCase().includes(q.value)) return false
    return true
  })
)

function startCall(contact) {
  callee.value = contact
}

function onCallEnd({ duration, cancelled }) {
  if (callee.value) {
    recents.value.unshift({
      contactId: callee.value.id,
      ts: Date.now(),
      duration,
      cancelled,
      missed: false,
    })
  }
  callee.value = null
}

function subtitle(r) {
  if (r.missed) return 'Missed'
  if (r.cancelled || !r.duration) return 'Cancelled'
  return `FaceTime Video — ${formatDuration(r.duration)}`
}

onMounted(() => {
  if (!props.dial) return
  const target = CONTACTS.find((c) => c.name.toLowerCase() === props.dial.trim().toLowerCase())
  if (target) startCall(target)
})
</script>

<template>
  <div class="app-root ft">
    <CallView v-if="callee" :contact="callee" @end="onCallEnd" />

    <div v-else class="home">
      <aside class="side">
        <div class="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input v-model="query" placeholder="Search" spellcheck="false" />
        </div>

        <div class="seg">
          <button :class="{ on: tab === 'all' }" @click="tab = 'all'">All</button>
          <button :class="{ on: tab === 'missed' }" @click="tab = 'missed'">Missed</button>
        </div>

        <div class="list">
          <div
            v-for="(r, i) in filteredRecents"
            :key="i"
            class="row"
            @click="startCall(contactById(r.contactId))"
          >
            <span class="ra" :style="{ background: contactById(r.contactId).bg }">
              {{ initials(contactById(r.contactId).name) }}
            </span>
            <span class="rm">
              <b :class="{ missed: r.missed }">{{ contactById(r.contactId).name }}</b>
              <small>{{ r.missed ? '↙' : '↗' }} {{ subtitle(r) }}</small>
            </span>
            <span class="rt">
              <small>{{ formatClock(r.ts) }}</small>
              <span
                class="cam"
                title="FaceTime"
                @click.stop="startCall(contactById(r.contactId))"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="6" width="13" height="12" rx="2.5" />
                  <path d="m15 10.5 6-3.5v10l-6-3.5" />
                </svg>
              </span>
            </span>
          </div>
          <div v-if="!filteredRecents.length" class="empty">No recent calls</div>
        </div>
      </aside>

      <main class="main">
        <header class="hero">
          <h1>FaceTime</h1>
          <p>Start a video call with friends and family.</p>
          <span class="deco">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="6" width="13" height="12" rx="2.5" />
              <path d="m15 10.5 6-3.5v10l-6-3.5" />
            </svg>
          </span>
        </header>

        <h2 class="sect">Recent Contacts</h2>
        <div class="grid">
          <button v-for="c in filteredContacts" :key="c.id" class="card" @click="startCall(c)">
            <span class="ca" :style="{ background: c.bg }">{{ initials(c.name) }}</span>
            <b>{{ c.name }}</b>
            <small>FaceTime</small>
          </button>
        </div>
        <div v-if="!filteredContacts.length" class="empty">No contacts match “{{ query }}”</div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.ft {
  color: var(--text);
  background: var(--window-bg);
}
.ft button {
  font: inherit;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}
.home {
  flex: 1;
  min-height: 0;
  display: flex;
}

/* ---- sidebar ---- */
.side {
  width: 272px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
  min-height: 0;
}
.search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  color: var(--text-dim);
}
.search svg {
  width: 14px;
  height: 14px;
  flex: none;
}
.search input {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text);
}
.search input::placeholder {
  color: var(--text-dim);
}
.seg {
  display: flex;
  padding: 2px;
  background: var(--hover);
  border-radius: 8px;
}
.seg button {
  flex: 1;
  padding: 3px 0;
  font-size: 12px;
  border-radius: 6px;
  color: var(--text);
}
.seg button.on {
  background: var(--window-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}
.list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 -4px;
  padding: 0 4px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 9px;
  cursor: pointer;
}
.row:hover {
  background: var(--hover);
}
.ra {
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}
.rm {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.rm b {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rm b.missed {
  color: #ff453a;
}
.rm small {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rt {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}
.rt small {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
}
.cam {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #34c759;
}
.cam:hover {
  background: var(--selection);
}
.cam svg {
  width: 17px;
  height: 17px;
}
.empty {
  padding: 22px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-dim);
}

/* ---- main ---- */
.main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 20px 28px 28px;
  display: flex;
  flex-direction: column;
}
.hero {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  padding: 26px 28px;
  color: #fff;
  background: linear-gradient(135deg, #4fe389, #14a94f);
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.25);
}
.hero h1 {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.hero p {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.88;
}
.deco {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 84px;
  height: 84px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.35);
}
.deco svg {
  width: 44px;
  height: 44px;
}
.sect {
  margin: 22px 2px 12px;
  font-size: 15px;
  font-weight: 700;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 14px 10px;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 16px 6px 13px;
  border-radius: 14px;
  color: var(--text);
  transition: transform 0.12s, background 0.12s;
}
.card:hover {
  background: var(--hover);
  transform: translateY(-2px);
}
.ca {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 4px 14px rgba(0, 0, 0, 0.16);
}
.card b {
  font-size: 13px;
  font-weight: 600;
}
.card small {
  margin-top: -4px;
  font-size: 11px;
  color: var(--text-dim);
}
</style>
