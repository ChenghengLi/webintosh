<script setup>
// Speaker glyph with level waves / mute cross, driven by the system volume (0-100).
defineProps({ volume: { type: Number, default: 50 } })
</script>

<template>
  <svg viewBox="0 0 24 24">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>
    <template v-if="volume === 0">
      <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </template>
    <template v-else>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path v-if="volume >= 50" d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </template>
  </svg>
</template>
