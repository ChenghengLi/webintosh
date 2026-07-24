<script setup>
// Native-looking Wikipedia search results page (search-engine style rows).
import { articleUrl } from './wiki'

defineProps({
  q: { type: String, default: '' },
  results: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])
</script>

<template>
  <div class="results-page">
    <div class="results-inner">
      <div class="results-head">
        <span class="head-wiki">Wikipedia</span> results for “{{ q }}”
      </div>

      <div v-if="loading" class="results-status">
        <span class="spin"></span> Searching Wikipedia…
      </div>

      <template v-else>
        <button v-for="r in results" :key="r.title" class="result" @click="emit('open', r.title)">
          <span class="r-title">{{ r.title }}</span>
          <span class="r-url">{{ articleUrl(r.title) }}</span>
          <span v-if="r.snippet" class="r-snippet">{{ r.snippet }}</span>
        </button>
        <div v-if="!results.length" class="results-status">
          No Wikipedia articles match “{{ q }}”.
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.results-page { flex: 1; overflow-y: auto; background: var(--window-bg); }
.results-inner { max-width: 680px; margin: 0 auto; padding: 28px 32px 56px; display: flex; flex-direction: column; }
.results-head {
  font-size: 13px;
  color: var(--text-dim);
  padding-bottom: 12px;
  border-bottom: 0.5px solid var(--border);
  margin-bottom: 8px;
}
.head-wiki { font-weight: 700; color: var(--text); font-family: Georgia, 'Times New Roman', serif; }
.results-status { display: flex; align-items: center; gap: 8px; color: var(--text-dim); font-size: 13px; padding: 28px 0; }
.spin {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.result {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  border: none;
  background: transparent;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: default;
}
.result:hover { background: var(--hover); }
.r-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.3;
}
.result:hover .r-title { text-decoration: underline; }
.r-url { font-size: 12px; color: #2f9e44; }
.r-snippet {
  font-size: 13px;
  color: var(--text-dim);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
