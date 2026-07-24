<script setup>
defineProps({
  book: { type: Object, required: true },
})
</script>

<template>
  <div class="cover" :class="book.font" :style="{ background: book.bg }">
    <div class="spine"></div>
    <div class="emoji">{{ book.emoji }}</div>
    <div class="title">{{ book.title }}</div>
    <div class="rule"></div>
    <div class="cauthor">{{ book.author }}</div>
  </div>
</template>

<style scoped>
.cover {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 5px 8px 8px 5px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28), inset 0 0 0 0.5px rgba(255, 255, 255, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14% 12% 12% 18%;
  box-sizing: border-box;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.96);
  text-align: center;
}
.spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 7%;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.08) 55%, rgba(255, 255, 255, 0.1));
  border-right: 0.5px solid rgba(0, 0, 0, 0.22);
}
.emoji {
  font-size: 30px;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3));
}
.title {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.serif .title {
  font-family: 'New York', ui-serif, Georgia, 'Times New Roman', serif;
  letter-spacing: 0.03em;
}
.sans .title {
  text-transform: uppercase;
  letter-spacing: 0.09em;
  font-size: 11.5px;
}
.rule {
  width: 26px;
  height: 1px;
  background: rgba(255, 255, 255, 0.55);
}
.cauthor {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.serif .cauthor {
  font-family: 'New York', ui-serif, Georgia, serif;
}
</style>
