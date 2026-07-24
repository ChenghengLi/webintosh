<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, default: '❓' },
  iconBg: { type: String, default: 'linear-gradient(160deg,#8e9eab,#616161)' },
  size: { type: Number, default: 52 },
  pad: { type: Boolean, default: false }, // render icon inside a squircle (for flat SVG logos)
  scale: { type: Number, default: 1 }, // extra glyph shrink factor for logos that fill their viewBox
})

const isImg = computed(() => props.icon.startsWith('/'))
const isLiveCal = computed(() => props.icon === 'live:calendar')

// PNG icons carry ~14% transparent padding; draw CSS tiles at the same visual size
const tile = computed(() => Math.round(props.size * 0.88))

const now = new Date()
const weekday = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
const day = now.getDate()
</script>

<template>
  <span
    v-if="isImg && pad"
    class="app-icon-squircle"
    :style="{ width: tile + 'px', height: tile + 'px', borderRadius: tile * 0.24 + 'px', background: iconBg }"
  >
    <img class="glyph-white" :src="icon" :width="tile * 0.64 * scale" :height="tile * 0.64 * scale" alt="" draggable="false" />
  </span>
  <img
    v-else-if="isImg"
    class="app-icon-img"
    :src="icon"
    :width="size"
    :height="size"
    alt=""
    draggable="false"
  />
  <span
    v-else-if="isLiveCal"
    class="app-icon-cal"
    :style="{ width: tile + 'px', height: tile + 'px', borderRadius: tile * 0.24 + 'px' }"
  >
    <span class="cal-wd" :style="{ fontSize: Math.max(6, tile * 0.17) + 'px' }">{{ weekday }}</span>
    <span class="cal-day" :style="{ fontSize: tile * 0.52 + 'px' }">{{ day }}</span>
  </span>
  <span
    v-else
    class="app-icon-emoji"
    :style="{
      width: tile + 'px',
      height: tile + 'px',
      borderRadius: tile * 0.24 + 'px',
      fontSize: tile * 0.58 + 'px',
      background: iconBg,
    }"
    >{{ icon }}</span
  >
</template>

<style scoped>
.app-icon-img {
  display: block;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.2));
}
.app-icon-squircle {
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.25), 0 2px 5px rgba(0, 0, 0, 0.2);
}
.app-icon-squircle .glyph-white {
  filter: brightness(0) invert(1);
}
.app-icon-cal {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #ffffff, #f2f2f7);
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 2px 5px rgba(0, 0, 0, 0.2);
  line-height: 1;
}
.cal-wd {
  color: #ff3b30;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-bottom: 2%;
}
.cal-day {
  color: #1d1d1f;
  font-weight: 300;
}
.app-icon-emoji {
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.25), 0 4px 10px rgba(0, 0, 0, 0.18);
}
</style>
