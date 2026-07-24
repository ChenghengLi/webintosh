<script setup>
// Safari Start Page: Favorites, Privacy Report, Reading List.
// The Wikipedia tile runs a live 'macOS' search through the new engine.
const emit = defineEmits(['open-url', 'open-search'])

const FAVORITES = [
  { name: 'Apple', type: 'url', url: 'https://www.apple.com', icon: '/icons/brands/apple.svg', invert: true, bg: 'linear-gradient(160deg,#3a3a3c,#1c1c1e)' },
  { name: 'Wikipedia', type: 'search', q: 'macOS', icon: '/icons/brands/wikipedia.svg', bg: 'linear-gradient(160deg,#ffffff,#d8d8dc)' },
  { name: 'GitHub', type: 'url', url: 'https://github.com', icon: '/icons/brands/github.svg', invert: true, bg: 'linear-gradient(160deg,#6e40c9,#24292f)' },
  { name: 'MDN', type: 'url', url: 'https://developer.mozilla.org', icon: '/icons/brands/mdnwebdocs.svg', invert: true, bg: 'linear-gradient(160deg,#1b73e8,#0b3d91)' },
  { name: 'Vue.js', type: 'url', url: 'https://vuejs.org', letter: 'V', bg: 'linear-gradient(160deg,#42d392,#35495e)' },
]

const PRIVACY = {
  count: 23,
  days: 7,
  trackers: ['ad-track.example', 'metrics.analytics.example', 'beacon.ads.example', 'pixel.social.example'],
}

const READING_LIST = [
  { title: 'Vue 3 Composition API Guide', source: 'vuejs.org', url: 'https://vuejs.org/guide/introduction.html' },
  { title: 'MDN Web Docs: CSS Grid Layout', source: 'developer.mozilla.org', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout' },
  { title: 'The GitHub Blog', source: 'github.blog', url: 'https://github.blog' },
]

function openFavorite(fav) {
  if (fav.type === 'search') emit('open-search', fav.q)
  else emit('open-url', fav.url)
}
</script>

<template>
  <div class="start-page">
    <div class="start-inner">
      <div class="favorites-head">
        <h2 class="section-title">Favorites</h2>
        <span class="powered-chip">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>
          Powered by live Wikipedia search
        </span>
      </div>
      <div class="favorites-grid">
        <button v-for="fav in FAVORITES" :key="fav.name" class="favorite" @click="openFavorite(fav)">
          <span class="fav-tile" :style="{ background: fav.bg }">
            <img v-if="fav.icon" class="fav-icon" :class="{ invert: fav.invert }" :src="fav.icon" :alt="fav.name" />
            <span v-else class="fav-letter">{{ fav.letter }}</span>
          </span>
          <span class="fav-name">{{ fav.name }}</span>
        </button>
      </div>

      <h2 class="section-title">Privacy Report</h2>
      <div class="privacy-card">
        <div class="privacy-head">
          <span class="privacy-shield">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 2.8V11c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V5.8L12 3z"/><path d="M9 11.8l2.2 2.2 4-4.2"/></svg>
          </span>
          <div>
            <div class="privacy-count">{{ PRIVACY.count }} trackers prevented</div>
            <div class="privacy-sub">from profiling you in the last {{ PRIVACY.days }} days</div>
          </div>
        </div>
        <div class="privacy-trackers">
          <span v-for="t in PRIVACY.trackers" :key="t" class="tracker-chip">{{ t }}</span>
        </div>
      </div>

      <h2 class="section-title">Reading List</h2>
      <div class="reading-list">
        <button v-for="item in READING_LIST" :key="item.url" class="reading-item" @click="emit('open-url', item.url)">
          <span class="reading-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="14.5" r="3.5"/><circle cx="17.5" cy="14.5" r="3.5"/><path d="M10 14.5h4"/><path d="M3 13.5 2 9.5"/><path d="M21 13.5 22 9.5"/></svg>
          </span>
          <span class="reading-text">
            <span class="reading-title">{{ item.title }}</span>
            <span class="reading-source">{{ item.source }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.start-page { flex: 1; overflow-y: auto; }
.start-inner { max-width: 720px; margin: 0 auto; padding: 32px 32px 48px; }
.section-title { font-size: 17px; font-weight: 700; margin: 24px 0 12px; }
.favorites-head { display: flex; align-items: center; gap: 10px; }
.favorites-head .section-title { margin-top: 0; }
.powered-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--hover);
  color: var(--text-dim);
  border: 0.5px solid var(--border);
  white-space: nowrap;
  margin-bottom: 12px;
}
.favorites-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 18px; }
.favorite {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: default;
  padding: 4px;
}
.fav-tile {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.12s ease;
}
.fav-icon { width: 30px; height: 30px; }
.fav-icon.invert { filter: brightness(0) invert(1); }
.fav-letter { font-size: 30px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }
.favorite:hover .fav-tile { transform: scale(1.06); }
.fav-name { font-size: 12px; }
.privacy-card, .reading-item {
  border: 0.5px solid var(--border);
  border-radius: 12px;
  background: var(--sidebar-bg);
}
.privacy-card { padding: 16px; }
.privacy-head { display: flex; align-items: center; gap: 12px; }
.privacy-shield { display: flex; flex-shrink: 0; color: var(--accent); }
.privacy-count { font-weight: 600; font-size: 14px; }
.privacy-sub { color: var(--text-dim); font-size: 12px; margin-top: 2px; }
.privacy-trackers { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.tracker-chip {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 20px;
  background: var(--hover);
  color: var(--text-dim);
  border: 0.5px solid var(--border);
}
.reading-list { display: flex; flex-direction: column; gap: 6px; }
.reading-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  color: var(--text);
  text-align: left;
  cursor: default;
}
.reading-item:hover { background: var(--hover); }
.reading-icon { display: flex; flex-shrink: 0; color: var(--text-dim); }
.reading-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.reading-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reading-source { font-size: 11px; color: var(--text-dim); }
</style>
