<script setup>
import { computed, reactive, ref, onBeforeUnmount } from 'vue'
import { useWindowsStore } from '../../stores/windows'
import { apps } from '../../apps'
import GetButton from './GetButton.vue'

const windows = useWindowsStore()

/* ------------------------------ catalog data ----------------------------- */

// Hand-drawn 24-viewBox glyph fragments (stroked currentColor) rendered via v-html.
const GLYPHS = {
  hammer: '<path d="M12.5 3.5l6 6-2 2-6-6z"/><path d="M11.3 8.3L4.6 15"/>',
  clapper:
    '<path d="M4 10.5h16.5v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7z"/><path d="M4.2 10.5l1.5-5.2a1.6 1.6 0 0 1 2-1.1l11.6 3.4a1.6 1.6 0 0 1 1 2.1l-.6 1.6L4.2 10.5z"/><path d="M8 5.3l1.5 5M12.1 6.3l1.4 4.7M16.2 7.4l1.3 4.2"/>',
  waveform: '<path d="M4 10v4M8 7v10M12 4.5v15M16 8v8M20 10v4"/>',
  brush:
    '<path d="M20.3 3.7a1.8 1.8 0 0 0-2.5 0L9.2 12.3l2.5 2.5 8.6-8.6a1.8 1.8 0 0 0 0-2.5z"/><path d="M9.4 12.1c-2.3 1.2-3.9 3.2-4.8 7.3 4.1-.9 6.1-2.5 7.3-4.8"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.4l2.7 2.7L16 9.3"/>',
  knight:
    '<path d="M8 20v-1.8c0-1 .5-1.9 1-2.7.4-.8.5-1.7.5-2.5 0-1.2-.4-2.3-1.3-3.1L6.6 8.6l3.4-1 1.7-3.4a.7.7 0 0 1 1.2-.1l1.5 1.7 3 .9c1.6.5 2.6 2 2.6 3.7 0 1.6-1 3-2.4 3.6-.4 1.2-.3 2.4.2 3.6.3.8.4 1.5.4 2.2V20z"/><circle cx="12.2" cy="8.3" r=".8" fill="currentColor" stroke="none"/>',
  palette:
    '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.7-.7 1.7-1.6 0-.8-.6-1.3-.6-2.2 0-1 .8-1.7 1.9-1.7h1.6a4.4 4.4 0 0 0 4.4-4.4C20.5 6.4 16.6 3.5 12 3.5z"/><circle cx="7.6" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="7.6" r="1" fill="currentColor" stroke="none"/><circle cx="14.2" cy="7.4" r="1" fill="currentColor" stroke="none"/>',
  briefcase:
    '<rect x="3" y="7.5" width="18" height="12" rx="2.5"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5"/><path d="M3 12.5h18"/>',
  gamepad:
    '<path d="M7.2 8h9.6c2.9 0 4.7 2.2 4.7 5 0 2.1-1.3 4-3 4-1.2 0-2-.7-2.8-1.7-.4-.5-.9-.8-1.5-.8H9.8c-.6 0-1.1.3-1.5.8-.8 1-1.6 1.7-2.8 1.7-1.7 0-3-1.9-3-4 0-2.8 1.8-5 4.7-5z"/><path d="M8.2 11v3M6.7 12.5h3"/><circle cx="15.6" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="17.8" cy="13.6" r=".9" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m19.8 19.8-3.4-3.4"/>',
}

