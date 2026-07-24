<script setup>
// Chrome new-tab page: classic Google homepage — colorful wordmark, big
// rounded search box, "Google Search" / "I'm Feeling Lucky" buttons and
// shortcut tiles. Theme colors come from --cx-* vars set on the app root.
import { ref } from 'vue'

const emit = defineEmits(['search', 'lucky', 'open-url'])

const q = ref('')

const shortcuts = [
  { name: 'Google', url: 'google.com', icon: '/icons/brands/google.svg', bg: '#4285f4' },
  { name: 'YouTube', url: 'youtube.com', icon: '/icons/brands/youtube.svg', bg: '#ff0000' },
  { name: 'GitHub', url: 'github.com', icon: '/icons/brands/github.svg', bg: '#24292f' },
  { name: 'Wikipedia', url: 'en.wikipedia.org', icon: '/icons/brands/wikipedia.svg', bg: '#6b6d70' },
]

function submit() {
  if (q.value.trim()) emit('search', q.value.trim())
}
function lucky() {
  if (q.value.trim()) emit('lucky', q.value.trim())
}
</script>

<template>
  <div class="ntp" @keydown.enter.stop>
    <div class="ntp-inner">
      <div class="logo" aria-label="Google">
        <span style="color:#4285f4">G</span><span style="color:#ea4335">o</span><span style="color:#fbbc05">o</span><span style="color:#4285f4">g</span><span style="color:#34a853">l</span><span style="color:#ea4335">e</span>
      </div>

      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16"><circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m11 11 3.4 3.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <input
          v-model="q"
          class="search-input"
          placeholder="Search Google or type a URL"
          spellcheck="false"
          autofocus
          @keydown.enter="submit"
        />
      </div>

      <div class="buttons">
        <button class="g-btn" @click="submit">Google Search</button>
        <button class="g-btn" @click="lucky">I'm Feeling Lucky</button>
      </div>

      <div class="tiles">
        <button v-for="s in shortcuts" :key="s.name" class="tile" @click="emit('open-url', s.url)">
          <span class="tile-icon" :style="{ background: s.bg }">
            <img class="tile-glyph" :src="s.icon" :alt="s.name" draggable="false" />
          </span>
          <span class="tile-name">{{ s.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ntp {
  flex: 1;
  overflow-y: auto;
  background: var(--cx-content);
  display: flex;
  justify-content: center;
}
.ntp-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96px 24px 64px;
  width: 100%;
  max-width: 640px;
}

.logo {
  font-size: 72px;
  font-weight: 500;
  letter-spacing: -4px;
  line-height: 1;
  margin-bottom: 28px;
  user-select: none;
  font-family: 'Product Sans', Arial, -apple-system, sans-serif;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 560px;
  height: 44px;
  padding: 0 16px;
  border-radius: 22px;
  background: var(--cx-omni);
  border: 1px solid var(--cx-border);
  transition: box-shadow 0.15s;
}
.search-box:hover, .search-box:focus-within {
  background: var(--cx-omni-focus);
  box-shadow: 0 1px 6px rgba(32, 33, 36, 0.28);
}
.search-icon { color: var(--cx-dim); flex-shrink: 0; }
.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--cx-text);
  font-size: 15px;
}
.search-input::placeholder { color: var(--cx-dim); }

.buttons { display: flex; gap: 12px; margin-top: 26px; }
.g-btn {
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--cx-omni);
  color: var(--cx-text);
  font-size: 13.5px;
  padding: 8px 16px;
  cursor: default;
}
.g-btn:hover {
  border-color: var(--cx-border);
  box-shadow: 0 1px 2px rgba(32, 33, 36, 0.18);
}

.tiles { display: flex; gap: 10px; margin-top: 56px; }
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 84px;
  padding: 14px 4px 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: default;
}
.tile:hover { background: var(--cx-hover); }
.tile-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tile-glyph {
  width: 26px;
  height: 26px;
  /* brand glyphs are dark/colored fills — force them white on the colored squircle */
  filter: brightness(0) invert(1);
}
.tile-name { font-size: 12px; color: var(--cx-text); }
</style>
