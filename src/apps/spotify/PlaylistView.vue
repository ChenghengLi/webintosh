<script setup>
import { computed, inject, ref } from 'vue'
import { getPlaylistTracks, formatTime } from './data'

const props = defineProps({
  playlist: { type: Object, required: true },
})
const sp = inject('spotify')

// Covers that failed to load (offline): hide the img, keep gradient + emoji.
const failed = ref(new Set())
const onCoverError = (key) => { failed.value = new Set(failed.value).add(key) }

const trackList = computed(() => getPlaylistTracks(props.playlist))
const totalTime = computed(() => {
  const s = trackList.value.reduce((a, t) => a + t.duration, 0)
  return `${Math.floor(s / 60)} min ${s % 60} sec`
})

const headerTint = computed(() => {
  const m = props.playlist.gradient.match(/#([0-9a-f]{6})/i)
  return m ? `#${m[1]}` : '#503750'
})

function isCurrent(t) {
  return sp.currentTrack.value && sp.currentTrack.value.id === t.id
}
function rowClick(i) {
  sp.playPlaylist(props.playlist.id, i)
}
function playAll() {
  if (isCurrentPlaylistPlaying.value) {
    sp.togglePlay()
    return
  }
  sp.playPlaylist(props.playlist.id, 0)
}
const isCurrentPlaylistPlaying = computed(() => {
  const cur = sp.currentTrack.value
  return cur && sp.player.playing && props.playlist.trackIds.includes(cur.id)
})
</script>

<template>
  <div class="pl-view">
    <header class="pl-header" :style="{ background: `linear-gradient(180deg, ${headerTint}, transparent)` }">
      <div class="pl-cover" :style="{ background: playlist.gradient }">
        {{ playlist.coverEmoji }}
        <img v-if="!failed.has(playlist.id)" class="cover-img" :src="playlist.cover" :alt="playlist.name"
          loading="lazy" draggable="false" @error="onCoverError(playlist.id)" />
      </div>
      <div class="pl-headmeta">
        <span class="pl-type">Playlist</span>
        <h1 class="pl-title">{{ playlist.name }}</h1>
        <p class="pl-desc">{{ playlist.desc }}</p>
        <span class="pl-stats">Spotify · {{ trackList.length }} songs, <span class="dim">{{ totalTime }}</span></span>
      </div>
    </header>

    <div class="pl-actions">
      <button class="big-play" @click="playAll" :title="isCurrentPlaylistPlaying ? 'Playing' : 'Play'">
        <svg v-if="isCurrentPlaylistPlaying" viewBox="0 0 24 24" width="26" height="26" fill="#000">
          <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="26" height="26" fill="#000"><path d="M8 5v14l11-7z" /></svg>
      </button>
      <button class="heart-btn" title="Save to Your Library">♡</button>
      <button class="more-btn" title="More options">···</button>
    </div>

    <div class="track-table">
      <div class="tr tr-head">
        <span class="c-num">#</span>
        <span class="c-title">Title</span>
        <span class="c-album">Album</span>
        <span class="c-dur">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.2 3.1.8-1.2-4.5-2.7V7z" />
          </svg>
        </span>
      </div>
      <button
        v-for="(t, i) in trackList"
        :key="t.id"
        class="tr tr-row"
        :class="{ current: isCurrent(t) }"
        @click="rowClick(i)"
      >
        <span class="c-num">
          <span v-if="isCurrent(t) && sp.player.playing" class="eq">
            <i></i><i></i><i></i>
          </span>
          <span v-else class="num-text">{{ i + 1 }}</span>
          <svg class="hover-play" viewBox="0 0 24 24" width="14" height="14" fill="#fff">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span class="c-title">
          <span class="t-cover" :style="{ background: `linear-gradient(135deg, ${t.color}, #121212 170%)` }">
            ♪
            <img v-if="!failed.has(t.id)" class="cover-img" :src="t.cover" :alt="t.album"
              loading="lazy" draggable="false" @error="onCoverError(t.id)" />
          </span>
          <span class="t-meta">
            <span class="t-name" :class="{ green: isCurrent(t) }">{{ t.title }}</span>
            <span class="t-artist">{{ t.artist }}</span>
          </span>
        </span>
        <span class="c-album">{{ t.album }}</span>
        <span class="c-dur">
          <span
            class="like"
            :class="{ on: sp.liked.value.has(t.id) }"
            @click.stop="sp.toggleLike(t.id)"
          >{{ sp.liked.value.has(t.id) ? '♥' : '♡' }}</span>
          {{ formatTime(t.duration) }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pl-view {
  min-height: 100%;
}
.pl-header {
  display: flex;
  align-items: flex-end;
  gap: 22px;
  padding: 28px 28px 24px;
}
.pl-cover {
  width: 192px;
  height: 192px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  flex-shrink: 0;
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
.pl-headmeta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.pl-type {
  font-size: 12px;
  font-weight: 700;
}
.pl-title {
  font-size: 52px;
  font-weight: 900;
  letter-spacing: -2px;
  margin: 0;
  line-height: 1.05;
}
.pl-desc {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  margin: 0;
}
.pl-stats {
  font-size: 13px;
  font-weight: 600;
}
.pl-stats .dim {
  color: rgba(255, 255, 255, 0.65);
  font-weight: 400;
}
.pl-actions {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 12px 28px 18px;
}
.big-play {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: none;
  background: #1ed760;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s, background 0.12s;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}
.big-play:hover {
  transform: scale(1.05);
  background: #3be477;
}
.heart-btn,
.more-btn {
  background: none;
  border: none;
  color: #b3b3b3;
  font-size: 26px;
  cursor: pointer;
  padding: 0;
}
.more-btn {
  font-size: 22px;
  letter-spacing: 2px;
}
.heart-btn:hover,
.more-btn:hover {
  color: #fff;
}
.track-table {
  padding: 0 16px 110px; /* extra bottom inset: last track clears the player bar */
}
.tr {
  display: grid;
  grid-template-columns: 32px 1fr 220px 90px;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  height: 52px;
  border-radius: 6px;
  width: 100%;
  font-family: inherit;
  text-align: left;
}
.tr-head {
  height: 36px;
  color: #b3b3b3;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0;
  margin-bottom: 10px;
}
.tr-row {
  background: none;
  border: none;
  cursor: pointer;
  color: #b3b3b3;
}
.tr-row:hover {
  background: rgba(255, 255, 255, 0.09);
}
.tr-row.current {
  background: rgba(255, 255, 255, 0.06);
}
.c-num {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.hover-play {
  display: none;
  position: absolute;
}
.tr-row:hover .hover-play {
  display: block;
}
.tr-row:hover .num-text,
.tr-row:hover .eq {
  display: none;
}
.eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}
.eq i {
  width: 3px;
  background: #1ed760;
  border-radius: 1px;
  animation: eq 0.9s ease-in-out infinite;
}
.eq i:nth-child(1) {
  animation-delay: 0s;
}
.eq i:nth-child(2) {
  animation-delay: 0.3s;
}
.eq i:nth-child(3) {
  animation-delay: 0.6s;
}
@keyframes eq {
  0%, 100% { height: 4px; }
  50% { height: 14px; }
}
.c-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.t-cover {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.75);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.t-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.t-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.t-name.green {
  color: #1ed760;
}
.t-artist {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tr-row:hover .t-artist {
  color: #fff;
}
.c-album {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tr-row:hover .c-album {
  color: #fff;
}
.c-dur {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  font-size: 13px;
}
.like {
  opacity: 0;
  font-size: 15px;
  transition: opacity 0.15s;
}
.like.on {
  opacity: 1;
  color: #1ed760;
}
.tr-row:hover .like {
  opacity: 1;
}
.like:hover {
  color: #fff;
}
.like.on:hover {
  color: #3be477;
}
</style>