// Cards for apps that exist locally use their real icon files (img); imgGlyph
// means the file is a dark glyph recolored white via CSS on the gradient tile.
const CARDS = [
  { key: 'discord', appId: 'discord', name: 'Discord', cat: 'play', catLabel: 'Social', img: '/icons/discord.svg', imgGlyph: true, bg: 'linear-gradient(160deg,#8ea1f6,#5865f2)', blurb: 'Voice, video and text chat for your communities.' },
  { key: 'vscode', appId: 'vscode', name: 'Visual Studio Code', cat: 'develop', catLabel: 'Developer Tools', img: '/icons/vscode.png', bg: 'linear-gradient(160deg,#4fc3f7,#0078d4)', blurb: 'Code editing. Redefined.' },
  { key: 'calculator', appId: 'calculator', name: 'Calculator', cat: 'work', catLabel: 'Utilities', img: '/icons/calculator.png', bg: 'linear-gradient(160deg,#ffb340,#ff8a00)', blurb: 'Basic, scientific and programmer modes.' },
  { key: 'terminal', appId: 'terminal', name: 'Terminal', cat: 'develop', catLabel: 'Developer Tools', img: '/icons/terminal.png', bg: 'linear-gradient(160deg,#5b6472,#15181e)', blurb: 'The classic command line, refined.' },
  { key: 'notes', appId: 'notes', name: 'Notes', cat: 'work', catLabel: 'Productivity', img: '/icons/notes.png', bg: 'linear-gradient(160deg,#ffe98a,#ffcc00)', blurb: 'Capture thoughts as they come to you.' },
  { key: 'xcode', appId: null, name: 'Xcode', cat: 'develop', catLabel: 'Developer Tools', glyph: 'hammer', bg: 'linear-gradient(160deg,#66d9ff,#0a5cff)', blurb: 'Build apps for every Apple platform.' },
  { key: 'finalcut', appId: null, name: 'Final Cut Pro', cat: 'create', catLabel: 'Video', glyph: 'clapper', bg: 'linear-gradient(160deg,#43434c,#101014)', blurb: 'Professional post-production.' },
  { key: 'logic', appId: null, name: 'Logic Pro', cat: 'create', catLabel: 'Music', glyph: 'waveform', bg: 'linear-gradient(160deg,#3a4152,#171b24)', blurb: 'A complete recording studio.' },
  { key: 'pixelmator', appId: null, name: 'Pixelmator', cat: 'create', catLabel: 'Graphics & Design', glyph: 'brush', bg: 'linear-gradient(160deg,#ffd76e,#ff7a59)', blurb: 'Full-featured image editor.' },
  { key: 'things', appId: null, name: 'Things 3', cat: 'work', catLabel: 'Productivity', glyph: 'check', bg: 'linear-gradient(160deg,#7dd6ff,#1c7bff)', blurb: 'The award-winning personal task manager.' },
  { key: 'chess', appId: null, name: 'Chess Pro', cat: 'play', catLabel: 'Games', glyph: 'knight', bg: 'linear-gradient(160deg,#96a0b5,#3d4455)', blurb: 'Classic strategy, beautifully rendered.' },
]

const HERO = {
  ...CARDS.find((c) => c.key === 'finalcut'),
  bg: 'linear-gradient(115deg,#15151c 15%,#3d2b56 55%,#a03d6b 100%)',
  tag: 'Transform post-production with revolutionary video editing, Magnetic Timeline and ProRes RAW.',
}

const TILES = [
  { id: 'create', name: 'Create', glyph: 'palette', bg: 'linear-gradient(135deg,#ff9a9e,#a445b2)', desc: 'Design, photo, video & music' },
  { id: 'work', name: 'Work', glyph: 'briefcase', bg: 'linear-gradient(135deg,#4facfe,#0052d4)', desc: 'Productivity & utilities' },
  { id: 'play', name: 'Play', glyph: 'gamepad', bg: 'linear-gradient(135deg,#fa709a,#fee140)', desc: 'Games & entertainment' },
  { id: 'develop', name: 'Develop', glyph: 'hammer', bg: 'linear-gradient(135deg,#30cfd0,#330867)', desc: 'Developer tools' },
]

const UPDATES = [
  { key: 'discord', version: '0.0.318', date: '2 days ago', note: 'Voice channels now support up to 99 participants. Various bug fixes and performance improvements.' },
  { key: 'terminal', version: '2.15', date: '5 days ago', note: 'Faster GPU rendering, new Tahoe color themes and improved tab restoration.' },
  { key: 'notes', version: '4.4', date: '1 week ago', note: 'Smart folders, Quick Note gestures and stability improvements.' },
]

const cardByKey = (key) => CARDS.find((c) => c.key === key) || {}

/* ------------------------------ sidebar nav ------------------------------ */

