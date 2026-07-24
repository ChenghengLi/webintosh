<script setup>
import { ref, computed, watch } from 'vue'
import { TITLES, byId, UP_NEXT_SEED } from './data'
import PosterCard from './PosterCard.vue'
import PlayerOverlay from './PlayerOverlay.vue'
import StoreGrid from './StoreGrid.vue'
import NIcon from './NIcon.vue'

// ---------- navigation ----------
const NAV = [
  { head: 'Apple TV', items: [
    { v: 'watch-now', label: 'Watch Now', icon: 'play-circle' },
    { v: 'movies', label: 'Movies', icon: 'film' },
    { v: 'shows', label: 'TV Shows', icon: 'tv' },
    { v: 'sports', label: 'Sports', icon: 'medal' },
    { v: 'kids', label: 'Kids', icon: 'smile' },
  ] },
  { head: 'Collections', items: [
    { v: 'library', label: 'Library', icon: 'folder' },
    { v: 'store', label: 'Store', icon: 'bag' },
  ] },
]
const view = ref('watch-now')
const detail = ref(null) // title shown in the detail pane

function select(v) {
  view.value = v
  detail.value = null
}
function openTitle(t) {
  detail.value = t
}

// ---------- library & up-next (persisted) ----------
const LS_KEY = 'macos-web:tv'
const saved = (() => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
})()
const owned = ref(saved.owned || TITLES.filter((t) => t.owned).map((t) => t.id))
const upnext = ref(saved.upnext || UP_NEXT_SEED.map((u) => ({ ...u })))

watch([owned, upnext], () => {
  localStorage.setItem(LS_KEY, JSON.stringify({ owned: owned.value, upnext: upnext.value }))
}, { deep: true })

const isOwned = (id) => owned.value.includes(id)
const upNextEntry = (id) => upnext.value.find((u) => u.id === id)
const inUpNext = (id) => !!upNextEntry(id)

function toggleUpNext(t) {
  if (inUpNext(t.id)) {
    upnext.value = upnext.value.filter((u) => u.id !== t.id)
  } else {
    upnext.value.push({ id: t.id, progress: 0, ep: null })
  }
}
function buy(t) {
  if (!isOwned(t.id)) owned.value = [...owned.value, t.id]
}

// ---------- filtered collections ----------
const movies = computed(() => TITLES.filter((t) => t.type === 'movie'))
const shows = computed(() => TITLES.filter((t) => t.type === 'show'))
const sports = computed(() => TITLES.filter((t) => t.type === 'sports'))
const kids = computed(() => TITLES.filter((t) => t.type === 'kids'))
const library = computed(() => TITLES.filter((t) => isOwned(t.id)))
const featured = computed(() => TITLES.find((t) => t.featured) || TITLES[0])
const upNextRows = computed(() =>
  upnext.value.map((u) => ({ ...u, item: byId(u.id) })).filter((u) => u.item))
const moreLikeThis = computed(() =>
  detail.value
    ? TITLES.filter((t) => t.type === detail.value.type && t.id !== detail.value.id).slice(0, 8)
    : [])

// ---------- fake player ----------
const player = ref(null) // { item, start }

function play(t) {
  player.value = { item: t, start: upNextEntry(t.id)?.progress || 0 }
}
function closePlayer(progress) {
  const id = player.value?.item.id
  if (id) {
    if (progress >= 98) {
      upnext.value = upnext.value.filter((u) => u.id !== id) // finished: drop from Up Next
    } else if (progress > 2 || inUpNext(id)) {
      const rest = upnext.value.filter((u) => u.id !== id)
      upnext.value = [...rest, { ...(upNextEntry(id) || { ep: null }), id, progress: Math.round(progress) }]
    }
  }
  player.value = null
}

const chips = computed(() =>
  detail.value
    ? [detail.value.year, detail.value.length, detail.value.genre, detail.value.rating]
    : [])
</script>

