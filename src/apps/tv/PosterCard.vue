<script setup>
defineProps({
  item: { type: Object, required: true },
  sub: { type: String, default: '' }, // e.g. "2025 · Thriller"
  owned: { type: Boolean, default: false },
})
defineEmits(['open'])
</script>

<template>
  <button class="poster-card" @click="$emit('open', item)">
    <span class="poster" :style="{ background: item.poster }">
      <span class="p-emoji">{{ item.emoji }}</span>
      <span v-if="item.live" class="live-badge">LIVE</span>
      <span v-if="owned" class="owned-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> In Library</span>
    </span>
    <span class="p-title">{{ item.title }}</span>
    <span class="p-sub">{{ sub || `${item.year} · ${item.genre}` }}</span>
  </button>
</template>

<style scoped>
.poster-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 0;
  min-width: 0;
  text-align: left;
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
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.poster-card:hover .poster {
  transform: scale(1.035);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
}
.p-emoji {
  font-size: 52px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
}
.live-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: #ff453a;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.6px;
  padding: 2px 7px;
  border-radius: 4px;
}
.owned-badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.owned-badge svg {
  width: 9px;
  height: 9px;
  display: block;
}
.p-title {
  font-size: 13px;
  font-weight: 600;
  color: #f5f5f7;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.p-sub {
  font-size: 11px;
  color: #98989d;
}
</style>
