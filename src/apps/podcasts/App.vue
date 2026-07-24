<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { SHOWS, getShow, CATEGORIES, fmtDur } from './data'
import ShowGrid from './ShowGrid.vue'
import ShowDetail from './ShowDetail.vue'
import PlayerBar from './PlayerBar.vue'
import NIcon from './NIcon.vue'
import PlayPause from './PlayPause.vue'

const ACCENT = '#8e44ad'

// ---------- navigation ----------
const view = ref('listen-now') // 'listen-now' | 'browse' | 'charts' | 'shows' | 'episodes'
const detailShow = ref(null) // show object shown in the detail pane, or null
const backLabel = ref('Back')
const cat = ref('All') // browse category filter

const NAV = [
  { head: 'Apple Podcasts', items: [
    { v: 'listen-now', label: 'Listen Now', icon: 'play-circle' },
    { v: 'browse', label: 'Browse', icon: 'compass' },
    { v: 'charts', label: 'Top Charts', icon: 'chart' },
  ] },
  { head: 'Library', items: [
    { v: 'shows', label: 'Shows', icon: 'mic' },
    { v: 'episodes', label: 'Episodes', icon: 'headphones' },
  ] },
]
const LABELS = {
  'listen-now': 'Listen Now', browse: 'Browse', charts: 'Top Charts',
  shows: 'Shows', episodes: 'Episodes',
}

function select(v) {
  view.value = v
  detailShow.value = null
}
function openShow(s) {
  backLabel.value = LABELS[view.value] || 'Back'
  detailShow.value = s
}

// ---------- follow state (persisted) ----------
const LS = 'macos-web:podcasts-followed'
const followed = ref(new Set(JSON.parse(localStorage.getItem(LS) || '["syntax","science","truenorth"]')))
const isFollowed = (s) => followed.value.has(s.id)
function toggleFollow(s) {
  const next = new Set(followed.value)
  if (next.has(s.id)) next.delete(s.id)
  else next.add(s.id)
  followed.value = next
  localStorage.setItem(LS, JSON.stringify([...next]))
}
const followedShows = computed(() => SHOWS.filter(isFollowed))

// ---------- episode collections ----------
const episodesOf = (shows) =>
  shows.flatMap((s) => s.episodes.map((ep, idx) => ({ show: s, ep, idx })))
    .sort((a, b) => a.ep.daysAgo - b.ep.daysAgo)

const upNext = computed(() =>
  episodesOf(followedShows.value.length ? followedShows.value : SHOWS).slice(0, 8))
const libraryEpisodes = computed(() => episodesOf(followedShows.value))
const browseShows = computed(() =>
  cat.value === 'All' ? SHOWS : SHOWS.filter((s) => s.category === cat.value))

// ---------- playback simulation ----------
const current = ref(null) // { showId, idx } or null
const playing = ref(false)
const elapsed = ref(0)
const speed = ref(1)
const SPEEDS = [1, 1.5, 2]

const nowPlaying = computed(() => {
  if (!current.value) return null
  const show = getShow(current.value.showId)
  return { show, ep: show.episodes[current.value.idx], idx: current.value.idx }
})
const duration = computed(() => nowPlaying.value?.ep.dur || 0)
const progress = computed(() =>
  duration.value ? Math.min(100, (elapsed.value / duration.value) * 100) : 0)
const isCur = (showId, idx) =>
  current.value && current.value.showId === showId && current.value.idx === idx

