<script setup>
// Google Chrome clone: Chrome tab strip + toolbar + omnibox + bookmarks bar.
// Browsing works like the upgraded Safari — Google start page, live Wikipedia
// search via the CORS-open API, Google-style results, a clean article reader,
// and direct URLs in an iframe with a "may be blocked" banner.
import { ref, computed, watch } from 'vue'
import { useSystemStore } from '../../stores/system'
import { searchWikipedia, fetchArticle, articleUrl } from './wiki'
import StartPage from './StartPage.vue'
import SearchResults from './SearchResults.vue'
import ArticleView from './ArticleView.vue'

const props = defineProps({
  query: { type: String, default: '' },
})

const system = useSystemStore()
const dark = computed(() => system.dark)

function hostFor(url) {
  try {
    const full = /^https?:\/\//i.test(url) ? url : 'https://' + url
    return new URL(full).hostname.replace(/^www\./, '') || url
  } catch {
    return url
  }
}

function faviconLetter(url) {
  const letter = hostFor(url).charAt(0)
  return letter ? letter.toUpperCase() : '?'
}

function faviconGradient(url) {
  const host = hostFor(url)
  let hue = 0
  for (let i = 0; i < host.length; i++) hue = (hue * 31 + host.charCodeAt(i)) % 360
  return `linear-gradient(160deg, hsl(${hue}, 55%, 68%), hsl(${(hue + 40) % 360}, 48%, 50%))`
}

let nextId = 1

// A tab shows one of: Google start page ('start'), iframe ('web'),
// Wikipedia results ('search') or a Wikipedia article ('article').
// History entries are { kind:'web', url } | { kind:'search', q, results? }
// | { kind:'article', title, html? } — data cached on the entry so
// back/forward works without refetching.
function makeTab() {
  return {
    id: nextId++,
    kind: 'start',
    url: '',
    title: 'New Tab',
    history: [],
    historyIndex: -1,
    reloadKey: 0,
    loading: false,
    bannerDismissed: false,
    error: '',
    search: null, // { q, results }
    article: null, // { title, html }
  }
}

const tabs = ref([makeTab()])
const activeTabId = ref(tabs.value[0].id)
const activeTab = computed(() => tabs.value.find((t) => t.id === activeTabId.value) || tabs.value[0])

const canGoBack = computed(() => activeTab.value.historyIndex > 0)
const canGoForward = computed(() => activeTab.value.historyIndex < activeTab.value.history.length - 1)

let nextEid = 1

// NOTE: entries pushed into the reactive history array come back out as
// reactive proxies, so identity comparison (===) would always fail — compare
// stable entry ids instead.
function isCurrent(tab, entry) {
  return tab.history[tab.historyIndex]?.eid === entry.eid
}

function applyEntry(tab, entry) {
  tab.kind = entry.kind
  tab.error = ''
  tab.bannerDismissed = false
  if (entry.kind === 'web') {
    tab.url = entry.url
    tab.title = hostFor(entry.url)
    tab.search = null
    tab.article = null
    tab.loading = true // cleared by the iframe's load event
  } else if (entry.kind === 'search') {
    tab.url = entry.q
    tab.title = entry.q + ' - Google Search'
    tab.article = null
    tab.search = { q: entry.q, results: entry.results || [] }
    if (entry.results) tab.loading = false
    else runSearch(tab, entry)
  } else if (entry.kind === 'article') {
    tab.url = articleUrl(entry.title)
    tab.title = entry.title
    tab.search = null
    tab.article = entry.html ? { title: entry.title, html: entry.html } : null
    if (entry.html) tab.loading = false
    else runArticle(tab, entry)
  }
}

function pushEntry(tab, entry) {
  if (!entry.eid) entry.eid = nextEid++
  tab.history = tab.history.slice(0, tab.historyIndex + 1)
  tab.history.push(entry)
  tab.historyIndex = tab.history.length - 1
  applyEntry(tab, entry)
}

// Hard cap on API waits: flaky networks can leave fetch() pending forever,
// so race every call against a timer and surface the error card instead.
function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
  ])
}

async function runSearch(tab, entry) {
  tab.loading = true
  tab.error = ''
  try {
    const results = await withTimeout(searchWikipedia(entry.q))
    entry.results = results
    if (isCurrent(tab, entry)) tab.search = { q: entry.q, results }
    // "I'm Feeling Lucky": jump straight to the top hit
    if (entry.lucky && results.length && isCurrent(tab, entry)) {
      openArticle(tab, results[0].title)
      return
    }
  } catch {
    if (isCurrent(tab, entry)) tab.error = `Chrome couldn't search Wikipedia for “${entry.q}”.`
  } finally {
    if (isCurrent(tab, entry)) tab.loading = false
  }
}

