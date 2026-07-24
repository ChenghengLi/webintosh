<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import { useWindowsStore } from '../../stores/windows'
import { BOOKS, getPages } from './data'
import BookCover from './BookCover.vue'

const ws = useWindowsStore()

const TABS = [
  { id: 'store', name: 'Book Store' },
  { id: 'library', name: 'Library' },
  { id: 'audiobooks', name: 'Audiobooks' },
]
const tab = ref('library')

// ---- reading progress, persisted per book ----
const LS_KEY = 'macos-web:books-progress'
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
const progressMap = reactive(loadProgress())
function saveProgress() {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...progressMap }))
}

// ---- reader state ----
const openId = ref(null)
const pageIdx = ref(0)
const openBook = computed(() => BOOKS.find((b) => b.id === openId.value) || null)
const pages = computed(() => (openBook.value ? getPages(openBook.value) : []))
const page = computed(() => pages.value[pageIdx.value] || { chapter: '', paragraphs: [] })
const pct = computed(() =>
  pages.value.length ? Math.round(((pageIdx.value + 1) / pages.value.length) * 100) : 0,
)

function openBookAt(book) {
  openId.value = book.id
  const saved = progressMap[book.id] || 0
  pageIdx.value = Math.min(saved, getPages(book).length - 1)
}
function backToLibrary() {
  openId.value = null
}
function setPage(i) {
  const clamped = Math.max(0, Math.min(i, pages.value.length - 1))
  if (clamped === pageIdx.value) return
  pageIdx.value = clamped
  progressMap[openId.value] = clamped
  saveProgress()
}
const nextPage = () => setPage(pageIdx.value + 1)
const prevPage = () => setPage(pageIdx.value - 1)

