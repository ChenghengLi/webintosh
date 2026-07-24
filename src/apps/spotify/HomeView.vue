<script setup>
import { computed, inject } from 'vue'
import { madeForYou, recentCards } from './data'

const sp = inject('spotify')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
})

const quickPicks = sp.playlists

function open(pl) {
  sp.openPlaylist(pl.id)
}
function play(ev, pl) {
  ev.stopPropagation()
  sp.playPlaylist(pl.id, 0)
}
function openCard(card) {
  sp.openPlaylist(card.playlistId)
}
function playCard(ev, card) {
  ev.stopPropagation()
  sp.playPlaylist(card.playlistId, 0)
}
</script>

<template>
  <div class="home">
    <div class="home-fade"></div>
    <h1 class="greeting">{{ greeting }}</h1>

    <div class="quick-grid">
      <button v-for="pl in quickPicks" :key="pl.id" class="quick-tile" @click="open(pl)">
        <span class="q-cover" :style="{ background: pl.gradient }">{{ pl.coverEmoji }}</span>
        <span class="q-name">{{ pl.name }}</span>
        <span class="q-play" @click="(e) => play(e, pl)">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#000"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </button>
    </div>

    <section class="row">
      <div class="row-head">
        <h2>Made For You</h2>
        <span class="show-all">Show all</span>
      </div>
      <div class="cards">
        <button v-for="c in madeForYou" :key="c.name" class="card" @click="openCard(c)">
          <span class="c-coverwrap">
            <span class="c-cover" :style="{ background: `linear-gradient(140deg, ${c.color}, #121212 130%)` }">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="rgba(255,255,255,.9)">
                <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-4 12.8c2.8-1.5 5.6-1.6 8.2-.6l.5-1.3c-3-1.2-6.2-1-9.4.7l.7 1.2zm1-3.4c2.4-1.3 5-1.5 7.4-.5l.5-1.4a11.4 11.4 0 0 0-8.6.8l.7 1.1zm.9-3.3c2-1.1 4.2-1.2 6.3-.5l.5-1.5a10.4 10.4 0 0 0-7.5.9l.7 1.1z" />
              </svg>
            </span>
            <span class="c-play" @click="(e) => playCard(e, c)">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#000"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
          <span class="c-name">{{ c.name }}</span>
          <span class="c-desc">{{ c.desc }}</span>
        </button>
      </div>
    </section>

    <section class="row">
      <div class="row-head">
        <h2>Recently played</h2>
        <span class="show-all">Show all</span>
      </div>
      <div class="cards">
        <button v-for="c in recentCards" :key="c.name" class="card" @click="openCard(c)">
          <span class="c-coverwrap">
            <span class="c-cover" :style="{ background: `linear-gradient(140deg, ${c.color}, #121212 140%)` }">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="rgba(255,255,255,.9)">
                <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-2 5h2v5h-2zm4 0h2v5h-2z" opacity="0" />
                <path d="M9.5 7.5c3.5-1.6 6.3-1.2 8.6.5l-.6 1.2c-2-1.4-4.4-1.7-7.4-.4l-.6-1.3zm-.4 3c2.9-1.2 5.2-.9 7.1.6l-.6 1.2c-1.6-1.2-3.6-1.5-5.9-.5l-.6-1.3zm-.3 2.8c2.2-.8 3.9-.6 5.3.6l-.6 1.1c-1.2-1-2.7-1.2-4.2-.6l-.5-1.1z" transform="rotate(90 12 12)" />
              </svg>
            </span>
            <span class="c-play" @click="(e) => playCard(e, c)">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#000"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
          <span class="c-name">{{ c.name }}</span>
          <span class="c-desc">{{ c.desc }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  padding: 20px 28px 110px; /* extra bottom inset: last card clears the player bar */
  z-index: 0;
}
.home-fade {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 320px;
  background: linear-gradient(180deg, rgba(64, 50, 122, 0.55), transparent);
  pointer-events: none;
  z-index: -1;
}
.greeting {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 8px 0 18px;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 34px;
}
.quick-tile {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  font-family: inherit;
  position: relative;
  height: 62px;
  padding: 0;
  text-align: left;
  transition: background 0.15s;
}
.quick-tile:hover {
  background: rgba(255, 255, 255, 0.16);
}
.q-cover {
  width: 62px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.q-name {
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.q-play {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%) translateY(6px);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #1ed760;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
}
.quick-tile:hover .q-play {
  opacity: 1;
  transform: translateY(-50%);
}
.q-play:hover {
  transform: translateY(-50%) scale(1.05);
}
.row {
  margin-bottom: 34px;
}
.row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}
.row-head h2 {
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.4px;
  margin: 0;
}
.show-all {
  color: #b3b3b3;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.6px;
  cursor: pointer;
}
.show-all:hover {
  text-decoration: underline;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
}
.card {
  background: #181818;
  border: none;
  border-radius: 8px;
  padding: 14px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background 0.2s;
}
.card:hover {
  background: #282828;
}
.c-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}
.c-name {
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.c-desc {
  color: #b3b3b3;
  font-size: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.c-coverwrap {
  position: relative;
  display: block;
}
.c-play {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #1ed760;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(8px);
  transition: all 0.2s;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
}
.card:hover .c-play {
  opacity: 1;
  transform: translateY(0);
}
</style>
