<script setup>
// Play / pause transport glyph (inherits currentColor).
defineProps({ playing: { type: Boolean, default: false } })
</script>

<template>
  <svg v-if="playing" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1.2" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1.2" fill="currentColor"/></svg>
  <svg v-else viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
</template>
