<script setup>
import { computed, inject, ref } from 'vue'
import { genres, getPlaylistTracks } from './data'

const sp = inject('spotify')
const query = ref('')

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const seen = new Set()
  const out = []
  for (const pl of sp.playlists) {
    for (const t of getPlaylistTracks(pl)) {
      if (seen.has(t.id)) continue
      if (
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
      ) {
        seen.add(t.id)
        out.push(t)
      }
    }
  }
  return out.slice(0, 8)
})

function playResult(i) {
  sp.playQueue(results.value, i)
}
function fmt(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="search">
    <div class="search-bar">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#b3b3b3">
        <path d="M10.5 3a7.5 7.5 0 1 0 4.6 13.4l4.7 4.7 1.4-1.4-4.7-4.7A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" />
      </svg>
      <input v-model="query" placeholder="What do you want to listen to?" autofocus />
    </div>

    <template v-if="query.trim()">
      <h2 class="sec-title">Songs</h2>
      <div v-if="results.length" class="results">
        <button
          v-for="(t, i) in results"
          :key="t.id"
          class="result-row"
          :class="{ playing: sp.currentTrack.value && sp.currentTrack.value.id === t.id }"
          @click="playResult(i)"
        >
          <span class="r-cover" :style="{ background: `linear-gradient(135deg, ${t.color}, #121212 160%)` }">♪</span>
          <span class="r-meta">
            <span class="r-title">{{ t.title }}</span>
            <span class="r-sub">{{ t.artist }} · {{ t.album }}</span>
          </span>
          <span class="r-dur">{{ fmt(t.duration) }}</span>
        </button>
      </div>
      <p v-else class="no-results">No results found for “{{ query }}”</p>
    </template>

    <template v-else>
      <h2 class="sec-title">Browse all</h2>
      <div class="genre-grid">
        <button v-for="g in genres" :key="g.name" class="genre-card" :style="{ background: g.color }">
          <span class="g-name">{{ g.name }}</span>
          <span class="g-art"></span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.search {
  padding: 20px 28px 110px; /* extra bottom inset: last row clears the player bar */
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #242424;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 12px;
  height: 44px;
  width: 340px;
  margin-bottom: 26px;
  transition: border-color 0.15s, background 0.15s;
}
.search-bar:focus-within {
  border-color: #fff;
  background: #2a2a2a;
}
.search-bar input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
}
.search-bar input::placeholder {
  color: #757575;
}
.sec-title {
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.4px;
  margin: 0 0 16px;
}
.genre-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}
.genre-card {
  position: relative;
  aspect-ratio: 16 / 9.5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  font-family: inherit;
  text-align: left;
  padding: 14px;
}
.g-name {
  color: #fff;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.4px;
}
.g-art {
  position: absolute;
  right: -16px;
  bottom: -8px;
  width: 90px;
  height: 90px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.28);
  transform: rotate(25deg);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
.results {
  display: flex;
  flex-direction: column;
}
.result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 7px 10px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.result-row:hover {
  background: #1f1f1f;
}
.r-cover {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}
.r-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.r-title {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}
.playing .r-title {
  color: #1ed760;
}
.r-sub {
  color: #b3b3b3;
  font-size: 12px;
}
.r-dur {
  color: #b3b3b3;
  font-size: 12px;
}
.no-results {
  color: #b3b3b3;
  font-size: 14px;
  margin-top: 10px;
}
</style>
