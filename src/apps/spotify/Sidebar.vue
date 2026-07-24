<script setup>
import { ref } from 'vue'
import { playlists } from './data'

defineProps({
  view: { type: String, default: 'home' },
  activePlaylistId: { type: String, default: '' },
})
const emit = defineEmits(['go', 'open'])

// Covers that failed to load (offline): hide the img, keep gradient + emoji.
const failed = ref(new Set())
const onCoverError = (key) => { failed.value = new Set(failed.value).add(key) }
</script>

<template>
  <aside class="sp-sidebar">
    <div class="nav-card">
      <button class="nav-item" :class="{ on: view === 'home' }" @click="emit('go', 'home')">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path v-if="view === 'home'" d="M12 3l9 8h-3v9h-4v-6H10v6H6v-9H3z" />
          <path v-else d="M12 4.4l7 6.2V19a1 1 0 0 1-1 1h-4v-6h-4v6H6a1 1 0 0 1-1-1v-8.4l7-6.2zm0-2.4L2 11h2v8a3 3 0 0 0 3 3h2v-6h6v6h2a3 3 0 0 0 3-3v-8h2L12 2z" />
        </svg>
        <span>Home</span>
      </button>
      <button class="nav-item" :class="{ on: view === 'search' }" @click="emit('go', 'search')">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M10.5 3a7.5 7.5 0 1 0 4.6 13.4l4.7 4.7 1.4-1.4-4.7-4.7A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" />
        </svg>
        <span>Search</span>
      </button>
    </div>

    <div class="lib-card">
      <div class="lib-head">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M4 4h2v16H4zM8 4h2v16H8zM12 4h6l4 16h-2.2l-3.2-12.8L14 20h-2z" opacity=".9" />
        </svg>
        <span>Your Library</span>
      </div>
      <div class="pl-list">
        <button
          v-for="pl in playlists"
          :key="pl.id"
          class="pl-row"
          :class="{ on: view === 'playlist' && activePlaylistId === pl.id }"
          @click="emit('open', pl.id)"
        >
          <span class="pl-cover" :style="{ background: pl.gradient }">
            {{ pl.coverEmoji }}
            <img v-if="!failed.has(pl.id)" class="cover-img" :src="pl.cover" :alt="pl.name"
              loading="lazy" draggable="false" @error="onCoverError(pl.id)" />
          </span>
          <span class="pl-meta">
            <span class="pl-name">{{ pl.name }}</span>
            <span class="pl-sub">Playlist · {{ pl.trackIds.length }} songs</span>
          </span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sp-sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0 0 8px;
  min-height: 0;
}
.nav-card,
.lib-card {
  background: #121212;
  border-radius: 8px;
  padding: 8px 4px;
}
.lib-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #0e0e0e;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  color: #b3b3b3;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.15s;
}
.nav-item:hover,
.nav-item.on {
  color: #fff;
}
.lib-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px 10px;
  color: #b3b3b3;
  font-size: 14px;
  font-weight: 700;
}
.pl-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 4px 8px;
}
.pl-list::-webkit-scrollbar {
  width: 8px;
}
.pl-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}
.pl-row {
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
  transition: background 0.15s;
}
.pl-row:hover {
  background: #1f1f1f;
}
.pl-row.on {
  background: #232323;
}
.pl-cover {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
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
.pl-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.pl-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pl-sub {
  color: #b3b3b3;
  font-size: 12px;
}
</style>