async function runArticle(tab, entry) {
  tab.loading = true
  tab.error = ''
  try {
    const { title, html } = await withTimeout(fetchArticle(entry.title))
    entry.title = title // canonical title (redirects resolved)
    entry.html = html
    if (isCurrent(tab, entry)) {
      tab.url = articleUrl(title)
      tab.title = title + ' - Wikipedia'
      tab.article = { title, html }
    }
  } catch {
    if (isCurrent(tab, entry)) tab.error = `Chrome couldn't load the Wikipedia article “${entry.title}”.`
  } finally {
    if (isCurrent(tab, entry)) tab.loading = false
  }
}

// Omnibox submit: en.wikipedia.org/wiki/<X> → article; bare domain or URL →
// iframe; anything else → live Wikipedia search shown as Google results.
function navigate(tab, raw) {
  const input = raw.trim()
  if (!input) return
  const wikiMatch = input
    .replace(/^https?:\/\//i, '')
    .match(/^en\.wikipedia\.org\/wiki\/([^?#]+)/i)
  if (wikiMatch) {
    openArticle(tab, decodeURIComponent(wikiMatch[1]).replace(/_/g, ' '))
  } else if (/^https?:\/\//i.test(input)) {
    pushEntry(tab, { kind: 'web', url: input })
  } else if (input.includes('.') && !input.includes(' ')) {
    pushEntry(tab, { kind: 'web', url: 'https://' + input })
  } else {
    pushEntry(tab, { kind: 'search', q: input })
  }
}

function openArticle(tab, title) {
  pushEntry(tab, { kind: 'article', title })
}

function goBack() {
  const tab = activeTab.value
  if (!canGoBack.value) return
  tab.historyIndex--
  applyEntry(tab, tab.history[tab.historyIndex])
}

function goForward() {
  const tab = activeTab.value
  if (!canGoForward.value) return
  tab.historyIndex++
  applyEntry(tab, tab.history[tab.historyIndex])
}

function reload() {
  const tab = activeTab.value
  const entry = tab.history[tab.historyIndex]
  if (!entry) return
  if (entry.kind === 'web') {
    tab.reloadKey++
    tab.loading = true
  } else if (entry.kind === 'search') {
    entry.results = null
    tab.search = null
    runSearch(tab, entry)
  } else if (entry.kind === 'article') {
    entry.html = null
    tab.article = null
    runArticle(tab, entry)
  }
}

function retry() {
  reload()
}

function onFrameLoad() {
  const tab = activeTab.value
  tab.loading = false
  if (tab.url) tab.title = hostFor(tab.url)
}

function newTab() {
  const tab = makeTab()
  tabs.value.push(tab)
  activeTabId.value = tab.id
}

function closeTab(id) {
  const idx = tabs.value.findIndex((t) => t.id === id)
  if (idx === -1) return
  tabs.value.splice(idx, 1)
  if (!tabs.value.length) {
    const tab = makeTab()
    tabs.value.push(tab)
    activeTabId.value = tab.id
  } else if (activeTabId.value === id) {
    activeTabId.value = tabs.value[Math.min(idx, tabs.value.length - 1)].id
  }
}

// ── Bookmarks ──────────────────────────────────────────────────────────────
const BM_KEY = 'macos-web:chrome-bookmarks'
const DEFAULT_BOOKMARKS = [
  { title: 'Google', url: 'google.com' },
  { title: 'YouTube', url: 'youtube.com' },
  { title: 'GitHub', url: 'github.com' },
  { title: 'Wikipedia', url: 'en.wikipedia.org' },
]

function loadBookmarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(BM_KEY) || 'null')
    if (Array.isArray(saved) && saved.length) return saved
  } catch { /* fall through to defaults */ }
  return [...DEFAULT_BOOKMARKS]
}

const bookmarks = ref(loadBookmarks())
watch(bookmarks, (v) => localStorage.setItem(BM_KEY, JSON.stringify(v)), { deep: true })

const isBookmarked = computed(() => {
  const url = activeTab.value.url
  return !!url && bookmarks.value.some((b) => b.url === url)
})

function toggleBookmark() {
  const tab = activeTab.value
  if (!tab.url) return
  const idx = bookmarks.value.findIndex((b) => b.url === tab.url)
  if (idx >= 0) bookmarks.value.splice(idx, 1)
  else bookmarks.value.push({ title: tab.title, url: tab.url })
}

function openBookmark(bm) {
  navigate(activeTab.value, bm.url)
}

// ── ⋮ Chrome menu (decorative except New Tab) ───────────────────────────────
const menuOpen = ref(false)
const menuItems = ['New Tab', 'History', 'Downloads', 'Settings']

function onMenuItem(item) {
  menuOpen.value = false
  if (item === 'New Tab') newTab()
}

// ── Omnibox editing ─────────────────────────────────────────────────────────
const editing = ref(false)
const draft = ref('')

const addressDisplay = computed(() => {
  if (editing.value) return draft.value
  return activeTab.value.url || ''
})

function onAddressFocus(e) {
  editing.value = true
  draft.value = activeTab.value.url || ''
  requestAnimationFrame(() => e.target.select())
}

function onAddressEnter() {
  navigate(activeTab.value, draft.value)
  editing.value = false
  document.activeElement?.blur()
}

function onAddressEscape(e) {
  draft.value = activeTab.value.url || ''
  editing.value = false
  e.target.blur()
}

function externalUrl(tab) {
  if (!tab.url) return ''
  return tab.kind === 'web' ? tab.url : 'https://' + tab.url
}

function openExternal() {
  const url = externalUrl(activeTab.value)
  if (url) window.open(url, '_blank')
}

// Tab favicon: G chip for search, W for Wikipedia, letter for web sites
function tabFavicon(tab) {
  if (tab.kind === 'search') return { letter: 'G', bg: '#4285f4' }
  if (tab.kind === 'article') return { letter: 'W', bg: '#6b6d70' }
  if (tab.kind === 'web') return { letter: faviconLetter(tab.url), bg: faviconGradient(tab.url) }
  return null
}

// Launch with a query (e.g. from Spotlight) → run it as a search
if (props.query) navigate(tabs.value[0], props.query)
</script>

<template>
  <div class="app-root chrome" :class="{ dark }">
    <!-- Tab strip -->
    <div class="tab-strip">
      <div class="tabs">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: tab.id === activeTabId }"
          @click="activeTabId = tab.id"
        >
          <span
            v-if="tabFavicon(tab)"
            class="tab-favicon"
            :style="{ background: tabFavicon(tab).bg }"
          >{{ tabFavicon(tab).letter }}</span>
          <span v-else class="tab-favicon tab-favicon-blank">
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
          </span>
          <span class="tab-title">{{ tab.loading ? 'Loading…' : tab.title }}</span>
          <button class="tab-close" title="Close tab" @click.stop="closeTab(tab.id)">×</button>
        </div>
      </div>
      <button class="new-tab" title="New tab" @click="newTab">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="tool-btn" :disabled="!canGoBack" title="Back" @click="goBack">
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2 4 7l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="tool-btn" :disabled="!canGoForward" title="Forward" @click="goForward">
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 2l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="tool-btn" :disabled="activeTab.historyIndex < 0" title="Reload" @click="reload">
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M12 7A5 5 0 1 1 10.6 3.6M12 1.4v3h-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <div class="omnibox" :class="{ focused: editing }">
        <span class="omni-icon">
          <svg v-if="activeTab.url" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/>
            <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>
          </svg>
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="m16.2 16.2 4.8 4.8"/>
          </svg>
        </span>
        <input
          class="omni-input"
          :value="addressDisplay"
          placeholder="Search Google or type a URL"
          spellcheck="false"
          @input="draft = $event.target.value"
          @focus="onAddressFocus"
          @blur="editing = false"
          @keydown.enter="onAddressEnter"
          @keydown.escape="onAddressEscape"
        />
        <button
          class="star"
          :class="{ filled: isBookmarked }"
          :disabled="!activeTab.url"
          :title="isBookmarked ? 'Edit bookmark' : 'Bookmark this tab'"
          @click="toggleBookmark"
        >
          <svg width="15" height="15" viewBox="0 0 15 15">
            <path
              d="M7.5 1.8 9.3 5.4l4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L1.7 6l4-.6z"
              :fill="isBookmarked ? 'currentColor' : 'none'"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div class="menu-wrap">
        <button class="tool-btn" title="Customize and control Google Chrome" @click.stop="menuOpen = !menuOpen">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="2.4" r="1.3" fill="currentColor"/>
            <circle cx="7" cy="7" r="1.3" fill="currentColor"/>
            <circle cx="7" cy="11.6" r="1.3" fill="currentColor"/>
          </svg>
        </button>
        <div v-if="menuOpen" class="menu" @click.stop>
          <button v-for="item in menuItems" :key="item" class="menu-item" @click="onMenuItem(item)">
            {{ item }}
          </button>
        </div>
      </div>
      <div v-if="menuOpen" class="menu-backdrop" @click="menuOpen = false"></div>
    </div>

    <!-- Bookmarks bar -->
    <div class="bookmarks-bar">
      <button
        v-for="bm in bookmarks"
        :key="bm.url"
        class="bookmark"
        :title="bm.url"
        @click="openBookmark(bm)"
      >
        <span class="bm-favicon" :style="{ background: faviconGradient(bm.url) }">{{ faviconLetter(bm.url) }}</span>
        <span class="bm-title">{{ bm.title }}</span>
      </button>
    </div>

    <!-- Content -->
    <div class="content">
      <template v-if="activeTab.kind === 'web'">
        <div class="page-column">
          <div v-if="!activeTab.bannerDismissed" class="embed-banner">
            <span class="embed-text">This page may be blocked from loading in an embedded frame.</span>
            <button class="embed-open" @click="openExternal">Open externally</button>
            <button class="embed-dismiss" title="Dismiss" @click="activeTab.bannerDismissed = true">×</button>
          </div>
          <iframe
            :key="activeTab.id + '-' + activeTab.reloadKey + '-' + activeTab.url"
            :src="activeTab.url"
            class="web-frame"
            title="Chrome page"
            @load="onFrameLoad"
          ></iframe>
        </div>
      </template>

      <div v-else-if="activeTab.error" class="error-state">
        <div class="error-card">
          <div class="error-code">ERR_CONNECTION_FAILED</div>
          <div class="error-title">This site can't be reached</div>
          <div class="error-text">{{ activeTab.error }} Check your internet connection and try again.</div>
          <button class="error-retry" @click="retry">Retry</button>
        </div>
      </div>

      <SearchResults
        v-else-if="activeTab.kind === 'search'"
        :q="activeTab.search ? activeTab.search.q : activeTab.title"
        :results="activeTab.search ? activeTab.search.results : []"
        :loading="activeTab.loading"
        @open="openArticle(activeTab, $event)"
      />

      <ArticleView
        v-else-if="activeTab.kind === 'article'"
        :key="activeTab.id + '-' + activeTab.url"
        :title="activeTab.article ? activeTab.article.title : activeTab.title"
        :html="activeTab.article ? activeTab.article.html : ''"
        @navigate="openArticle(activeTab, $event)"
      />

      <StartPage
        v-else
        @search="navigate(activeTab, $event)"
        @lucky="pushEntry(activeTab, { kind: 'search', q: $event, lucky: true })"
        @open-url="navigate(activeTab, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
