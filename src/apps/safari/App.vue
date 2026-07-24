<script setup>
import { ref, computed } from 'vue'
import { useSystemStore } from '../../stores/system'
import { searchWikipedia, fetchArticle, articleUrl } from './wiki'
import StartPage from './StartPage.vue'
import SearchResults from './SearchResults.vue'
import ArticleView from './ArticleView.vue'

const props = defineProps({
  query: { type: String, default: '' },
})

const system = useSystemStore()

function hostFor(url) {
  try {
    const full = /^https?:\/\//i.test(url) ? url : 'https://' + url
    return new URL(full).hostname.replace(/^www\./, '') || url
  } catch {
    return url
  }
}

// Per-tab favicon: first letter of hostname on a subtle deterministic gradient
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

// A tab shows one of: start page, iframe ('web'), Wikipedia search results
// ('search'), or a Wikipedia article ('article'). History entries are
// { kind:'web', url } | { kind:'search', q, results? } | { kind:'article', title, html? }
// — fetched data is cached on the entry so back/forward works offline.
function makeTab() {
  return {
    id: nextId++,
    kind: 'start',
    url: '',
    title: 'Start Page',
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
    tab.title = entry.q
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
  } catch {
    if (isCurrent(tab, entry)) tab.error = `Safari couldn't search Wikipedia for “${entry.q}”.`
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
      tab.title = title
      tab.article = { title, html }
    }
  } catch {
    if (isCurrent(tab, entry)) tab.error = `Safari couldn't load the Wikipedia article “${entry.title}”.`
  } finally {
    if (isCurrent(tab, entry)) tab.loading = false
  }
}

// Address-bar submit: bare domain (or URL) → iframe; en.wikipedia.org/wiki/<X>
// → article; anything else → live Wikipedia search.
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

// Full external URL for the current page (share / open-in-real-browser)
function externalUrl(tab) {
  if (!tab.url) return ''
  return tab.kind === 'web' ? tab.url : 'https://' + (tab.kind === 'article' ? tab.url : 'en.wikipedia.org')
}

// Embedded-site fallback: many sites send X-Frame-Options and render blank
function openExternal() {
  const url = externalUrl(activeTab.value)
  if (url) window.open(url, '_blank')
}

// Share: copy current URL to the shared virtual clipboard
const copied = ref(false)
let copiedTimer = null

function share() {
  const url = externalUrl(activeTab.value)
  if (!url) return
  system.clipboard = url
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 1600)
}

// Address bar: show hostname at rest, full URL while editing
const editing = ref(false)
const draft = ref('')