<template>
  <div class="app-root tv">
    <div class="body">
      <aside class="sidebar">
        <template v-for="sec in NAV" :key="sec.head">
          <div class="nav-head">{{ sec.head }}</div>
          <button v-for="it in sec.items" :key="it.v" class="nav-item"
            :class="{ on: view === it.v && !detail }" @click="select(it.v)">
            <span class="nav-icon"><NIcon :name="it.icon" /></span>{{ it.label }}
          </button>
        </template>
      </aside>

      <main class="content">
        <!-- ======= title detail ======= -->
        <div v-if="detail" class="pane detail-pane">
          <button class="back" @click="detail = null">‹ Back</button>
          <div class="hero" :style="{ background: detail.backdrop }">
            <div class="hero-info">
              <div class="hero-title">{{ detail.title }}</div>
              <div class="chips">
                <span v-for="c in chips" :key="c" class="chip">{{ c }}</span>
              </div>
              <div class="hero-actions">
                <button class="play-btn" @click="play(detail)"><span class="pp"><svg viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span> Play</button>
                <button class="un-btn" :class="{ on: inUpNext(detail.id) }" @click="toggleUpNext(detail)">
                  <svg v-if="inUpNext(detail.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{{ inUpNext(detail.id) ? 'In Up Next' : '+ Add to Up Next' }}
                </button>
                <button v-if="!isOwned(detail.id)" class="un-btn" @click="buy(detail)">
                  {{ detail.price ? `Buy $${detail.price.toFixed(2)}` : 'Get' }}
                </button>
              </div>
            </div>
            <div class="hero-emoji">{{ detail.emoji }}</div>
          </div>
          <p class="desc">{{ detail.desc }}</p>
          <h2>More Like This</h2>
          <div class="row">
            <PosterCard v-for="t in moreLikeThis" :key="t.id" :item="t" :owned="isOwned(t.id)"
              class="row-card" @open="openTitle" />
          </div>
        </div>

        <!-- ======= Watch Now ======= -->
        <div v-else-if="view === 'watch-now'" class="pane">
          <h1>Watch Now</h1>

          <template v-if="upNextRows.length">
            <h2>Up Next</h2>
            <div class="row">
              <div v-for="u in upNextRows" :key="u.id" class="upnext-card"
                :style="{ background: u.item.poster }" @click="openTitle(u.item)">
                <span class="un-emoji">{{ u.item.emoji }}</span>
                <span v-if="u.item.live" class="live-badge">LIVE</span>
                <span class="un-label">
                  <span class="un-title">{{ u.item.title }}</span>
                  <span class="un-ep">{{ u.ep || `${u.item.year} · ${u.item.length}` }}</span>
                </span>
                <span class="un-track"><span class="un-fill" :style="{ width: u.progress + '%' }"></span></span>
              </div>
            </div>
          </template>

          <div class="featured" :style="{ background: featured.backdrop }" @click="openTitle(featured)">
            <div class="f-info">
              <div class="f-kicker">Featured · Apple TV+ Original</div>
              <div class="f-title">{{ featured.title }}</div>
              <div class="f-desc">{{ featured.desc }}</div>
              <button class="play-btn" @click.stop="play(featured)"><span class="pp"><svg viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span> Play</button>
            </div>
            <div class="f-emoji">{{ featured.emoji }}</div>
          </div>

          <h2>Movies</h2>
          <div class="row">
            <PosterCard v-for="t in movies" :key="t.id" :item="t" :owned="isOwned(t.id)"
              class="row-card" @open="openTitle" />
          </div>
          <h2>TV Shows</h2>
          <div class="row">
            <PosterCard v-for="t in shows" :key="t.id" :item="t" :owned="isOwned(t.id)"
              class="row-card" @open="openTitle" />
          </div>
          <h2>Kids &amp; Family</h2>
          <div class="row">
            <PosterCard v-for="t in kids" :key="t.id" :item="t" :owned="isOwned(t.id)"
              class="row-card" @open="openTitle" />
          </div>
        </div>

        <!-- ======= tab grids ======= -->
        <div v-else-if="view === 'movies'" class="pane">
          <h1>Movies</h1>
          <div class="grid">
            <PosterCard v-for="t in movies" :key="t.id" :item="t" :owned="isOwned(t.id)" @open="openTitle" />
          </div>
        </div>
        <div v-else-if="view === 'shows'" class="pane">
          <h1>TV Shows</h1>
          <div class="grid">
            <PosterCard v-for="t in shows" :key="t.id" :item="t" :owned="isOwned(t.id)" @open="openTitle" />
          </div>
        </div>
        <div v-else-if="view === 'sports'" class="pane">
          <h1>Sports</h1>
          <div class="grid">
            <PosterCard v-for="t in sports" :key="t.id" :item="t" :owned="isOwned(t.id)"
              :sub="t.live ? 'Live now' : `${t.year} · ${t.length}`" @open="openTitle" />
          </div>
        </div>
        <div v-else-if="view === 'kids'" class="pane">
          <h1>Kids</h1>
          <div class="grid kids-grid">
            <PosterCard v-for="t in kids" :key="t.id" :item="t" :owned="isOwned(t.id)" @open="openTitle" />
          </div>
        </div>

        <!-- ======= Library ======= -->
        <div v-else-if="view === 'library'" class="pane">
          <h1>Library</h1>
          <p v-if="!library.length" class="empty">Nothing here yet — buy something in the Store.</p>
          <div class="grid">
            <PosterCard v-for="t in library" :key="t.id" :item="t" owned @open="openTitle" />
          </div>
        </div>

        <!-- ======= Store ======= -->
        <div v-else-if="view === 'store'" class="pane">
          <h1>Store</h1>
          <StoreGrid :items="TITLES" :owned="owned" @open="openTitle" @buy="buy" />
        </div>
      </main>
    </div>

    <!-- fake video player overlay -->
    <PlayerOverlay v-if="player" :item="player.item" :start="player.start" @close="closePlayer" />
  </div>
