<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWindowsStore } from '../../stores/windows'
import { DICTIONARY, searchWords, wordOfTheDay } from './data'

const props = defineProps({
  word: { type: String, default: '' },
})

const windows = useWindowsStore()
const HISTORY_KEY = 'macos-web:dictionary-history'

const query = ref('')
const current = ref('')
const suggestionsOpen = ref(false)
const highlight = ref(-1)
const inputEl = ref(null)
const speakPulse = ref(false)
const history = ref(loadHistory())

const entry = computed(() => DICTIONARY[current.value] || null)
const wordOfDay = computed(() => wordOfTheDay())
const suggestions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q || q === current.value) return []
  return searchWords(q).slice(0, 8)
})

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
  } catch {
    return []
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

function openWord(w) {
  const word = String(w || '').trim().toLowerCase()
  if (!word) return
  current.value = word
  query.value = word
  suggestionsOpen.value = false
  highlight.value = -1
  history.value = [word, ...history.value.filter((h) => h !== word)].slice(0, 20)
  saveHistory()
}

function clearSearch() {
  query.value = ''
  suggestionsOpen.value = false
  highlight.value = -1
  inputEl.value?.focus()
}

function onInput() {
  suggestionsOpen.value = true
  highlight.value = -1
}

function onKeydown(e) {
  const list = suggestions.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    suggestionsOpen.value = true
    highlight.value = list.length ? (highlight.value + 1) % list.length : -1
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlight.value = list.length ? (highlight.value - 1 + list.length) % list.length : -1
  } else if (e.key === 'Enter') {
    if (highlight.value >= 0 && list[highlight.value]) openWord(list[highlight.value])
    else if (query.value.trim()) openWord(query.value)
  } else if (e.key === 'Escape') {
    suggestionsOpen.value = false
    highlight.value = -1
  }
}

function pickSuggestion(w) {
  openWord(w)
  inputEl.value?.focus()
}

// Decorative pronunciation button — pulses the speaker icon.
function speak() {
  speakPulse.value = false
  requestAnimationFrame(() => {
    speakPulse.value = true
    setTimeout(() => (speakPulse.value = false), 500)
  })
}

function lookInSafari() {
  windows.openApp('safari', { props: { query: current.value } })
}

function clearHistory() {
  history.value = []
  localStorage.removeItem(HISTORY_KEY)
}

onMounted(() => {
  inputEl.value?.focus()
  if (props.word) openWord(props.word)
})
</script>

<template>
  <div class="app-root dict">
    <!-- Search toolbar -->
    <header class="toolbar">
      <div class="search-wrap">
        <svg class="magnifier" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.6" stroke="currentColor" stroke-width="1.6" /><path d="M10.5 10.5 14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        <input
          ref="inputEl"
          v-model="query"
          class="search-input"
          type="text"
          placeholder="Type a word or phrase"
          spellcheck="false"
          autocomplete="off"
          @input="onInput"
          @keydown="onKeydown"
          @focus="suggestionsOpen = true"
        />
        <button v-if="query" class="clear-btn" title="Clear" @mousedown.prevent="clearSearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>

        <div v-if="suggestionsOpen && suggestions.length" class="suggest">
          <div
            v-for="(w, i) in suggestions"
            :key="w"
            class="sug-row"
            :class="{ hi: i === highlight }"
            @mousedown.prevent="pickSuggestion(w)"
            @mouseenter="highlight = i"
          >
            <span class="sug-word">{{ w }}</span>
            <span class="sug-def">{{ DICTIONARY[w].entries[0].senses[0].def }}</span>
          </div>
        </div>
      </div>
    </header>

    <div class="body">
      <!-- History sidebar -->
      <aside class="side">
        <div class="side-head">
          <span class="side-title">Recents</span>
          <button v-if="history.length" class="clear-history" @click="clearHistory">Clear</button>
        </div>
        <div class="side-list">
          <div
            v-for="w in history"
            :key="w"
            class="hist-row"
            :class="{ sel: w === current }"
            @click="openWord(w)"
          >
            {{ w }}
          </div>
          <div v-if="!history.length" class="hist-empty">Words you look up will appear here.</div>
        </div>
      </aside>

      <!-- Main content -->
      <main class="content" @click="suggestionsOpen = false">
        <!-- Entry -->
        <article v-if="entry" class="entry">
          <div class="entry-head">
            <h1 class="word">{{ entry.word }}</h1>
            <span class="phonetic">{{ entry.phonetic }}</span>
            <button class="speak" :class="{ pulse: speakPulse }" title="Pronounce" @click.stop="speak">
              <svg viewBox="0 0 16 16" fill="none"><path d="M2 6v4h2.5L8 13V3L4.5 6H2z" fill="currentColor" /><path d="M10 5.5a3.6 3.6 0 0 1 0 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /><path d="M12 3.5a6.4 6.4 0 0 1 0 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
            </button>
          </div>

          <section v-for="grp in entry.entries" :key="grp.pos" class="pos-group">
            <h2 class="pos">{{ grp.pos }}</h2>
            <ol class="senses">
              <li v-for="(s, i) in grp.senses" :key="i" class="sense">
                <span class="def">{{ s.def }}</span>
                <p v-if="s.example" class="example">{{ s.example }}</p>
              </li>
            </ol>
          </section>

          <footer v-if="entry.seeAlso && entry.seeAlso.length" class="seealso">
            <span class="sa-label">See also</span>
            <button v-for="w in entry.seeAlso" :key="w" class="sa-link" @click="openWord(w)">{{ w }}</button>
          </footer>
        </article>

        <!-- No definition -->
        <div v-else-if="current" class="notfound">
          <div class="nf-card">
            <div class="nf-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
            <div class="nf-title">No definition found</div>
            <div class="nf-sub">The Dictionary has no entry for “{{ current }}”.</div>
            <button class="nf-safari" @click="lookInSafari">Look up “{{ current }}” in Safari</button>
          </div>
        </div>

        <!-- Empty state: word of the day -->
        <div v-else class="empty">
          <div class="wotd" @click="openWord(wordOfDay.word)">
            <div class="wotd-label"><svg class="wotd-spark" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l1.9 5.7a2 2 0 0 0 1.3 1.3L21 11l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 20l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 11l5.8-2a2 2 0 0 0 1.3-1.3L12 2z"/></svg> Word of the Day</div>
            <div class="wotd-word">{{ wordOfDay.word }}</div>
            <div class="wotd-phon">{{ wordOfDay.phonetic }}</div>
            <div class="wotd-def">{{ wordOfDay.entries[0].senses[0].def }}</div>
          </div>
          <p class="hint">Type a word in the search field above, or pick a recent lookup.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.dict {
  background: var(--window-bg);
  color: var(--text);
}

