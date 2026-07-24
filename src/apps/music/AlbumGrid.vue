<script setup>
// Grid of album cards (real cover image over gradient + emoji, title, subtitle).
import { ref } from 'vue'

defineProps({
  albums: { type: Array, default: () => [] },
  sub: { type: String, default: 'artist' }, // 'artist' | 'year'
})
defineEmits(['open'])

// Covers that failed to load (offline): hide the img, keep gradient + emoji.
const failed = ref(new Set())
const onCoverError = (key) => { failed.value = new Set(failed.value).add(key) }
</script>

<template>
  <div class="grid">
    <div v-for="al in albums" :key="al.title" class="card" @click="$emit('open', al)">
      <div class="cover" :style="{ background: al.bg }">
        <span>{{ al.emoji }}</span>
        <img v-if="!failed.has(al.title)" class="cover-img" :src="al.cover" :alt="al.title"
          loading="lazy" draggable="false" @error="onCoverError(al.title)" />
      </div>
      <div class="c-title">{{ al.title }}</div>
      <div class="c-sub">{{ sub === 'year' ? al.year : al.artist }}</div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
}
.cover {
  aspect-ratio: 1;
  border-radius: 8px;
  border: 0.5px solid var(--border);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.15s ease;
}
.card:hover .cover {
  transform: scale(1.025);
}
.cover span {
  font-size: 46px;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
}
.cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.c-title {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
}
.c-title,
.c-sub {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.c-sub {
  font-size: 12px;
  color: var(--text-dim);
}
</style>
