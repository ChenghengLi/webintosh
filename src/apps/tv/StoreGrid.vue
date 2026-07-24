<script setup>
defineProps({
  items: { type: Array, required: true },
  owned: { type: Array, default: () => [] }, // owned title ids
})
const emit = defineEmits(['open', 'buy'])
const isOwned = (id, owned) => owned.includes(id)
</script>

<template>
  <div class="store-grid">
    <div v-for="t in items" :key="t.id" class="store-card" @click="emit('open', t)">
      <span class="poster" :style="{ background: t.poster }">
        <span class="s-emoji">{{ t.emoji }}</span>
      </span>
      <span class="s-title">{{ t.title }}</span>
      <button v-if="isOwned(t.id, owned)" class="buy-btn owned" @click.stop><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Owned</button>
      <button v-else class="buy-btn" @click.stop="emit('buy', t)">
        {{ t.price ? `$${t.price.toFixed(2)}` : 'Free' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.store-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 18px 14px;
}
.store-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}
.poster {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 10px;
  border: 0.5px solid rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  transition: transform 0.15s ease;
}
.store-card:hover .poster {
  transform: scale(1.035);
}
.s-emoji {
  font-size: 52px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
}
.s-title {
  font-size: 13px;
  font-weight: 600;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.buy-btn {
  background: rgba(255, 255, 255, 0.14);
  color: #2997ff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 16px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.buy-btn svg {
  width: 11px;
  height: 11px;
  display: block;
}
.buy-btn:hover {
  background: rgba(255, 255, 255, 0.22);
}
.buy-btn.owned {
  color: #30d158;
}
</style>