/* Chrome theme — light: Chrome gray/white; dark: #202124 toolbar, #292a2d bg.
   Children reference these vars (they inherit through scoped boundaries). */
.chrome {
  --cx-strip: #dee1e6;
  --cx-toolbar: #ffffff;
  --cx-content: #ffffff;
  --cx-text: #202124;
  --cx-dim: #5f6368;
  --cx-omni: #f1f3f4;
  --cx-omni-focus: #ffffff;
  --cx-hover: rgba(60, 64, 67, 0.1);
  --cx-border: #dadce0;
  --cx-blue: #1a73e8;
  --cx-link: #1a0dab;
  --cx-green: #006621;
  --cx-star: #1a73e8;
  background: var(--cx-content);
  color: var(--cx-text);
  font-size: 13px;
  font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif;
}
.chrome.dark {
  --cx-strip: #161719;
  --cx-toolbar: #202124;
  --cx-content: #292a2d;
  --cx-text: #e8eaed;
  --cx-dim: #9aa0a6;
  --cx-omni: #303134;
  --cx-omni-focus: #303134;
  --cx-hover: rgba(255, 255, 255, 0.12);
  --cx-border: #3c4043;
  --cx-blue: #8ab4f8;
  --cx-link: #8ab4f8;
  --cx-green: #81c995;
  --cx-star: #8ab4f8;
}