</template>

<style scoped>
/* fixed dark theme, like the real Apple TV app */
.tv {
  position: relative;
  background: #161617;
  color: #f5f5f7;
  border-radius: inherit;
}
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* sidebar */
.sidebar {
  width: 214px;
  flex-shrink: 0;
  background: #1e1e20;
  border-right: 0.5px solid rgba(255, 255, 255, 0.1);
  padding: 10px 10px 16px;
  overflow-y: auto;
}
.nav-head {
  font-size: 11px;
  font-weight: 700;
  color: #86868b;
  margin: 14px 8px 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  text-align: left;
  color: #f5f5f7;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
.nav-item.on {
  background: rgba(255, 255, 255, 0.16);
}
.nav-icon {
  width: 18px;
  text-align: center;
  font-size: 12px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
.nav-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}

/* content */
.content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}
.pane {
  padding: 18px 28px 40px;
}
h1 {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 14px;
}
h2 {
  font-size: 17px;
  font-weight: 700;
  margin: 22px 0 10px;
}
.back {
  color: #2997ff;
  font-size: 13px;
  padding: 0;
  margin-bottom: 12px;
}
.empty {
  color: #86868b;
  font-size: 13px;
}
.row {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding: 4px 2px 10px;
}
.row-card {
  width: 148px;
  flex-shrink: 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 18px 14px;
}
.kids-grid :deep(.poster) {
  border-radius: 14px;
}

/* Up Next wide cards */
.upnext-card {
  position: relative;
  width: 300px;
  flex-shrink: 0;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  border: 0.5px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  text-align: left;
  transition: transform 0.15s ease;
}
.upnext-card:hover {
  transform: scale(1.03);
}
.un-emoji {
  position: absolute;
  top: 12px;
  left: 14px;
  font-size: 44px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
}
.live-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ff453a;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.6px;
  padding: 2px 7px;
  border-radius: 4px;
}
.un-label {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 12px 14px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.72));
}
.un-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}
.un-ep {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
}
.un-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
}
.un-fill {
  display: block;
  height: 100%;
  background: #fff;
}

/* featured hero */
.featured {
  margin-top: 22px;
  border-radius: 14px;
  border: 0.5px solid rgba(255, 255, 255, 0.14);
  padding: 30px 34px;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
}
.f-kicker {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(255, 255, 255, 0.8);
}
.f-title {
  font-size: 34px;
  font-weight: 800;
  color: #fff;
  margin: 6px 0;
}
.f-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  max-width: 480px;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.f-emoji {
  font-size: 96px;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.5));
  flex-shrink: 0;
}

/* detail */
.hero {
  border-radius: 14px;
  border: 0.5px solid rgba(255, 255, 255, 0.14);
  padding: 30px 34px;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
}
.hero-title {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 18px;
}
.chip {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
  padding: 3px 10px;
  border-radius: 999px;
}
.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.hero-emoji {
  font-size: 100px;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.5));
  flex-shrink: 0;
}
.desc {
  font-size: 13px;
  line-height: 1.5;
  color: #c7c7cc;
  max-width: 640px;
  margin-top: 16px;
}

/* buttons */
.play-btn {
  background: #fff;
  color: #000;
  font-weight: 700;
  font-size: 13px;
  padding: 8px 22px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
}
.play-btn:hover {
  background: #e8e8ed;
}
.play-btn .pp {
  display: inline-flex;
}
.play-btn .pp svg {
  width: 10px;
  height: 10px;
  display: block;
}
.un-btn {
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  padding: 8px 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.un-btn svg {
  width: 12px;
  height: 12px;
  display: block;
}
.un-btn:hover {
  background: rgba(255, 255, 255, 0.26);
}
.un-btn.on {
  background: rgba(41, 151, 255, 0.35);
  color: #fff;
}
</style>