const NAV = [
  { id: 'discover', label: 'Discover', d: 'M8 1.4l2.02 4.1 4.52.66-3.27 3.19.77 4.5L8 11.68l-4.04 2.13.77-4.5L3.46 6.16l4.52-.66L8 1.4z' },
  { id: 'create', label: 'Create', d: 'M9.06 2.52l4.42 4.42-8.5 8.5c-.2.2-.46.34-.74.4l-3.2.72c-.5.11-.96-.35-.85-.85l.72-3.2c.06-.28.2-.54.4-.74l8.5-8.5zM11.8 1.2l2.3 2.3-1.2 1.2-2.3-2.3 1.2-1.2z' },
  { id: 'work', label: 'Work', d: 'M6 4.5V3.6C6 2.6 6.8 2 7.6 2h.8C9.2 2 10 2.6 10 3.6v.9h3.3c.86 0 1.7.7 1.7 1.7v5.6c0 1-.84 1.7-1.7 1.7H2.7c-.86 0-1.7-.7-1.7-1.7V6.2c0-1 .84-1.7 1.7-1.7H6zm1.2 0h1.6V3.7c0-.3-.2-.5-.5-.5h-.6c-.3 0-.5.2-.5.5v.8z' },
  { id: 'play', label: 'Play', d: 'M5.2 5h5.6c2.3 0 4 1.8 4 4.2 0 1.7-1 3-2.4 3-1 0-1.7-.6-2.4-1.4-.3-.4-.7-.6-1.2-.6H7.2c-.5 0-.9.2-1.2.6-.7.8-1.4 1.4-2.4 1.4-1.4 0-2.4-1.3-2.4-3C1.2 6.8 2.9 5 5.2 5zM5.5 6.8v1.1H4.4v1.1h1.1v1.1h1.1V9h1.1V7.9H6.6V6.8H5.5zm5.2.5a.75.75 0 110 1.5.75.75 0 010-1.5zm1.4 1.4a.75.75 0 110 1.5.75.75 0 010-1.5z' },
  { id: 'develop', label: 'Develop', d: 'M8.5 2.2c.9-.05 1.9.15 2.7.55l1.7 1.15c.5.3.6.95.3 1.4l-.6.9c-.3.5-.95.6-1.4.3l-.9-.6-3.6 3.6.4.5c.3.5.3 1.1-.2 1.5l-2.5 2.1c-.5.4-1.2.4-1.6-.1l-1.2-1.3c-.4-.4-.4-1.1 0-1.5l2.6-2.4c.4-.4 1-.4 1.5-.1l.4.4 3-3c-.5-1.1-.6-2.4-.2-3.55.1-.55.4-.75.9-.8.3-.05.5-.05.7-.05z' },
  { id: 'categories', label: 'Categories', d: 'M2.5 2h4c.28 0 .5.22.5.5v4c0 .28-.22.5-.5.5h-4c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5zm7 0h4c.28 0 .5.22.5.5v4c0 .28-.22.5-.5.5h-4c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5zm-7 7h4c.28 0 .5.22.5.5v4c0 .28-.22.5-.5.5h-4c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5zm7 0h4c.28 0 .5.22.5.5v4c0 .28-.22.5-.5.5h-4c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5z' },
]
const UPDATES_ICON = 'M8 1.75A6.25 6.25 0 111.75 8c0-.41.34-.75.75-.75s.75.34.75.75A4.75 4.75 0 108 3.25v1.4c0 .4-.47.62-.77.35L4.9 2.9a.5.5 0 010-.7L7.23.1c.3-.27.77-.05.77.35v1.3z'

const section = ref('discover')
const query = ref('')
const searchFocused = ref(false)

const titles = { discover: 'Discover', create: 'Create', work: 'Work', play: 'Play', develop: 'Develop', categories: 'Categories', updates: 'Updates' }
const title = computed(() => (query.value.trim() ? 'Search' : titles[section.value]))

const visibleCards = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q) return CARDS.filter((c) => `${c.name} ${c.catLabel} ${c.blurb}`.toLowerCase().includes(q))
  if (section.value === 'discover') return CARDS
  return CARDS.filter((c) => c.cat === section.value)
})
const showGrid = computed(() => !!query.value.trim() || (section.value !== 'categories' && section.value !== 'updates'))
const gridHeading = computed(() => {
  if (query.value.trim()) return `Results for “${query.value.trim()}”`
  return section.value === 'discover' ? 'Apps We Love' : titles[section.value]
})

function select(id) {
  section.value = id
  query.value = ''
}

/* --------------------------- install / open logic ------------------------ */

const store = reactive({}) // key -> { status: 'idle'|'installing'|'installed', progress }
const timers = {}

