<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 14 },
})

// SF-Symbols-style glyphs, hand-drawn on a 16x16 grid (stroke = currentColor)
const GLYPHS = {
  gear: '<circle cx="8" cy="8" r="2.1"/><path d="M8 1.6v2.1M8 12.3v2.1M1.6 8h2.1M12.3 8h2.1M3.5 3.5 5 5M11 11l1.5 1.5M12.5 3.5 11 5M5 11l-1.5 1.5"/>',
  wifi: '<path d="M2.3 6.3a8.2 8.2 0 0 1 11.4 0"/><path d="M4.6 9a5.4 5.4 0 0 1 6.8 0"/><path d="M6.9 11.6a2.6 2.6 0 0 1 2.2 0"/><circle cx="8" cy="13.4" r="1" fill="currentColor" stroke="none"/>',
  bluetooth: '<path d="M4 5l8 6-4 3V2l4 3-8 6"/>',
  globe: '<circle cx="8" cy="8" r="6"/><path d="M2 8h12"/><path d="M8 2c-3.2 3.4-3.2 8.6 0 12M8 2c3.2 3.4 3.2 8.6 0 12"/>',
  appearance:
    '<circle cx="8" cy="8" r="6"/><path d="M8 2a6 6 0 0 1 0 12V2z" fill="currentColor" stroke="none"/>',
  photo: '<rect x="2" y="3" width="12" height="10" rx="2"/><circle cx="5.6" cy="6.4" r="1.1"/><path d="M2.5 11.5 6 8l2.6 2.6 1.8-1.8 3.1 3.1"/>',
  bell: '<path d="M8 2.3a4.3 4.3 0 0 1 4.3 4.3c0 2.9 1 3.9 1.5 4.4H2.2c.5-.5 1.5-1.5 1.5-4.4A4.3 4.3 0 0 1 8 2.3z"/><path d="M6.4 13.2a1.6 1.6 0 0 0 3.2 0"/>',
  moon: '<path d="M13.6 9.8A6.2 6.2 0 0 1 6.2 2.4a6.2 6.2 0 1 0 7.4 7.4z"/>',
  speaker:
    '<path d="M2.8 6v4h2.7L9 13V3L5.5 6H2.8z"/><path d="M11 5.6a3.4 3.4 0 0 1 0 4.8M12.9 3.7a6.2 6.2 0 0 1 0 8.6"/>',
  speakerLow: '<path d="M2.8 6v4h2.7L9 13V3L5.5 6H2.8z"/>',
  display: '<rect x="2" y="3" width="12" height="8" rx="1.5"/><path d="M6 13.5h4M8 11v2.5"/>',
  macbook: '<rect x="2.6" y="3.2" width="10.8" height="7.4" rx="1.1"/><path d="M1.2 12.6h13.6"/>',
  controlCenter:
    '<rect x="2" y="2.8" width="12" height="4.6" rx="2.3"/><circle cx="11.2" cy="5.1" r="1.3" fill="currentColor" stroke="none"/><rect x="2" y="8.6" width="12" height="4.6" rx="2.3"/><circle cx="4.8" cy="10.9" r="1.3" fill="currentColor" stroke="none"/>',
  lock: '<rect x="3.5" y="7" width="9" height="6.8" rx="1.6"/><path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7"/><circle cx="8" cy="10.3" r="1" fill="currentColor" stroke="none"/>',
  person: '<circle cx="8" cy="5" r="2.5"/><path d="M3 13.5c.6-3 2.6-4.4 5-4.4s4.4 1.4 5 4.4"/>',
  personFill:
    '<circle cx="8" cy="5.4" r="3" fill="currentColor" stroke="none"/><path d="M2.4 14c.8-3.5 3-5 5.6-5s4.8 1.5 5.6 5z" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.4 1.6"/>',
  info: '<circle cx="8" cy="8" r="6"/><path d="M8 7.4V11"/><circle cx="8" cy="5" r="1" fill="currentColor" stroke="none"/>',
  search: '<circle cx="7" cy="7" r="4.4"/><path d="M10.4 10.4 14 14"/>',
  chevronRight: '<path d="M6 3.5 10.5 8 6 12.5"/>',
  chevronLeft: '<path d="M10 3.5 5.5 8l4.5 4.5"/>',
  check: '<path d="M3 8.5 6.5 12 13 4.5"/>',
  drive: '<rect x="2" y="5" width="12" height="6.6" rx="1.5"/><circle cx="11.4" cy="8.3" r="0.9" fill="currentColor" stroke="none"/>',
  airdrop:
    '<path d="M3.8 8.6a5.8 5.8 0 0 1 8.4 0M5.8 10.8a3 3 0 0 1 4.4 0"/><circle cx="8" cy="12.8" r="1" fill="currentColor" stroke="none"/><path d="M8 2.4v1.6"/>',
  update: '<path d="M13.6 8A5.6 5.6 0 1 1 12 4.2"/><path d="M13.7 2.3v2.2h-2.2"/>',
  headphones:
    '<path d="M3.2 10.2V8.4a4.8 4.8 0 0 1 9.6 0v1.8"/><rect x="2.4" y="9.8" width="2.6" height="4" rx="1.3"/><rect x="11" y="9.8" width="2.6" height="4" rx="1.3"/>',
  mouse: '<rect x="5" y="2" width="6" height="12" rx="3"/><path d="M8 4.6v2.4"/>',
  keyboard:
    '<rect x="1.6" y="4.6" width="12.8" height="6.8" rx="1.4"/><path d="M4 7h1M7.5 7h1M11 7h1M4.2 9.4h7.6"/>',
  sun: '<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.9M8 12.6v1.9M1.5 8h1.9M12.6 8h1.9M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/>',
}

const body = computed(() => GLYPHS[props.name] || GLYPHS.info)
</script>

<template>
  <svg
    class="glyph"
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="body"
  ></svg>
</template>

<style scoped>
.glyph {
  display: block;
  flex: none;
}
</style>