function play(show, idx) {
  current.value = { showId: show.id, idx }
  elapsed.value = 0
  playing.value = true
}
function toggle() {
  if (current.value) playing.value = !playing.value
}
function skip(d) {
  if (!current.value) return
  elapsed.value = Math.min(duration.value, Math.max(0, elapsed.value + d))
}
function cycleSpeed() {
  speed.value = SPEEDS[(SPEEDS.indexOf(speed.value) + 1) % SPEEDS.length]
}
function seek(e) {
  if (!duration.value) return
  const r = e.currentTarget.getBoundingClientRect()
  elapsed.value = Math.round(((e.clientX - r.left) / r.width) * duration.value)
}
// episode finished: continue with the next Up Next item, else stop
function playNext() {
  const c = current.value
  const i = c ? upNext.value.findIndex((x) => x.show.id === c.showId && x.idx === c.idx) : -1
  if (i >= 0 && i < upNext.value.length - 1) {
    play(upNext.value[i + 1].show, upNext.value[i + 1].idx)
  } else {
    playing.value = false
    elapsed.value = 0
  }
}
const timer = setInterval(() => {
  if (!playing.value || !current.value) return
  elapsed.value += 0.5 * speed.value
  if (elapsed.value >= duration.value) playNext()
}, 500)
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="app-root podcasts">
    <div class="body">
      <aside class="sidebar">
        <template v-for="sec in NAV" :key="sec.head">
          <div class="nav-head">{{ sec.head }}</div>
          <button v-for="it in sec.items" :key="it.v" class="nav-item"
            :class="{ on: view === it.v && !detailShow }" @click="select(it.v)">
            <span class="nav-icon"><NIcon :name="it.icon" /></span>{{ it.label }}
          </button>
        </template>
        <template v-if="followedShows.length">
          <div class="nav-head">Shows</div>
          <button v-for="s in followedShows" :key="s.id" class="nav-item"
            :class="{ on: detailShow && detailShow.id === s.id }" @click="openShow(s)">
            <span class="show-tile" :style="{ background: s.bg }">{{ s.emoji }}</span>{{ s.title }}
          </button>
        </template>
      </aside>

      <main class="content">
        <!-- show detail -->
        <ShowDetail v-if="detailShow" :show="detailShow" :followed="isFollowed(detailShow)"
          :current="current" :playing="playing" :back-label="backLabel"
          @back="detailShow = null" @toggle-follow="toggleFollow(detailShow)"
          @play="play(detailShow, $event)" />

        <!-- listen now -->
        <div v-else-if="view === 'listen-now'" class="pane">
          <h1>Listen Now</h1>
          <h2>Up Next</h2>
          <div class="queue">
            <div v-for="it in upNext" :key="it.show.id + '-' + it.idx" class="q-row"
              :class="{ cur: isCur(it.show.id, it.idx) }" @click="openShow(it.show)">
              <div class="cover sm" :style="{ background: it.show.bg }"><span>{{ it.show.emoji }}</span></div>
              <div class="q-text">
                <div class="q-title">{{ it.ep.title }}</div>
                <div class="q-show">{{ it.show.title }}</div>
              </div>
              <span class="q-meta">{{ it.ep.date }} · {{ fmtDur(it.ep.dur) }}</span>
              <button class="q-play" @click.stop="play(it.show, it.idx)">
                <PlayPause :playing="isCur(it.show.id, it.idx) && playing" />
              </button>
            </div>
          </div>
          <h2>Shows You Might Like</h2>
          <ShowGrid :shows="SHOWS.slice(3, 9)" @open="openShow" />
        </div>

        <!-- browse -->
        <div v-else-if="view === 'browse'" class="pane">
          <h1>Browse</h1>
          <div class="banner" :style="{ background: SHOWS[0].bg }" @click="openShow(SHOWS[0])">
            <div>
              <div class="b-kicker">Featured Show</div>
              <div class="b-title">{{ SHOWS[0].title }}</div>
              <div class="b-author">{{ SHOWS[0].author }}</div>
            </div>
            <div class="b-emoji">{{ SHOWS[0].emoji }}</div>
          </div>
          <div class="chips">
            <button v-for="c in ['All', ...CATEGORIES]" :key="c" class="chip"
              :class="{ on: cat === c }" @click="cat = c">{{ c }}</button>
          </div>
          <ShowGrid :shows="browseShows" @open="openShow" />
        </div>

        <!-- top charts -->
        <div v-else-if="view === 'charts'" class="pane">
          <h1>Top Charts</h1>
          <div class="chart-rows">
            <div v-for="(s, i) in SHOWS" :key="s.id" class="ch-row" @click="openShow(s)">
              <span class="ch-rank">{{ i + 1 }}</span>
              <div class="cover sm" :style="{ background: s.bg }"><span>{{ s.emoji }}</span></div>
              <div class="ch-text">
                <div class="ch-title">{{ s.title }}</div>
                <div class="ch-author">{{ s.author }}</div>
              </div>
              <span class="ch-cat">{{ s.category }}</span>
              <button class="ch-follow" :class="{ on: isFollowed(s) }"
                :title="isFollowed(s) ? 'Unfollow' : 'Follow'"
                @click.stop="toggleFollow(s)"><svg v-if="isFollowed(s)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><template v-else>+</template></button>
            </div>
          </div>
        </div>

        <!-- library: shows -->
        <div v-else-if="view === 'shows'" class="pane">
          <h1>Shows</h1>
          <ShowGrid v-if="followedShows.length" :shows="followedShows" @open="openShow" />
          <div v-else class="empty">
            <span class="empty-emoji"><NIcon name="mic" /></span>
            <p>No Shows Yet</p>
            <p class="empty-sub">Follow shows from Browse or Top Charts to add them here.</p>
          </div>
        </div>

        <!-- library: episodes -->
        <div v-else-if="view === 'episodes'" class="pane">
          <h1>Episodes</h1>
          <div v-if="libraryEpisodes.length" class="queue">
            <div v-for="it in libraryEpisodes" :key="it.show.id + '-' + it.idx" class="q-row"
              :class="{ cur: isCur(it.show.id, it.idx) }" @click="openShow(it.show)">
              <div class="cover sm" :style="{ background: it.show.bg }"><span>{{ it.show.emoji }}</span></div>
              <div class="q-text">
                <div class="q-title">{{ it.ep.title }}</div>
                <div class="q-show">{{ it.show.title }}</div>
              </div>
              <span class="q-meta">{{ it.ep.date }} · {{ fmtDur(it.ep.dur) }}</span>
              <button class="q-play" @click.stop="play(it.show, it.idx)">
                <PlayPause :playing="isCur(it.show.id, it.idx) && playing" />
              </button>
            </div>
          </div>
          <div v-else class="empty">
            <span class="empty-emoji"><NIcon name="headphones" /></span>
            <p>No Episodes</p>
            <p class="empty-sub">Episodes from shows you follow will appear here.</p>
          </div>
        </div>
      </main>
    </div>

    <!-- mini player -->
    <PlayerBar :current="nowPlaying" :playing="playing" :elapsed="elapsed" :duration="duration"
      :progress="progress" :speed="speed" @toggle="toggle" @skip-back="skip(-15)"
      @skip-fwd="skip(15)" @seek="seek" @cycle-speed="cycleSpeed" />
  </div>
