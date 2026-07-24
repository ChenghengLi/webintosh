<script setup>
import { computed } from 'vue'

// Inline SVG glyph library for the Resolve UI chrome.
// All glyphs: 24 viewBox, currentColor, ~1.8px strokes, round caps.
const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 14 },
})

const F = 'fill="currentColor" stroke="none"'

const ICONS = {
  // media types
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M16 5v14"/><path d="M3 9.5h5M3 14.5h5M16 9.5h5M16 14.5h5"/>',
  reel: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6"/>'
    + `<circle cx="12" cy="6.6" r="1.15" ${F}/><circle cx="12" cy="17.4" r="1.15" ${F}/>`
    + `<circle cx="6.6" cy="12" r="1.15" ${F}/><circle cx="17.4" cy="12" r="1.15" ${F}/>`,
  wave: '<path d="M2.5 9c2.2-2.6 4.3-2.6 6.5 0s4.3 2.6 6.5 0 4.3-2.6 6.5 0"/>'
    + '<path d="M2.5 15.5c2.2-2.6 4.3-2.6 6.5 0s4.3 2.6 6.5 0 4.3-2.6 6.5 0"/>',
  city: '<path d="M3.5 20.5h17"/><path d="M5 20.5V9.5L9.5 7v13.5"/><path d="M9.5 20.5V4.5L15.5 7v13.5"/>'
    + '<path d="M15.5 20.5v-8l4 1.8v6.2"/><path d="M7 11h.01M7 14h.01M12.2 8.5h.01M12.2 12h.01M12.2 15.5h.01"/>',
  music: '<path d="M9.5 17.5V6.8l9-1.8v10"/><circle cx="7" cy="17.5" r="2.5"/><circle cx="16" cy="15" r="2.5"/>',
  waveform: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 10v4"/>',

  // audio / track headers
  speaker: `<path d="M4 9.5v5h3l4.5 3.8V5.7L7 9.5H4z" ${F}/>`
    + '<path d="M15 9.3a4 4 0 0 1 0 5.4"/><path d="M17.4 6.9a7.4 7.4 0 0 1 0 10.2"/>',
  'speaker-x': `<path d="M4 9.5v5h3l4.5 3.8V5.7L7 9.5H4z" ${F}/><path d="M15 9.8l5 5M20 9.8l-5 5"/>`,
  'lock-open': '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8.5 11V7.7a3.5 3.5 0 0 1 6.9-.9"/>'
    + `<circle cx="12" cy="15.5" r="1" ${F}/>`,
  'lock-closed': '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11"/>'
    + `<circle cx="12" cy="15.5" r="1" ${F}/>`,

  // tools / editing
  scissors: '<circle cx="6" cy="6.8" r="2.4"/><circle cx="6" cy="17.2" r="2.4"/><path d="M8.1 8.1L20 17M8.1 15.9L20 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  import: '<path d="M12 4v9.5"/><path d="M8.2 10.2L12 14l3.8-3.8"/><path d="M4.5 16v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V16"/>',
  export: '<path d="M12 13.5V4"/><path d="M8.2 7.8L12 4l3.8 3.8"/><path d="M4.5 16v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V16"/>',
  save: '<path d="M5 4.5h10.5L19 8v11.5H5v-15z"/><path d="M8.5 4.5V9h7V4.5"/><path d="M8 19.5v-6h8v6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash: '<path d="M4.5 6.5h15"/><path d="M9.5 6V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1"/>'
    + '<path d="M6.8 6.5l.9 13h8.6l.9-13"/><path d="M10.2 10.5v5.5M13.8 10.5v5.5"/>',
  ripple: '<path d="M9.5 8.5L6.5 12l3 3.5M14.5 8.5l3 3.5-3 3.5"/><path d="M3 12h2M19 12h2"/>',
  deselect: '<rect x="5" y="5" width="14" height="14" rx="2.5" stroke-dasharray="3.2 2.6"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/>',
  check: '<path d="M5 12.8l4.4 4.4L19 7.4"/>',

  // transport
  stop: `<rect x="6.5" y="6.5" width="11" height="11" rx="1.5" ${F}/>`,
  play: `<path d="M8 5.4v13.2L19 12 8 5.4z" ${F}/>`,
  pause: '<path d="M8.2 5.5v13M15.8 5.5v13" stroke-width="2.6"/>',
  'step-back': `<path d="M16.5 6.2v11.6L8.5 12l8-5.8z" ${F}/>`,
  'step-forward': `<path d="M7.5 6.2v11.6L15.5 12l-8-5.8z" ${F}/>`,
  'skip-start': `<path d="M6 5.5v13" stroke-width="2.2"/><path d="M18.5 6.2v11.6L10 12l8.5-5.8z" ${F}/>`,
  'skip-end': `<path d="M18 5.5v13" stroke-width="2.2"/><path d="M5.5 6.2v11.6L14 12 5.5 6.2z" ${F}/>`,
  loop: '<path d="M17.5 2.8l3 3-3 3"/><path d="M20 5.8H8.5a4 4 0 0 0-4 4v1.4"/>'
    + '<path d="M6.5 21.2l-3-3 3-3"/><path d="M4 18.2h11.5a4 4 0 0 0 4-4v-1.4"/>',

  // toolbar
  select: `<path d="M6 3.6l12.6 8.3-7 .9-2.9 6.6L6 3.6z" ${F}/>`,
  'zoom-in': '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8L20.5 20.5"/><path d="M8.6 11h4.8M11 8.6v4.8"/>',
  'zoom-out': '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8L20.5 20.5"/><path d="M8.6 11h4.8"/>',

  // page tabs
  'page-media': '<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.2h7.5A1.5 1.5 0 0 1 20 9.2V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3.5 18V7z"/>',
  'page-cut': '<path d="M4 8.5h16l-1.6 7H5.6L4 8.5z"/><path d="M8.6 12h6.8"/>',
  'page-edit': '<rect x="3.5" y="4.8" width="17" height="5.6" rx="1.2"/><rect x="3.5" y="13.6" width="10.5" height="5.6" rx="1.2"/>'
    + `<path d="M17.4 14.2v4.4l3.4-2.2-3.4-2.2z" ${F}/>`,
  'page-fusion': '<path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8-4.8-1.7 4.8-1.7L12 3.5z"/>'
    + '<path d="M18.6 15.6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
  'page-color': '<circle cx="12" cy="12" r="8.5"/>'
    + `<circle cx="9" cy="9.8" r="1.15" ${F}/><circle cx="15" cy="9.8" r="1.15" ${F}/><circle cx="12" cy="15.2" r="1.15" ${F}/>`,
  'page-fairlight': '<path d="M6 4v16M12 4v16M18 4v16"/>'
    + `<rect x="4.3" y="8" width="3.4" height="3" rx="1" ${F}/>`
    + `<rect x="10.3" y="13" width="3.4" height="3" rx="1" ${F}/>`
    + `<rect x="16.3" y="6.5" width="3.4" height="3" rx="1" ${F}/>`,
  'page-deliver': '<path d="M12 3c3.3 1.6 5 4.9 5 8.6l-2.3 2.9H9.3L7 11.6C7 7.9 8.7 4.6 12 3z"/>'
    + '<circle cx="12" cy="9.3" r="1.7"/><path d="M9.3 14.5L7.5 19l2.7-.9M14.7 14.5L16.5 19l-2.7-.9"/><path d="M12 14.5v4.2"/>',
}

const body = computed(() => ICONS[props.name] || ICONS.film)
</script>

<template>
  <svg
    class="r-icon" :width="size" :height="size" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" v-html="body"
  />
</template>

<style scoped>
.r-icon {
  display: block;
  flex: none;
}
</style>