try {
  JSON.parse(localStorage.getItem('macos-web:appstore-installed') || '[]').forEach((k) => {
    store[k] = { status: 'installed', progress: 1 }
  })
} catch { /* fresh start */ }

const statusOf = (key) => store[key]?.status || 'idle'
const progressOf = (key) => store[key]?.progress || 0
const openable = (appId) => !!appId && !!apps[appId]

function persist() {
  const done = Object.keys(store).filter((k) => store[k].status === 'installed')
  localStorage.setItem('macos-web:appstore-installed', JSON.stringify(done))
}

function install(key) {
  if (statusOf(key) !== 'idle') return
  store[key] = { status: 'installing', progress: 0 }
  timers[key] = setInterval(() => {
    const s = store[key]
    s.progress = Math.min(1, s.progress + 0.05 + Math.random() * 0.06)
    if (s.progress >= 1) {
      clearInterval(timers[key])
      delete timers[key]
      store[key] = { status: 'installed', progress: 1 }
      persist()
    }
  }, 70)
}

function onAction(key, appId) {
  if (statusOf(key) === 'installed') {
    if (openable(appId)) windows.openApp(appId)
  } else {
    install(key)
  }
}

onBeforeUnmount(() => Object.values(timers).forEach(clearInterval))

/* -------------------------------- updates -------------------------------- */

const updKey = (key) => `upd:${key}`
const pending = computed(() => UPDATES.filter((u) => statusOf(updKey(u.key)) !== 'installed').length)

function updateAll() {
  UPDATES.forEach((u, i) => {
    setTimeout(() => {
      if (statusOf(updKey(u.key)) === 'idle') install(updKey(u.key))
    }, i * 350)
  })
}
</script>

