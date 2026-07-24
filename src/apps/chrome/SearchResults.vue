<script setup>
// Google-style search results (data: live Wikipedia opensearch hits).
// Blue title link, green URL line, gray snippet — like google.com results.
defineProps({
  q: { type: String, default: '' },
  results: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])

function resultUrl(title) {
  return 'en.wikipedia.org › wiki › ' + title.replace(/ /g, '_')
}
</script>

<template>
  <div class="results">
    <div class="results-inner">
      <div class="stats" v-if="!loading">
        About {{ results.length }} results (Wikipedia) for “{{ q }}”
      </div>

      <div v-if="loading" class="loading">
        <span class="spin"></span> Searching…
      </div>

      <template v-else>
        <div v-if="!results.length" class="empty">
          No results found for <b>{{ q }}</b>. Try different keywords.
        </div>
        <div
          v-for="r in results"
          :key="r.title"
          class="result"
          @click="emit('open', r.title)"
        >
          <div class="r-url">
            <span class="r-favicon">W</span>
            <span>{{ resultUrl(r.title) }}</span>
          </div>
          <div class="r-title">{{ r.title }}</div>
          <div class="r-snippet">{{ r.snippet || 'Wikipedia article' }}…</div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.results { flex: 1; overflow-y: auto; background: var(--cx-content); }
.results-inner { max-width: 680px; padding: 20px 32px 80px; margin: 0 auto; }

.stats { font-size: 12.5px; color: var(--cx-dim); margin-bottom: 20px; }

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 0;
  color: var(--cx-dim);
  font-size: 13.5px;
}
.spin {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--cx-border);
  border-top-color: var(--cx-blue);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty { font-size: 14px; color: var(--cx-text); padding: 24px 0; }

.result { margin-bottom: 26px; cursor: default; }
.r-url {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--cx-green);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.r-favicon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--cx-omni);
  border: 1px solid var(--cx-border);
  color: var(--cx-dim);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.r-title {
  font-size: 19px;
  line-height: 1.3;
  color: var(--cx-link);
  font-family: Arial, -apple-system, sans-serif;
}
.result:hover .r-title { text-decoration: underline; }
.r-snippet {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--cx-dim);
  margin-top: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
