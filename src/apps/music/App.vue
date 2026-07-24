<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSystemStore } from '../../stores/system'
import { ALBUMS, PLAYLISTS, STATIONS, resolveRef } from './data'
import AlbumGrid from './AlbumGrid.vue'
import TrackList from './TrackList.vue'
import PlayerBar from './PlayerBar.vue'
import NIcon from './NIcon.vue'

const ACCENT = '#fa2d48'

// ---------- navigation ----------
const view = ref('listen-now') // sidebar section id, or 'pl-<id>' for playlists
const detailAlbum = ref(null) // album shown in the detail pane
const detailArtist = ref(null) // artist name shown in the detail pane
const selRow = ref(-1)

const NAV = [
  { head: 'Apple Music', items: [
    { v: 'listen-now', label: 'Listen Now', icon: 'play-circle' },
    { v: 'browse', label: 'Browse', icon: 'compass' },
    { v: 'radio', label: 'Radio', icon: 'radio' },
  ] },
  { head: 'Library', items: [
    { v: 'recent', label: 'Recently Added', icon: 'clock' },
    { v: 'artists', label: 'Artists', icon: 'mic' },
    { v: 'albums', label: 'Albums', icon: 'disc' },
    { v: 'songs', label: 'Songs', icon: 'note' },
  ] },
]

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})
const activePlaylist = computed(() =>
  view.value.startsWith('pl-') ? PLAYLISTS.find((p) => p.id === view.value.slice(3)) : null)
const artists = computed(() => {
  const map = new Map()
  for (const al of ALBUMS) {
    if (!map.has(al.artist)) map.set(al.artist, { name: al.artist, albums: [] })
    map.get(al.artist).albums.push(al)
  }
  return [...map.values()]
})
const artistAlbums = computed(() =>
  artists.value.find((x) => x.name === detailArtist.value)?.albums || [])
const allSongs = computed(() =>
  ALBUMS.flatMap((al, a) => al.tracks.map((tr, t) => ({
    name: tr.name, sub1: al.artist, sub2: al.title, dur: tr.dur, a, t,
  }))))
const recentAlbums = computed(() => [...ALBUMS].sort((x, y) => y.year - x.year))

// Covers that failed to load (offline): hide the img, keep gradient + emoji.
const failedCovers = ref(new Set())
const onCoverError = (key) => { failedCovers.value = new Set(failedCovers.value).add(key) }

function select(v) {
  view.value = v
  detailAlbum.value = null
  detailArtist.value = null
  selRow.value = -1
}
function openAlbum(album) {
  detailAlbum.value = album
  detailArtist.value = null
  selRow.value = -1
}

// ---------- real audio playback ----------
const system = useSystemStore()