const addressDisplay = computed(() => {
  if (editing.value) return draft.value
  const tab = activeTab.value
  if (!tab.url) return ''
  return tab.kind === 'web' ? hostFor(tab.url) : tab.url
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

// Launch with a query (e.g. from Spotlight) → run it through Wikipedia search
if (props.query) navigate(tabs.value[0], props.query)
</script>

<template>
  <div class="app-root safari">
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
            v-if="tab.url"
            class="tab-favicon favicon-chip"
            :style="{ background: faviconGradient(tab.url) }"
          >{{ faviconLetter(tab.url) }}</span>
          <span v-else class="tab-favicon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>
          </span>
          <span class="tab-title">{{ tab.loading ? 'Loading…' : tab.title }}</span>
          <button class="tab-close" title="Close Tab" @click.stop="closeTab(tab.id)">×</button>
        </div>
      </div>
      <button class="new-tab" title="New Tab" @click="newTab">＋</button>
    </div>

    <div class="toolbar">
      <div class="nav-buttons">
        <button class="tool-btn" :disabled="!canGoBack" title="Back" @click="goBack">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M8 1.5 3.5 6 8 10.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="tool-btn" :disabled="!canGoForward" title="Forward" @click="goForward">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M4 1.5 8.5 6 4 10.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="tool-btn" :disabled="activeTab.historyIndex < 0" title="Reload" @click="reload">
          <svg width="13" height="13" viewBox="0 0 13 13"><path d="M11 6.5a4.5 4.5 0 1 1-1.3-3.2M11 1v2.6H8.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="share-wrap">
          <button class="tool-btn" :disabled="!activeTab.url" title="Share" @click="share">
            <svg width="13" height="13" viewBox="0 0 13 13"><path d="M6.5 8.2V1.2M4.1 3.4 6.5 1l2.4 2.4M4 5.8H2.4v6h8.2v-6H9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <span v-if="copied" class="copied-tip">Copied</span>
        </span>
      </div>
      <div class="address-wrap">
        <span class="address-icon">
          <svg v-if="activeTab.url" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9.5" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>
          <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M16.2 16.2 21 21"/></svg>
        </span>
        <input
          class="address-bar"
          :value="addressDisplay"
          placeholder="Search or enter website name"
          spellcheck="false"
          @input="draft = $event.target.value"
          @focus="onAddressFocus"
          @blur="editing = false"
          @keydown.enter="onAddressEnter"
          @keydown.escape="onAddressEscape"
        />
      </div>
      <div class="toolbar-spacer"></div>
      <div v-if="activeTab.loading" class="load-bar"></div>
    </div>

    <div class="content">
      <template v-if="activeTab.kind === 'web'">
        <div class="page-column">
          <div v-if="!activeTab.bannerDismissed" class="embed-banner">
            <span class="embed-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 21.5 20h-19L12 4z"/><path d="M12 10v4.5"/><path d="M12 17.3v.2"/></svg>
            </span>
            <span class="embed-text">Some sites block embedding. If the page is blank, open it directly.</span>
            <button class="embed-open" @click="openExternal">Open in New Tab</button>
            <button class="embed-dismiss" title="Dismiss" @click="activeTab.bannerDismissed = true">×</button>
          </div>
          <iframe
            :key="activeTab.id + '-' + activeTab.reloadKey + '-' + activeTab.url"
            :src="activeTab.url"
            class="web-frame"
            title="Safari page"
            @load="onFrameLoad"
          ></iframe>
        </div>
      </template>

      <div v-else-if="activeTab.error" class="error-state">
        <div class="error-card">
          <span class="error-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.4 9a16 16 0 0 1 21.2 0"/><path d="M5 12.6a11 11 0 0 1 14 0"/><path d="M8.5 16.1a6 6 0 0 1 7 0"/><path d="M12 20h.01"/><path d="M2.5 2.5l19 19"/></svg>
          </span>
          <div class="error-title">Couldn't Connect to Wikipedia</div>
          <div class="error-text">{{ activeTab.error }} Check your internet connection and try again.</div>
          <button class="error-retry" @click="retry">Try Again</button>
        </div>
      </div>

      <SearchResults
        v-else-if="activeTab.kind === 'search' && activeTab.search"
        :q="activeTab.search.q"
        :results="activeTab.search.results"
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
        @open-url="navigate(activeTab, $event)"
        @open-search="navigate(activeTab, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.safari { background: var(--window-bg); color: var(--text); font-size: 13px; }

/* Tab strip */
.tab-strip {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 6px 10px 0;
  background: var(--titlebar-bg);
  flex-shrink: 0;
}
.tabs { display: flex; gap: 4px; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 120px;
  max-width: 200px;
  flex: 1 1 140px;
  padding: 6px 8px;
  border-radius: 8px 8px 0 0;
  color: var(--text-dim);
  cursor: default;
  user-select: none;
  border: 0.5px solid transparent;
  border-bottom: none;
  white-space: nowrap;
}
.tab:hover { background: var(--hover); }
.tab.active { background: var(--window-bg); color: var(--text); border-color: var(--border); }
.tab-favicon { font-size: 12px; flex-shrink: 0; display: flex; align-items: center; }
.favicon-chip {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.25);
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.25);
}
.tab-title { flex: 1; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
.tab-close, .new-tab {
  border: none;
  background: transparent;
  color: var(--text-dim);
  cursor: default;
  flex-shrink: 0;
}
.tab-close { font-size: 14px; line-height: 1; width: 18px; height: 18px; border-radius: 4px; }
.new-tab { font-size: 15px; width: 26px; height: 26px; border-radius: 6px; margin-bottom: 3px; }
.tab-close:hover, .new-tab:hover { background: var(--hover); color: var(--text); }

/* Toolbar */
.toolbar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;
}
.nav-buttons { display: flex; align-items: center; gap: 4px; }
.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  cursor: default;
}
.tool-btn:hover:not(:disabled) { background: var(--hover); }
.tool-btn:disabled { color: var(--text-dim); opacity: 0.4; }
.share-wrap { position: relative; display: flex; }
.copied-tip {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 9px;
  border-radius: 6px;
  background: var(--glass-strong, var(--sidebar-bg));
  border: 0.5px solid var(--border);
  color: var(--text);
  font-size: 11px;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  z-index: 20;
  pointer-events: none;
}

/* Indeterminate page-load progress bar (anchored under the address bar row) */
.load-bar {
  position: absolute;
  bottom: -0.5px;
  left: 0;
  height: 2px;
  width: 35%;
  background: var(--accent);
  border-radius: 2px;
  pointer-events: none;
  animation: load-slide 1s ease-in-out infinite;
}
@keyframes load-slide {
  0% { left: -35%; }
  100% { left: 100%; }
}

.address-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 560px;
  margin: 0 auto;
  padding: 0 10px;
  height: 28px;
  border-radius: 8px;
  background: var(--hover);
  border: 0.5px solid var(--border);
}
.address-icon { display: flex; align-items: center; flex-shrink: 0; color: var(--text-dim); }
.address-bar {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  text-align: center;
}
.address-bar:focus { text-align: left; }
.address-bar::placeholder { color: var(--text-dim); }
.toolbar-spacer { width: 124px; flex-shrink: 0; }

/* Content */
.content { flex: 1; min-height: 0; display: flex; }
.page-column { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.web-frame { flex: 1; border: none; background: #fff; }

/* Embedded-site fallback banner */
.embed-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--sidebar-bg);
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;
}
.embed-icon { display: flex; align-items: center; flex-shrink: 0; color: #e6a23c; }
.embed-text { flex: 1; min-width: 0; font-size: 12px; color: var(--text-dim); }
.embed-open {
  border: 0.5px solid var(--border);
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  padding: 3px 10px;
  cursor: default;
  flex-shrink: 0;
}
.embed-open:hover { filter: brightness(1.1); }
.embed-dismiss {
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-size: 14px;
  line-height: 1;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: default;
  flex-shrink: 0;
}
.embed-dismiss:hover { background: var(--hover); color: var(--text); }

/* Offline / API error state */
.error-state { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
.error-card {
  max-width: 380px;
  text-align: center;
  padding: 28px 32px;
  border: 0.5px solid var(--border);
  border-radius: 14px;
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.error-icon { display: flex; color: var(--text-dim); }
.error-title { font-size: 15px; font-weight: 700; }
.error-text { font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
.error-retry {
  margin-top: 8px;
  border: 0.5px solid var(--border);
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  padding: 5px 18px;
  cursor: default;
}
.error-retry:hover { filter: brightness(1.1); }
</style>