/* ── Tab strip ── */
.tab-strip {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 7px 10px 0;
  background: var(--cx-strip);
  flex-shrink: 0;
  user-select: none;
}
.tabs { display: flex; gap: 2px; flex: 0 1 auto; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 110px;
  max-width: 220px;
  flex: 1 1 160px;
  height: 32px;
  padding: 0 8px 0 12px;
  border-radius: 9px 9px 0 0;
  color: var(--cx-dim);
  cursor: default;
  white-space: nowrap;
  position: relative;
}
.tab:hover { background: var(--cx-hover); }
/* Active tab merges into the toolbar: same color, rounded top, no seam */
.tab.active { background: var(--cx-toolbar); color: var(--cx-text); }
.tab-favicon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9.5px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.tab-favicon-blank { background: transparent; color: var(--cx-dim); }
.tab-title { flex: 1; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
.tab-close {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: default;
  flex-shrink: 0;
}
.tab-close:hover { background: var(--cx-hover); }
.new-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-bottom: 2px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--cx-text);
  cursor: default;
  flex-shrink: 0;
}
.new-tab:hover { background: var(--cx-hover); }

/* ── Toolbar ── */
.toolbar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: var(--cx-toolbar);
  flex-shrink: 0;
}
.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--cx-text);
  cursor: default;
  flex-shrink: 0;
}
.tool-btn:hover:not(:disabled) { background: var(--cx-hover); }
.tool-btn:disabled { color: var(--cx-dim); opacity: 0.45; }