<template>
  <div class="app-root store">
    <div class="store-body">
      <!-- Sidebar -->
      <aside class="sidebar glass">
        <nav class="side-nav">
          <button
            v-for="item in NAV"
            :key="item.id"
            class="side-item"
            :class="{ on: section === item.id && !query }"
            @click="select(item.id)"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" fill-rule="evenodd"><path :d="item.d" /></svg>
            <span>{{ item.label }}</span>
          </button>
        </nav>
        <div class="side-divider" />
        <nav class="side-nav">
          <button class="side-item" :class="{ on: section === 'updates' && !query }" @click="select('updates')">
            <svg viewBox="0 0 16 16" fill="currentColor" fill-rule="evenodd"><path :d="UPDATES_ICON" /></svg>
            <span>Updates</span>
            <span v-if="pending" class="badge">{{ pending }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main content -->
      <main class="content">
        <header class="toolbar">
          <h1>{{ title }}</h1>
          <div class="search" :class="{ focus: searchFocused }">
            <svg viewBox="0 0 16 16" fill="currentColor" fill-rule="evenodd">
              <path d="M6.7 1.8a4.9 4.9 0 100 9.8 4.9 4.9 0 000-9.8zm0 1.5a3.4 3.4 0 110 6.8 3.4 3.4 0 010-6.8zm3.5 6.1l3 3a.75.75 0 11-1.06 1.06l-3-3 1.06-1.06z" />
            </svg>
            <input v-model="query" placeholder="Search" @focus="searchFocused = true" @blur="searchFocused = false" />
            <button v-if="query" class="clear" @click="query = ''">✕</button>
          </div>
        </header>

        <div class="scroll">
          <!-- Discover hero -->
          <section v-if="!query && section === 'discover'" class="hero-banner" :style="{ background: HERO.bg }">
            <div class="hero-text">
              <div class="eyebrow">Featured</div>
              <div class="hero-name">{{ HERO.name }}</div>
              <div class="hero-tag">{{ HERO.tag }}</div>
              <GetButton
                hero
                :status="statusOf(HERO.key)"
                :progress="progressOf(HERO.key)"
                :openable="openable(HERO.appId)"
                @action="onAction(HERO.key, HERO.appId)"
              />
            </div>
            <div class="hero-art">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" v-html="GLYPHS[HERO.glyph]"></svg>
            </div>
          </section>

          <!-- App grid (discover / category / search results) -->
          <template v-if="showGrid">
            <div class="section-head">
              <h2>{{ gridHeading }}</h2>
              <span v-if="query" class="count">{{ visibleCards.length }}</span>
            </div>
            <div v-if="visibleCards.length" class="grid">
              <div v-for="c in visibleCards" :key="c.key" class="card">
                <img v-if="c.img && !c.imgGlyph" class="squircle-img" :src="c.img" :alt="c.name" />
                <div v-else class="squircle" :style="{ background: c.bg }">
                  <img v-if="c.img" class="glyph-img" :src="c.img" alt="" />
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="GLYPHS[c.glyph]"></svg>
                </div>
                <div class="card-info">
                  <div class="card-name">{{ c.name }}</div>
                  <div class="card-cat">{{ c.catLabel }}</div>
                </div>
                <GetButton
                  :status="statusOf(c.key)"
                  :progress="progressOf(c.key)"
                  :openable="openable(c.appId)"
                  @action="onAction(c.key, c.appId)"
                />
              </div>
            </div>
            <div v-else class="empty">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="GLYPHS.search"></svg>
              </div>
              <div>No results for “{{ query }}”</div>
            </div>
          </template>

          <!-- Categories tiles -->
          <div v-else-if="!query && section === 'categories'" class="tiles">
            <button v-for="t in TILES" :key="t.id" class="tile" :style="{ background: t.bg }" @click="select(t.id)">
              <span class="tile-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="GLYPHS[t.glyph]"></svg>
              </span>
              <span class="tile-name">{{ t.name }}</span>
              <span class="tile-desc">{{ t.desc }}</span>
            </button>
          </div>

          <!-- Updates -->
          <template v-else-if="!query && section === 'updates'">
            <div class="section-head">
              <h2>{{ pending ? 'Pending Updates' : 'Up to Date' }}</h2>
              <button v-if="pending" class="update-all" @click="updateAll">Update All</button>
            </div>
            <div v-if="pending" class="updates">
              <div v-for="u in UPDATES.filter((x) => statusOf(updKey(x.key)) !== 'installed')" :key="u.key" class="update-row">
                <img v-if="cardByKey(u.key).img && !cardByKey(u.key).imgGlyph" class="squircle-img" :src="cardByKey(u.key).img" :alt="cardByKey(u.key).name" />
                <div v-else class="squircle" :style="{ background: cardByKey(u.key).bg }">
                  <img v-if="cardByKey(u.key).img" class="glyph-img" :src="cardByKey(u.key).img" alt="" />
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="GLYPHS[cardByKey(u.key).glyph]"></svg>
                </div>
                <div class="update-info">
                  <div class="update-top">
                    <span class="card-name">{{ cardByKey(u.key).name }}</span>
                    <span class="update-ver">{{ u.version }} · {{ u.date }}</span>
                  </div>
                  <div class="update-note"><b>What's New:</b> {{ u.note }}</div>
                </div>
                <GetButton
                  label="UPDATE"
                  :status="statusOf(updKey(u.key))"
                  :progress="progressOf(updKey(u.key))"
                  :openable="openable(cardByKey(u.key).appId)"
                  @action="onAction(updKey(u.key), cardByKey(u.key).appId)"
                />
              </div>
            </div>
            <div v-else class="empty">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="GLYPHS.check"></svg>
              </div>
              <div>All your apps are up to date.</div>
            </div>
          </template>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.store-body { flex: 1; display: flex; min-height: 0; }

/* -------------------------------- sidebar -------------------------------- */
.sidebar {
  width: 218px; flex-shrink: 0; padding: 14px 10px;
  border-right: 0.5px solid var(--border);
  display: flex; flex-direction: column; gap: 2px;
}
.side-nav { display: flex; flex-direction: column; gap: 2px; }
.side-item {
  display: flex; align-items: center; gap: 9px;
  height: 30px; padding: 0 10px; border-radius: 8px;
  font-size: 13px; color: var(--text); text-align: left;
}
.side-item:hover { background: var(--hover); }
.side-item.on { background: var(--selection); }
.side-item svg { width: 16px; height: 16px; color: var(--text-dim); flex-shrink: 0; }
.side-item.on svg { color: var(--accent); }
.side-divider { height: 0.5px; background: var(--border); margin: 8px 10px; }
.badge {
  margin-left: auto; background: #ff3b30; color: #fff;
  font-size: 11px; font-weight: 700; min-width: 18px; height: 18px;
  border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px;
}

/* -------------------------------- content -------------------------------- */
.content { flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--window-bg); }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 26px 10px; }
.toolbar h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
.search {
  display: flex; align-items: center; gap: 6px;
  width: 220px; height: 28px; padding: 0 8px; border-radius: 8px;
  background: rgba(120, 120, 128, 0.14); border: 0.5px solid transparent;
}
.search.focus { border-color: var(--accent); background: var(--window-bg); }
.search svg { width: 13px; height: 13px; color: var(--text-dim); flex-shrink: 0; }
.search input { flex: 1; min-width: 0; border: none; outline: none; background: none; font-size: 13px; }
.search input::placeholder { color: var(--text-dim); }
.clear {
  color: var(--text-dim); font-size: 10px; width: 15px; height: 15px; border-radius: 50%;
  background: rgba(120, 120, 128, 0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.scroll { flex: 1; overflow-y: auto; padding: 4px 26px 26px; }

/* ---------------------------------- hero ---------------------------------- */
.hero-banner {
  position: relative; height: 290px; border-radius: 16px;
  padding: 34px 38px; margin: 8px 0 26px;
  display: flex; align-items: center; overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
.hero-text { max-width: 56%; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
.eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255, 255, 255, 0.72); }
.hero-name { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
.hero-tag { font-size: 14px; line-height: 1.45; color: rgba(255, 255, 255, 0.85); margin-bottom: 6px; }
.hero-art {
  position: absolute; right: 52px; width: 148px; height: 148px; border-radius: 34px;
  display: grid; place-items: center; color: #fff;
  background: linear-gradient(160deg, #43434c, #101014);
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.22), 0 16px 28px rgba(0, 0, 0, 0.45);
  transform: rotate(6deg);
}
.hero-art svg { width: 74px; height: 74px; }

/* ---------------------------------- grid ---------------------------------- */
.section-head { display: flex; align-items: baseline; gap: 8px; margin: 6px 0 12px; }
.section-head h2 { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
.count { font-size: 13px; color: var(--text-dim); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
.card {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border: 0.5px solid var(--border); border-radius: 14px; background: var(--glass);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.12); }
.squircle {
  width: 52px; height: 52px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; color: #fff;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.25), 0 2px 6px rgba(0, 0, 0, 0.18);
}
.squircle svg { width: 28px; height: 28px; }
.squircle-img {
  width: 52px; height: 52px; flex-shrink: 0;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.18));
}
.glyph-img { width: 30px; height: 30px; filter: brightness(0) invert(1); }
.card-info { flex: 1; min-width: 0; }
.card-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-cat { font-size: 12px; color: var(--text-dim); margin-top: 2px; }

/* --------------------------------- tiles ---------------------------------- */
.tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 8px; }
.tile {
  height: 128px; border-radius: 14px; padding: 18px 20px; text-align: left; color: #fff;
  display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; gap: 3px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18); transition: transform 0.15s ease;
}
.tile:hover { transform: scale(1.015); }
.tile-icon { margin-bottom: auto; display: block; }
.tile-icon svg { width: 36px; height: 36px; }
.tile-name { font-size: 17px; font-weight: 700; }
.tile-desc { font-size: 12px; color: rgba(255, 255, 255, 0.85); }

/* -------------------------------- updates --------------------------------- */
.update-all {
  margin-left: auto; font-size: 12px; font-weight: 700; color: var(--accent);
  background: rgba(120, 120, 128, 0.16); border-radius: 999px; padding: 4px 14px;
}
.update-all:hover { background: rgba(120, 120, 128, 0.28); }
.updates { display: flex; flex-direction: column; gap: 12px; }
.update-row {
  display: flex; align-items: center; gap: 12px; padding: 14px;
  border: 0.5px solid var(--border); border-radius: 14px; background: var(--glass);
}
.update-info { flex: 1; min-width: 0; }
.update-top { display: flex; align-items: baseline; gap: 8px; }
.update-ver { font-size: 11px; color: var(--text-dim); }
.update-note { font-size: 12px; color: var(--text-dim); margin-top: 3px; line-height: 1.4; }

/* --------------------------------- empty ---------------------------------- */
.empty { padding: 70px 0; text-align: center; color: var(--text-dim); font-size: 14px; }
.empty-icon { display: flex; justify-content: center; margin-bottom: 10px; }
.empty-icon svg { width: 44px; height: 44px; }
</style>
