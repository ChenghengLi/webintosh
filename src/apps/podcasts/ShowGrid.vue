<script setup>
// Grid of show cards: real cover image over gradient + emoji, title, author.
import { ref } from 'vue'

defineProps({
  shows: { type: Array, default: () => [] },
})
const emit = defineEmits(['open'])

// Covers that failed to load (offline): hide the img, keep gradient + emoji.
const failed = ref(new Set())
const onCoverError = (key) => { failed.value = new Set(failed.value).add(key) }
</script>

<template>
  <div class="grid">
    <div v-for="s in shows" :key="s.id" class="card" @click="emit('open', s)">
      <div class="cover" :style="{ background: s.bg }">
        <span>{{ s.emoji }}</span>
        <img v-if="!failed.has(s.id)" class="cover-img" :src="s.cover" :alt="s.title"
          loading="lazy" draggable="false" @error="onCoverError(s.id)" />
      </div>
      <div class="title">{{ s.title }}</div>
      <div class="author">{{ s.author }}</div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 18px 14px;
}
.card {
  cursor: default;
  min-width: 0;
}
.cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  border: 0.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
  position: relative;
  overflow: hidden;
  transition: transform 0.15s;
}
.card:hover .cover {
  transform: scale(1.03);
}
.cover span {
  font-size: 44px;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.25));
}
.cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.title {
  font-size: 12px;
  font-weight: 600;
  margin-top: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.author {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