.omnibox {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 8px 0 14px;
  border-radius: 16px;
  background: var(--cx-omni);
  border: 1px solid transparent;
}
.omnibox.focused {
  background: var(--cx-omni-focus);
  border-color: var(--cx-border);
  box-shadow: 0 1px 6px rgba(32, 33, 36, 0.22);
}
.omni-icon { display: flex; align-items: center; justify-content: center; color: var(--cx-dim); flex-shrink: 0; }
.omni-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--cx-text);
  font-size: 13px;
}
.omni-input::placeholder { color: var(--cx-dim); }
.star {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--cx-dim);
  cursor: default;
  flex-shrink: 0;
}
.star:hover:not(:disabled) { background: var(--cx-hover); }
.star:disabled { opacity: 0.4; }
.star.filled { color: var(--cx-star); }

/* ── ⋮ menu ── */
.menu-wrap { position: relative; flex-shrink: 0; }
.menu {
  position: absolute;
  top: 36px;
  right: 0;
  min-width: 190px;
  padding: 6px 0;
  border-radius: 8px;
  background: var(--cx-toolbar);
  border: 1px solid var(--cx-border);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.28);
  z-index: 60;
}
.menu-item {
  display: block;
  width: 100%;
  padding: 7px 18px;
  border: none;
  background: transparent;
  color: var(--cx-text);
  font-size: 12.5px;
  text-align: left;
  cursor: default;
}
.menu-item:hover { background: var(--cx-hover); }
.menu-backdrop { position: fixed; inset: 0; z-index: 50; }

/* ── Bookmarks bar ── */
.bookmarks-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 10px 4px;
  background: var(--cx-toolbar);
  border-bottom: 1px solid var(--cx-border);
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.bookmarks-bar::-webkit-scrollbar { display: none; }
.bookmark {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--cx-text);
  font-size: 11.5px;
  cursor: default;
  white-space: nowrap;
  flex-shrink: 0;
}
.bookmark:hover { background: var(--cx-hover); }
.bm-favicon {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8.5px;
  font-weight: 700;
  color: #fff;
}
.bm-title { max-width: 140px; overflow: hidden; text-overflow: ellipsis; }

/* ── Content ── */
.content { flex: 1; min-height: 0; display: flex; }
.page-column { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.web-frame { flex: 1; border: none; background: #fff; }

.embed-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background: var(--cx-omni);
  border-bottom: 1px solid var(--cx-border);
  flex-shrink: 0;
}
.embed-text { flex: 1; min-width: 0; font-size: 12px; color: var(--cx-dim); }
.embed-open {
  border: none;
  border-radius: 12px;
  background: var(--cx-blue);
  color: #fff;
  font-size: 12px;
  padding: 4px 12px;
  cursor: default;
  flex-shrink: 0;
}
.embed-open:hover { filter: brightness(1.08); }
.embed-dismiss {
  border: none;
  background: transparent;
  color: var(--cx-dim);
  font-size: 14px;
  line-height: 1;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: default;
  flex-shrink: 0;
}
.embed-dismiss:hover { background: var(--cx-hover); }

/* ── Error card ── */
.error-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--cx-content);
}
.error-card {
  max-width: 400px;
  text-align: center;
  padding: 30px 34px;
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  background: var(--cx-omni);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.error-code { font-size: 11.5px; color: var(--cx-dim); letter-spacing: 0.5px; }
.error-title { font-size: 16px; font-weight: 700; }
.error-text { font-size: 12.5px; color: var(--cx-dim); line-height: 1.5; }
.error-retry {
  margin-top: 8px;
  border: none;
  border-radius: 14px;
  background: var(--cx-blue);
  color: #fff;
  font-size: 13px;
  padding: 6px 22px;
  cursor: default;
}
.error-retry:hover { filter: brightness(1.08); }
</style>