</template>

<style scoped>
.podcasts {
  background: var(--window-bg);
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
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
  padding: 10px 10px 16px;
  overflow-y: auto;
}
.nav-head {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-item:hover {
  background: var(--hover);
}
.nav-item.on {
  background: var(--selection);
}
.nav-icon {
  width: 18px;
  text-align: center;
  font-size: 12px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}
.nav-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}
.show-tile {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
}

/* content */
.content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}
.pane {
  padding: 18px 28px 100px; /* extra bottom inset: last episode clears the player bar */
}
h1 {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 14px;
}
h2 {
  font-size: 17px;
  font-weight: 700;
  margin: 20px 0 10px;
}
.cover.sm {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 0.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover.sm span {
  font-size: 22px;
}

/* up next / episode queue rows */
.queue {
  border-top: 0.5px solid var(--border);
}
.q-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-bottom: 0.5px solid var(--border);
  border-radius: 8px;
}
.q-row:hover {
  background: var(--hover);
}
.q-row.cur .q-title {
  color: v-bind(ACCENT);
}
.q-text {
  flex: 1;
  min-width: 0;
}
.q-title,
.q-show {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.q-title {
  font-size: 13px;
  font-weight: 600;
}
.q-show {
  font-size: 11px;
  color: var(--text-dim);
}
.q-meta {
  font-size: 11px;
  color: var(--text-dim);
  flex-shrink: 0;
}
.q-play {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1.5px solid v-bind(ACCENT);
  color: v-bind(ACCENT);
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 1px;
}
.q-play svg {
  width: 11px;
  height: 11px;
  display: block;
}
.q-play:hover {
  background: v-bind(ACCENT);
  color: #fff;
}

/* browse banner + category chips */
.banner {
  border-radius: 12px;
  padding: 22px 26px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}
.b-kicker {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  opacity: 0.85;
}
.b-title {
  font-size: 24px;
  font-weight: 700;
  margin-top: 4px;
}
.b-author {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 2px;
}
.b-emoji {
  font-size: 64px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0 18px;
}
.chip {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text);
}
.chip:hover {
  background: var(--hover);
}
.chip.on {
  background: v-bind(ACCENT);
  border-color: v-bind(ACCENT);
  color: #fff;
}

/* top charts */
.chart-rows {
  border-top: 0.5px solid var(--border);
}
.ch-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px;
  border-bottom: 0.5px solid var(--border);
  border-radius: 8px;
}
.ch-row:hover {
  background: var(--hover);
}
.ch-rank {
  width: 26px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-dim);
  flex-shrink: 0;
}
.ch-text {
  flex: 1;
  min-width: 0;
}
.ch-title,
.ch-author {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ch-title {
  font-size: 13px;
  font-weight: 600;
}
.ch-author {
  font-size: 11px;
  color: var(--text-dim);
}
.ch-cat {
  font-size: 11px;
  color: var(--text-dim);
  flex-shrink: 0;
  width: 110px;
  text-align: right;
}
.ch-follow {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid v-bind(ACCENT);
  color: v-bind(ACCENT);
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ch-follow svg {
  width: 12px;
  height: 12px;
  display: block;
}
.ch-follow.on {
  background: v-bind(ACCENT);
  color: #fff;
}

/* empty states */
.empty {
  text-align: center;
  padding: 60px 0;
  color: var(--text);
}
.empty-emoji {
  color: var(--text-dim);
  display: inline-flex;
}
.empty-emoji svg {
  width: 44px;
  height: 44px;
  display: block;
}
.empty p {
  font-size: 14px;
  font-weight: 600;
  margin-top: 10px;
}
.empty-sub {
  font-size: 12px !important;
  font-weight: 400 !important;
  color: var(--text-dim);
  margin-top: 4px !important;
}
</style>
