<script setup>
import { computed, onBeforeUnmount, provide, reactive, ref, watch } from 'vue'
import { useSystemStore } from '../../stores/system'
import { playlists, tracks, getPlaylistTracks } from './data'
import Sidebar from './Sidebar.vue'
import HomeView from './HomeView.vue'
import SearchView from './SearchView.vue'
import PlaylistView from './PlaylistView.vue'
import PlayerBar from './PlayerBar.vue'

const system = useSystemStore()

// ---------- navigation ----------
const view = ref('home') // 'home' | 'search' | 'playlist'
const activePlaylistId = ref('liked')

function go(name) {
  view.value = name
}
function openPlaylist(id) {
  activePlaylistId.value = id
  view.value = 'playlist'
}

const activePlaylist = computed(
  () => playlists.find((p) => p.id === activePlaylistId.value) || playlists[0],
)

// ---------- liked songs ----------
const liked = ref(new Set(loadLiked()))
function loadLiked() {
  try {
    return JSON.parse(localStorage.getItem('macos-web:spotify-liked') || '[]')
  } catch {
    return []
  }
}
function persistLiked() {
  localStorage.setItem('macos-web:spotify-liked', JSON.stringify([...liked.value]))
}
function toggleLike(trackId) {
  const s = new Set(liked.value)
  if (s.has(trackId)) s.delete(trackId)
  else s.add(trackId)
  liked.value = s
  persistLiked()
}

// ---------- playback engine ----------
// A single hidden HTMLAudioElement plays the real streams; player state mirrors it.
const audio = new Audio()
audio.preload = 'auto'
const unavailable = ref(false) // current stream failed (offline / unreachable)

const player = reactive({
  queue: [], // [{ id, title, artist, album, duration, color, cover, src }]
  index: -1,
  playing: false,
  progress: 0,
  shuffle: false,
  repeat: 'off', // 'off' | 'all' | 'one'
})

const currentTrack = computed(() =>
  player.index >= 0 && player.index < player.queue.length
    ? player.queue[player.index]
    : null,
)

// ---------- shared Now Playing state (Control Center) ----------
function syncNowPlaying(isPlaying) {
  const t = currentTrack.value
  if (!t) return
  system.setNowPlaying({ title: t.title, artist: t.artist, app: 'Spotify', playing: isPlaying })
}
function registerMediaControls() {
  system.setMediaControls({ playPause: togglePlay, next: () => next(false), prev })
}

function safePlay() {
  const p = audio.play()
  if (p && typeof p.catch === 'function') p.catch(() => {})
}

audio.addEventListener('timeupdate', () => {
  player.progress = audio.currentTime
})
audio.addEventListener('loadedmetadata', () => {
  const t = currentTrack.value
  if (t && Number.isFinite(audio.duration)) t.duration = audio.duration
})
audio.addEventListener('playing', () => {
  player.playing = true
  syncNowPlaying(true)
  registerMediaControls() // the last app that played owns the Control Center controls
})
audio.addEventListener('pause', () => {
  player.playing = false
  syncNowPlaying(false)
})
audio.addEventListener('ended', () => handleTrackEnd())
audio.addEventListener('error', () => {
  if (!currentTrack.value || !audio.getAttribute('src')) return
  unavailable.value = true
  player.playing = false
  syncNowPlaying(false)
})

// System volume (0–100) drives the element volume.
watch(
  () => system.volume,
  (v) => {
    audio.volume = Math.max(0, Math.min(1, v / 100))
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  system.clearMedia('Spotify') // don't let Control Center control a dead app
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
})

function playCurrent() {
  const t = currentTrack.value
  if (!t) return
  unavailable.value = false
  player.progress = 0
  audio.src = t.src
  safePlay()
}

function playQueue(trackList, startIndex = 0) {
  player.queue = trackList.slice()
  player.index = startIndex
  playCurrent()
}

function playPlaylist(playlistId, startIndex = 0) {
  const pl = playlists.find((p) => p.id === playlistId)
  if (!pl) return
  playQueue(getPlaylistTracks(pl), startIndex)
}

function togglePlay() {
  if (!currentTrack.value) {
    playPlaylist('tophits', 0)
    return
  }
  if (player.playing) {
    audio.pause()
  } else {
    unavailable.value = false
    safePlay()
  }
}

function seekTo(ratio) {
  if (!currentTrack.value || !Number.isFinite(audio.duration) || !audio.duration) return
  const t = Math.max(0, Math.min(1, ratio)) * audio.duration
  audio.currentTime = t
  player.progress = t
}

function pickShuffleIndex() {
  if (player.queue.length <= 1) return player.index
  let i = player.index
  while (i === player.index) i = Math.floor(Math.random() * player.queue.length)
  return i
}

function next(auto = false) {
  if (!currentTrack.value) return
  if (auto && player.repeat === 'one') {
    audio.currentTime = 0
    player.progress = 0
    safePlay()
    return
  }
  let i
  if (player.shuffle) {
    i = pickShuffleIndex()
  } else {
    i = player.index + 1
    if (i >= player.queue.length) {
      if (player.repeat === 'all' || !auto) i = 0
      else {
        player.playing = false
        player.progress = 0
        audio.currentTime = 0
        syncNowPlaying(false) // queue ended with nothing following
        return
      }
    }
  }
  player.index = i
  playCurrent()
}

function prev() {
  if (!currentTrack.value) return
  if (player.progress > 3) {
    audio.currentTime = 0
    player.progress = 0
    return
  }
  player.index = player.shuffle
    ? pickShuffleIndex()
    : (player.index - 1 + player.queue.length) % player.queue.length
  playCurrent()
}

function handleTrackEnd() {
  next(true)
}

function toggleShuffle() {
  player.shuffle = !player.shuffle
}
function toggleRepeat() {
  player.repeat = player.repeat === 'off' ? 'all' : player.repeat === 'all' ? 'one' : 'off'
}

// Shared with child views without prop-drilling.
provide('spotify', {
  player,
  currentTrack,
  liked,
  toggleLike,
  playPlaylist,
  playQueue,
  togglePlay,
  openPlaylist,
  playlists,
  tracks,
})
</script>

<template>
  <div class="app-root spotify">
    <div class="sp-body">
      <Sidebar :view="view" :active-playlist-id="activePlaylistId" @go="go" @open="openPlaylist" />
      <main class="sp-main">
        <HomeView v-if="view === 'home'" />
        <SearchView v-else-if="view === 'search'" />
        <PlaylistView v-else :playlist="activePlaylist" :key="activePlaylist.id" />
      </main>
    </div>
    <PlayerBar
      :player="player"
      :current-track="currentTrack"
      :liked="liked"
      :volume="system.volume"
      :unavailable="unavailable"
      @toggle-play="togglePlay"
      @next="next(false)"
      @prev="prev"
      @seek="seekTo"
      @toggle-like="toggleLike"
      @toggle-shuffle="toggleShuffle"
      @toggle-repeat="toggleRepeat"
      @volume="(v) => (system.volume = v)"
    />
  </div>
</template>

<style scoped>
.spotify {
  background: #121212;
  color: #fff;
  font-size: 13px;
  overflow: hidden;
}
.sp-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.sp-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background: #121212;
  border-radius: 8px;
  margin: 8px 8px 0 0;
  position: relative;
}
.sp-main::-webkit-scrollbar {
  width: 10px;
}
.sp-main::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 5px;
}
</style>