// Single hidden audio element. Album index a maps to SoundHelix-Song-(a+1).mp3 —
// every track row of an album plays that album's song.
const audio = new Audio()
audio.preload = 'auto'
const songUrl = (a) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${a + 1}.mp3`

const queue = ref([]) // [{ a, t }] — references into the catalog
const qi = ref(0)
const playing = ref(false)
const elapsed = ref(0) // seconds, mirrors audio.currentTime
const audioDuration = ref(0) // seconds, mirrors audio.duration
const unavailable = ref(false) // shows the offline/load-error toast
let toastTimer = null

const currentRef = computed(() => queue.value[qi.value] || null)
const current = computed(() => (currentRef.value ? resolveRef(currentRef.value) : null))
const duration = computed(() => audioDuration.value)
const progress = computed(() => (duration.value ? Math.min(100, (elapsed.value / duration.value) * 100) : 0))

function showToast() {
  unavailable.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { unavailable.value = false }, 4000)
}

// Load the current ref's song into the audio element and start playing it.
function loadAndPlay() {
  const c = currentRef.value
  if (!c) return
  const url = songUrl(c.a)
  if (audio.src !== url) {
    audio.src = url
    audioDuration.value = 0
  }
  unavailable.value = false
  clearTimeout(toastTimer)
  elapsed.value = 0
  audio.currentTime = 0
  const p = audio.play()
  if (p) p.catch(() => {}) // a media failure surfaces via the 'error' event
}

function queueAlbum(a, t) {
  queue.value = ALBUMS[a].tracks.map((_, i) => ({ a, t: i }))
  qi.value = t
}
function playAlbum(album, t = 0) {
  // album may arrive as a reactive proxy (detail pane) — match by identity first, then title
  let idx = ALBUMS.indexOf(album)
  if (idx < 0) idx = ALBUMS.findIndex((a) => a.title === album?.title)
  if (idx < 0) return
  queueAlbum(idx, t)
  loadAndPlay()
}
function playPlaylist(pl, i = 0) {
  queue.value = pl.refs.map((r) => ({ ...r }))
  qi.value = i
  loadAndPlay()
}
function playStation(idx) {
  const all = ALBUMS.flatMap((al, a) => al.tracks.map((_, t) => ({ a, t })))
  queue.value = all
  qi.value = (idx * 19) % all.length
  loadAndPlay()
}
function toggle() {
  if (!current.value) return
  if (audio.paused) {
    if (audio.src) {
      const p = audio.play()
      if (p) p.catch(() => {})
    } else loadAndPlay()
  } else {
    audio.pause()
  }
}
function next() {
  const c = currentRef.value
  if (!c) return
  // skip ahead to the next queue entry from a different album (each album is one song)
  let i = qi.value + 1
  while (i < queue.value.length && queue.value[i].a === c.a) i++
  if (i < queue.value.length) {
    qi.value = i
    loadAndPlay()
  } else if (c.a < ALBUMS.length - 1) {
    queueAlbum(c.a + 1, 0) // continue with the next album
    loadAndPlay()
  } else {
    playing.value = false // end of the catalog: stop
    audio.pause()
    audio.currentTime = 0
    elapsed.value = 0
  }
}
function prev() {
  const c = currentRef.value
  if (!c) return
  if (elapsed.value > 3) {
    audio.currentTime = 0
    elapsed.value = 0
    return
  }
  let i = qi.value - 1
  while (i >= 0 && queue.value[i].a === c.a) i--
  if (i >= 0) {
    qi.value = i
    loadAndPlay()
  } else if (c.a > 0) {
    const a = c.a - 1
    queueAlbum(a, ALBUMS[a].tracks.length - 1) // previous album's last track
    loadAndPlay()
  } else {
    audio.currentTime = 0
    elapsed.value = 0
  }
}
function seek(e) {
  if (!duration.value) return
  const r = e.currentTarget.getBoundingClientRect()
  const t = ((e.clientX - r.left) / r.width) * duration.value
  audio.currentTime = t
  elapsed.value = t
}

// ---------- shared Now Playing state (Control Center) ----------
function syncNowPlaying(isPlaying) {
  const c = current.value
  if (!c) return
  system.setNowPlaying({ title: c.track.name, artist: c.album.artist, app: 'Music', playing: isPlaying })
}
function registerMediaControls() {
  system.setMediaControls({ playPause: toggle, next, prev })
}

// audio element events drive all playback state (no simulation timer)
const onTime = () => { elapsed.value = audio.currentTime }
const onMeta = () => { audioDuration.value = audio.duration || 0 }
const onPlay = () => {
  playing.value = true
  syncNowPlaying(true)
  registerMediaControls() // the last app that played owns the Control Center controls
}
const onPause = () => {
  playing.value = false
  syncNowPlaying(false)
}
const onEnded = () => next() // a finished song auto-advances to the next album
const onError = () => { playing.value = false; syncNowPlaying(false); showToast() }
audio.addEventListener('timeupdate', onTime)
audio.addEventListener('durationchange', onMeta)
audio.addEventListener('loadedmetadata', onMeta)
audio.addEventListener('play', onPlay)
audio.addEventListener('pause', onPause)
audio.addEventListener('ended', onEnded)
audio.addEventListener('error', onError)

// the player-bar volume slider (system volume) drives the element volume
watch(() => system.volume, (v) => { audio.volume = Math.min(1, Math.max(0, v / 100)) }, { immediate: true })

onUnmounted(() => {
  system.clearMedia('Music') // don't let Control Center control a dead app
  clearTimeout(toastTimer)
  audio.pause()
  audio.removeAttribute('src')
  audio.removeEventListener('timeupdate', onTime)
  audio.removeEventListener('durationchange', onMeta)
  audio.removeEventListener('loadedmetadata', onMeta)
  audio.removeEventListener('play', onPlay)
  audio.removeEventListener('pause', onPause)
  audio.removeEventListener('ended', onEnded)
  audio.removeEventListener('error', onError)
})

// row models + "now playing" row index for each track list
const albumRows = computed(() =>
  (detailAlbum.value?.tracks || []).map((tr) => ({ name: tr.name, dur: tr.dur })))
const albumCur = computed(() =>
  currentRef.value && ALBUMS[currentRef.value.a] === detailAlbum.value ? currentRef.value.t : -1)
const plRows = computed(() =>
  (activePlaylist.value?.refs || []).map((r) => {
    const { album, track } = resolveRef(r)
    return { name: track.name, sub1: album.artist, dur: track.dur }
  }))
const plCur = computed(() => {
  const c = currentRef.value
  return c && activePlaylist.value
    ? activePlaylist.value.refs.findIndex((r) => r.a === c.a && r.t === c.t)
    : -1
})
const songsCur = computed(() => {
  const c = currentRef.value
  return c ? allSongs.value.findIndex((s) => s.a === c.a && s.t === c.t) : -1
})
</script>

<template>
  <div class="app-root music">
    <div class="body">
      <aside class="sidebar">
        <template v-for="sec in NAV" :key="sec.head">
          <div class="nav-head">{{ sec.head }}</div>
          <button v-for="it in sec.items" :key="it.v" class="nav-item"
            :class="{ on: view === it.v && !detailAlbum && !detailArtist }" @click="select(it.v)">
            <span class="nav-icon"><NIcon :name="it.icon" /></span>{{ it.label }}
          </button>
        </template>
        <div class="nav-head">Playlists</div>
        <button v-for="p in PLAYLISTS" :key="p.id" class="nav-item"
          :class="{ on: view === 'pl-' + p.id && !detailAlbum }" @click="select('pl-' + p.id)">
          <span class="pl-tile" :style="{ background: p.bg }">
            <img class="pl-img" :src="p.cover" :alt="p.name" loading="lazy" draggable="false"
              @error="$event.target.style.display = 'none'" />{{ p.emoji }}
          </span>{{ p.name }}
        </button>
      </aside>

      <main class="content">
        <!-- album detail -->
        <div v-if="detailAlbum" class="pane">
          <button class="back" @click="detailAlbum = null">‹ Library</button>
          <div class="al-head">
            <div class="cover big" :style="{ background: detailAlbum.bg }">
              <span>{{ detailAlbum.emoji }}</span>
              <img v-if="!failedCovers.has(detailAlbum.title)" class="cover-img" :src="detailAlbum.cover"
                :alt="detailAlbum.title" loading="lazy" draggable="false" @error="onCoverError(detailAlbum.title)" />
            </div>
            <div>
              <div class="al-title">{{ detailAlbum.title }}</div>
              <div class="al-artist">{{ detailAlbum.artist }}</div>
              <div class="al-meta">{{ detailAlbum.year }} · {{ detailAlbum.tracks.length }} Songs</div>
              <button class="play-btn" @click="playAlbum(detailAlbum)"><span class="pp"><svg viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span> Play</button>
            </div>
          </div>
          <TrackList :rows="albumRows" cols="3" :sel="selRow" :cur="albumCur" :playing="playing"
            @select="selRow = $event" @play="playAlbum(detailAlbum, $event)" />
        </div>

        <!-- playlist detail -->
        <div v-else-if="activePlaylist" class="pane">
          <div class="al-head">
            <div class="cover big" :style="{ background: activePlaylist.bg }"><span>{{ activePlaylist.emoji }}</span></div>
            <div>
              <div class="al-title">{{ activePlaylist.name }}</div>
              <div class="al-artist">Apple Music</div>
              <div class="al-meta">{{ activePlaylist.desc }}</div>
              <button class="play-btn" @click="playPlaylist(activePlaylist)"><span class="pp"><svg viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span> Play</button>
            </div>
          </div>
          <TrackList :rows="plRows" cols="4" :sel="selRow" :cur="plCur" :playing="playing"
            @select="selRow = $event" @play="playPlaylist(activePlaylist, $event)" />
        </div>

        <!-- artist detail -->
        <div v-else-if="detailArtist" class="pane">
          <button class="back" @click="detailArtist = null">‹ Artists</button>
          <h1>{{ detailArtist }}</h1>
          <AlbumGrid :albums="artistAlbums" sub="year" @open="openAlbum" />
        </div>

        <!-- listen now -->
        <div v-else-if="view === 'listen-now'" class="pane">
          <h1>{{ greeting }}</h1>
          <h2>Top Picks for You</h2>
          <AlbumGrid :albums="ALBUMS.slice(0, 5)" @open="openAlbum" />
          <h2>Recently Played</h2>
          <AlbumGrid :albums="ALBUMS.slice(5, 10)" @open="openAlbum" />
        </div>

        <!-- browse -->
        <div v-else-if="view === 'browse'" class="pane">
          <h1>Browse</h1>
          <div class="banner" :style="{ background: ALBUMS[1].bg }" @click="openAlbum(ALBUMS[1])">
            <div>
              <div class="b-kicker">New Album</div>
              <div class="b-title">{{ ALBUMS[1].title }}</div>
              <div class="b-artist">{{ ALBUMS[1].artist }}</div>
            </div>
            <div class="b-emoji">{{ ALBUMS[1].emoji }}</div>
          </div>
          <h2>New Releases</h2>
          <AlbumGrid :albums="recentAlbums.slice(0, 5)" @open="openAlbum" />
        </div>

        <!-- radio -->
        <div v-else-if="view === 'radio'" class="pane">
          <h1>Radio</h1>
          <h2>Featured Stations</h2>
          <div v-for="(st, i) in STATIONS" :key="st.name" class="station" @click="playStation(i)">
            <div class="pl-tile st-tile" :style="{ background: st.bg }">{{ st.emoji }}</div>
            <div class="st-info">
              <div class="st-name">{{ st.name }}</div>
              <div class="st-desc">{{ st.desc }}</div>
            </div>
            <span class="st-play"><svg viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span>
          </div>
        </div>

        <!-- recently added / albums -->
        <div v-else-if="view === 'recent'" class="pane">
          <h1>Recently Added</h1>
          <AlbumGrid :albums="recentAlbums" @open="openAlbum" />
        </div>
        <div v-else-if="view === 'albums'" class="pane">
          <h1>Albums</h1>
          <AlbumGrid :albums="ALBUMS" @open="openAlbum" />
        </div>

        <!-- artists -->
        <div v-else-if="view === 'artists'" class="pane">
          <h1>Artists</h1>
          <div class="tracks">
            <div v-for="ar in artists" :key="ar.name" class="artist-row" @click="detailArtist = ar.name">
              <span class="ar-dot">{{ ar.albums[0].emoji }}</span>
              <span class="ar-name">{{ ar.name }}</span>
              <span class="ar-count">{{ ar.albums.length }} Album{{ ar.albums.length > 1 ? 's' : '' }}</span>
            </div>
          </div>
        </div>

        <!-- songs -->
        <div v-else-if="view === 'songs'" class="pane">
          <h1>Songs</h1>
          <TrackList :rows="allSongs" cols="5" :sel="selRow" :cur="songsCur" :playing="playing"
            @select="selRow = $event" @play="playAlbum(ALBUMS[allSongs[$event].a], allSongs[$event].t)" />
        </div>
      </main>
    </div>

    <!-- player bar -->
    <PlayerBar :current="current" :playing="playing" :elapsed="elapsed" :duration="duration"
      :progress="progress" :unavailable="unavailable" @toggle="toggle" @prev="prev" @next="next" @seek="seek" />
  </div>
</template>

<style scoped>
.music {
  background: var(--window-bg);
  position: relative; /* anchors the floating player pill */
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
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
.nav-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}
.pl-tile {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.pl-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* content */
.content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}
.pane {
  padding: 18px 28px 84px; /* bottom room for the floating player pill */
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
.back {
  color: v-bind(ACCENT);
  font-size: 13px;
  padding: 0;
  margin-bottom: 10px;
}
.cover {
  border-radius: 8px;
  border: 0.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

/* detail header */
.al-head {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  margin-bottom: 22px;
}
.cover.big {
  width: 190px;
  height: 190px;
  flex-shrink: 0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.cover.big span {
  font-size: 72px;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
}
.al-title {
  font-size: 24px;
  font-weight: 700;
}
.al-artist {
  font-size: 18px;
  color: v-bind(ACCENT);
  margin-top: 2px;
}
.al-meta {
  font-size: 12px;
  color: var(--text-dim);
  margin: 6px 0 14px;
}
.play-btn {
  background: v-bind(ACCENT);
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  padding: 5px 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(250, 45, 72, 0.35);
}
.play-btn .pp {
  display: inline-flex;
}
.play-btn .pp svg {
  width: 10px;
  height: 10px;
  display: block;
}
.tracks {
  border-top: 0.5px solid var(--border);
}

/* browse banner */
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
.b-artist {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 2px;
}
.b-emoji {
  font-size: 64px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
}

/* radio / artists */
.station {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
}
.station:hover {
  background: var(--hover);
}
.st-tile {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  font-size: 22px;
}
.st-info {
  flex: 1;
  min-width: 0;
}
.st-name {
  font-size: 13px;
  font-weight: 600;
}
.st-desc {
  font-size: 12px;
  color: var(--text-dim);
}
.st-play {
  color: v-bind(ACCENT);
  font-size: 14px;
  padding-right: 6px;
  display: inline-flex;
}
.st-play svg {
  width: 13px;
  height: 13px;
  display: block;
}
.artist-row {
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 8px;
  border-bottom: 0.5px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
}
.artist-row:hover {
  background: var(--hover);
}
.ar-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--hover);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.ar-count {
  font-size: 12px;
  color: var(--text-dim);
}
</style>