function onKey(e) {
  if (!openId.value) return
  if (ws.activeWindow?.appId !== 'books') return
  if (e.key === 'ArrowRight') { e.preventDefault(); nextPage() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prevPage() }
  else if (e.key === 'Escape') backToLibrary()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// ---- library ----
const readingNow = computed(() => {
  const started = BOOKS.filter((b) => (progressMap[b.id] || 0) > 0)
  return started.length ? started : BOOKS.slice(0, 3)
})
function progressOf(book) {
  const p = getPages(book).length
  return Math.round(((progressMap[book.id] || 0) / p) * 100)
}
</script>

<template>
  <div class="app-root books">
    <!-- reader -->
    <template v-if="openBook">
      <div class="rtop">
        <button class="back" @click="backToLibrary">‹ Library</button>
        <div class="rchapter">{{ page.chapter }}</div>
        <div class="rpct">{{ pct }}%</div>
      </div>
      <div class="rbody">
        <button class="chev left" :disabled="pageIdx === 0" @click="prevPage" aria-label="Previous page">‹</button>
        <div class="paper-wrap">
          <Transition name="page" mode="out-in">
            <div class="paper" :key="pageIdx">
              <h2 class="pchapter">{{ page.chapter }}</h2>
              <p v-for="(para, i) in page.paragraphs" :key="i">{{ para }}</p>
              <div class="pfoot">{{ pageIdx + 1 }} of {{ pages.length }}</div>
            </div>
          </Transition>
        </div>
        <button class="chev right" :disabled="pageIdx === pages.length - 1" @click="nextPage" aria-label="Next page">›</button>
      </div>
    </template>

    <!-- browsing -->
    <template v-else>
      <div class="toolbar">
        <div class="tabs">
          <button
            v-for="t in TABS"
            :key="t.id"
            class="tabbtn"
            :class="{ active: tab === t.id }"
            @click="tab = t.id"
          >{{ t.name }}</button>
        </div>
      </div>

      <div class="content">
        <!-- Library -->
        <template v-if="tab === 'library'">
          <div class="section-title">Reading Now</div>
          <div class="reading-now">
            <div v-for="b in readingNow" :key="b.id" class="rn-card" @click="openBookAt(b)">
              <div class="rn-cover"><BookCover :book="b" /></div>
              <div class="rn-info">
                <div class="rn-title">{{ b.title }}</div>
                <div class="rn-author">{{ b.author }}</div>
                <div class="rn-bar"><div class="rn-fill" :style="{ width: progressOf(b) + '%' }"></div></div>
                <div class="rn-pct">{{ progressOf(b) }}% read</div>
              </div>
            </div>
          </div>

          <div class="section-title">Books</div>
          <div class="grid">
            <div v-for="b in BOOKS" :key="b.id" class="cell" @click="openBookAt(b)">
              <BookCover :book="b" />
              <div class="cell-title">{{ b.title }}</div>
              <div class="cell-author">{{ b.author }}</div>
            </div>
          </div>
        </template>

        <!-- Book Store (decorative) -->
        <template v-else-if="tab === 'store'">
          <div class="store-hero">
            <div>
              <div class="hero-kicker">Featured</div>
              <div class="hero-title">New &amp; Noteworthy this week</div>
              <div class="hero-sub">Handpicked reads from our editors.</div>
            </div>
            <div class="hero-emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
          </div>

          <div class="section-title">Top Charts</div>
          <div class="grid store">
            <div v-for="b in BOOKS.slice(0, 6)" :key="b.id" class="cell decorative">
              <BookCover :book="b" />
              <div class="cell-title">{{ b.title }}</div>
              <div class="cell-author">{{ b.author }}</div>
              <div class="cell-price">$12.99</div>
            </div>
          </div>

          <div class="section-title">More to Explore</div>
          <div class="grid store">
            <div v-for="b in BOOKS.slice(6)" :key="b.id" class="cell decorative">
              <BookCover :book="b" />
              <div class="cell-title">{{ b.title }}</div>
              <div class="cell-author">{{ b.author }}</div>
              <div class="cell-blurb">{{ b.blurb }}</div>
            </div>
          </div>
        </template>

        <!-- Audiobooks (decorative) -->
        <template v-else>
          <div class="section-title">Audiobooks</div>
          <div class="grid store">
            <div v-for="b in BOOKS" :key="b.id" class="cell decorative">
              <div class="audio-wrap">
                <BookCover :book="b" />
                <div class="audio-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg> {{ b.audio }}</div>
              </div>
              <div class="cell-title">{{ b.title }}</div>
              <div class="cell-author">Narrated edition · {{ b.author }}</div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.books {
  background: var(--window-bg);
  color: var(--text);
  font-size: 13px;
}

/* ---------- toolbar / tabs ---------- */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-bottom: 0.5px solid var(--border);
  background: var(--titlebar-bg);
  flex-shrink: 0;
}
.tabs {
  display: flex;
  gap: 2px;
  background: var(--hover);
  border-radius: 8px;
  padding: 2px;
}
.tabbtn {
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 12.5px;
  font-weight: 500;
  padding: 4px 22px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
}
.tabbtn.active {
  background: var(--window-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

/* ---------- library / store ---------- */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 18px 28px 32px;
}
.section-title {
  font-size: 20px;
  font-weight: 700;
  margin: 20px 0 14px;
}
.section-title:first-child {
  margin-top: 2px;
}
.reading-now {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.rn-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  border: 0.5px solid var(--border);
  background: var(--sidebar-bg);
  cursor: pointer;
  transition: background 0.12s;
}
.rn-card:hover {
  background: var(--hover);
}
.rn-cover {
  width: 64px;
  flex-shrink: 0;
}
.rn-info {
  min-width: 0;
  flex: 1;
}
.rn-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rn-author {
  color: var(--text-dim);
  font-size: 12px;
  margin: 2px 0 10px;
}
.rn-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--hover);
  overflow: hidden;
}
.rn-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--accent);
}
.rn-pct {
  color: var(--text-dim);
  font-size: 11px;
  margin-top: 5px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 22px 18px;
}
.cell {
  cursor: pointer;
  min-width: 0;
}
.cell .cover {
  transition: transform 0.15s, box-shadow 0.15s;
}
.cell:not(.decorative):hover .cover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.34);
}
.cell.decorative {
  cursor: default;
}
.cell-title {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cell-author {
  color: var(--text-dim);
  font-size: 11px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-price {
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  margin-top: 3px;
}
.cell-blurb {
  color: var(--text-dim);
  font-size: 11px;
  line-height: 1.35;
  margin-top: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.store-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-radius: 14px;
  padding: 22px 26px;
  margin-bottom: 6px;
  color: #fff;
  background: linear-gradient(120deg, #b4551e, #e08a2e);
  box-shadow: 0 6px 18px rgba(180, 85, 30, 0.35);
}
.hero-kicker {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.8;
}
.hero-title {
  font-size: 20px;
  font-weight: 700;
  margin: 4px 0;
}
.hero-sub {
  font-size: 12.5px;
  opacity: 0.9;
}
.hero-emoji {
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
}
.hero-emoji svg {
  width: 46px;
  height: 46px;
  display: block;
}
.audio-wrap {
  position: relative;
}
.audio-badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 8px;
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  gap: 4px;
}
.audio-badge svg {
  width: 10px;
  height: 10px;
  display: block;
}

/* ---------- reader ---------- */
.rtop {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 8px 14px;
  border-bottom: 0.5px solid var(--border);
  background: var(--titlebar-bg);
  flex-shrink: 0;
}
.back {
  justify-self: start;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.back:hover {
  background: var(--hover);
}
.rchapter {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rpct {
  justify-self: end;
  font-size: 12px;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}
.rbody {
  flex: 1;
  display: flex;
  align-items: stretch;
  min-height: 0;
  background: var(--window-bg);
}
.chev {
  width: 56px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-size: 30px;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.12s, background 0.12s;
}
.chev:hover:not(:disabled) {
  color: var(--accent);
  background: var(--hover);
}
.chev:disabled {
  opacity: 0.25;
  cursor: default;
}
.paper-wrap {
  flex: 1;
  min-width: 0;
  padding: 18px 0 18px;
  display: flex;
}
.paper {
  flex: 1;
  max-width: 640px;
  margin: 0 auto;
  background: #f8f3e8;
  color: #453c2e;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.22), inset 0 0 0 0.5px rgba(120, 100, 60, 0.25);
  padding: 44px 56px 40px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  font-family: 'New York', ui-serif, Georgia, 'Times New Roman', serif;
}
.pchapter {
  font-size: 19px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 26px;
  color: #3a3327;
}
.pchapter::after {
  content: '';
  display: block;
  width: 40px;
  height: 1px;
  background: rgba(90, 76, 52, 0.4);
  margin: 12px auto 0;
}
.paper p {
  font-size: 14.5px;
  line-height: 1.72;
  margin: 0 0 14px;
  text-align: justify;
  text-indent: 1.6em;
}
.paper p:first-of-type {
  text-indent: 0;
}
.pfoot {
  margin-top: auto;
  padding-top: 18px;
  text-align: center;
  font-size: 11.5px;
  color: #8b7d63;
  font-variant-numeric: tabular-nums;
}
.page-enter-active,
.page-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateX(14px);
}
.page-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}
</style>