/* ── Toolbar ─────────────────────────────── */
.toolbar {
  display: flex;
  justify-content: center;
  padding: 12px 18px;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;
}
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: min(460px, 100%);
}
.magnifier {
  position: absolute;
  left: 10px;
  width: 14px;
  height: 14px;
  color: var(--text-dim);
  pointer-events: none;
}
.search-input {
  width: 100%;
  height: 34px;
  padding: 0 30px 0 32px;
  font-size: 15px;
  color: var(--text);
  background: var(--window-bg);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  outline: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent);
}
.clear-btn {
  position: absolute;
  right: 8px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: var(--text-dim);
  color: var(--window-bg);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.clear-btn svg {
  width: 9px;
  height: 9px;
  display: block;
}

/* Suggestions dropdown */
.suggest {
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--window-bg);
  border: 0.5px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}
.sug-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 7px 12px;
  cursor: default;
}
.sug-row.hi  { background: var(--selection); }
.sug-word {
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.sug-def {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Body / sidebar ──────────────────────── */
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.side {
  width: 190px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
}
.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 6px;
}
.side-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
}
.clear-history {
  border: none;
  background: none;
  font-size: 11px;
  color: var(--accent);
  cursor: pointer;
  padding: 0;
}
.side-list {
  flex: 1;
  overflow-y: auto;
  padding: 2px 8px 10px;
}
.hist-row {
  padding: 4px 8px;
  font-size: 13px;
  border-radius: 6px;
  cursor: default;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hist-row:hover  { background: var(--hover); }
.hist-row.sel  { background: var(--selection); }
.hist-empty {
  padding: 8px;
  font-size: 12px;
  color: var(--text-dim);
}

/* ── Content ─────────────────────────────── */
.content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  padding: 26px 34px 34px;
}
.entry-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 0.5px solid var(--border);
}
.word {
  margin: 0;
  font-family: 'New York', ui-serif, Georgia, serif;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.phonetic {
  font-size: 16px;
  color: var(--text-dim);
}
.speak {
  width: 26px;
  height: 26px;
  align-self: center;
  border: none;
  border-radius: 50%;
  background: var(--hover);
  color: var(--text-dim);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform 0.18s ease, color 0.18s ease;
}
.speak svg {
  width: 15px;
  height: 15px;
}
.speak:hover  { color: var(--accent); }
.speak.pulse {
  color: var(--accent);
  transform: scale(1.25);
}
.pos-group  { margin-top: 18px; }
.pos {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  font-style: italic;
  color: var(--text-dim);
}
.senses {
  margin: 0;
  padding-left: 22px;
}
.sense {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.45;
}
.sense .def {
  font-family: 'New York', ui-serif, Georgia, serif;
  font-size: 15px;
}
.example {
  margin: 2px 0 0;
  font-size: 13px;
  font-style: italic;
  color: var(--text-dim);
}
.seealso {
  margin-top: 22px;
  padding-top: 12px;
  border-top: 0.5px solid var(--border);
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 12px;
}
.sa-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-dim);
}
.sa-link {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  color: var(--accent);
  cursor: pointer;
}
.sa-link:hover  { text-decoration: underline; }

/* ── Not found ───────────────────────────── */
.notfound,
.empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.nf-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 340px;
  padding: 28px 34px;
  background: var(--sidebar-bg);
  border: 0.5px solid var(--border);
  border-radius: 14px;
  text-align: center;
}
.nf-icon  { opacity: 0.55; }
.nf-icon svg { width: 38px; height: 38px; display: block; margin: 0 auto; }
.nf-title {
  font-size: 15px;
  font-weight: 700;
}
.nf-sub {
  font-size: 13px;
  color: var(--text-dim);
}
.nf-safari {
  margin-top: 6px;
  padding: 6px 14px;
  font-size: 13px;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.nf-safari:hover  { filter: brightness(1.08); }

/* ── Word of the day (Siri-style gradient) ── */
.wotd {
  width: min(380px, 90%);
  padding: 22px 26px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(160deg, #5e5ce6 0%, #7d4df2 55%, #bf5af2 100%);
  box-shadow: 0 14px 34px rgba(94, 92, 230, 0.35);
  cursor: default;
}
.wotd-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  opacity: 0.85;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.wotd-spark {
  width: 12px;
  height: 12px;
  display: block;
}
.wotd-word {
  margin-top: 8px;
  font-family: 'New York', ui-serif, Georgia, serif;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.4px;
}
.wotd-phon {
  font-size: 14px;
  opacity: 0.85;
}
.wotd-def {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.45;
  opacity: 0.95;
}
.hint {
  font-size: 12px;
  color: var(--text-dim);
}
</style>
