<script setup>
// Colored map-pin markers with a white inner glyph — replaces the old
// emoji icons in the sidebar (favorites / nearby) and place metadata.
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: 'pin' },
})

const COLORS = {
  home: '#ff9f0a',
  work: '#0a84ff',
  coffee: '#a2845e',
  park: '#34c759',
  forest: '#2fbf71',
  ferry: '#5ac8fa',
  wharf: '#8e8e93',
  cityhall: '#c8a24b',
  shopping: '#ff375f',
  tower: '#af52de',
  skyscraper: '#5e5ce6',
  houses: '#ff6482',
  stadium: '#40c8e0',
  bridge: '#ff6b22',
  museum: '#c86edf',
  peak: '#636366',
  mission: '#96705a',
  pin: '#ff3b30',
}

const GLYPHS = new Set([
  'home', 'work', 'coffee', 'park', 'forest',
  'ferry', 'wharf', 'cityhall', 'shopping', 'tower',
  'skyscraper', 'houses', 'stadium', 'bridge', 'museum', 'peak', 'mission',
])

const color = computed(() => COLORS[props.name] || COLORS.pin)
const hasGlyph = computed(() => GLYPHS.has(props.name))
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <!-- pin teardrop -->
    <path
      d="M12 2.6c-3.9 0-7 3.1-7 7 0 5.3 7 11.8 7 11.8s7-6.5 7-11.8c0-3.9-3.1-7-7-7z"
      :fill="color"
    />
    <!-- white inner glyph -->
    <g v-if="hasGlyph" stroke="#fff" stroke-width="1.5" fill="none">
      <template v-if="name === 'home'">
        <path d="M8.3 10.3 12 6.8l3.7 3.5" />
        <path d="M9.3 9.7v3.5h5.4V9.7" />
      </template>
      <template v-else-if="name === 'work'">
        <rect x="8.4" y="8.1" width="7.2" height="5" rx="1" />
        <path d="M10.2 8.1v-.9a1.5 1.5 0 0 1 3.6 0v.9" />
        <path d="M8.4 10.3h7.2" />
      </template>
      <template v-else-if="name === 'coffee'">
        <path d="M8.8 7.5h5.4v3.1a2 2 0 0 1-5.4 0z" />
        <path d="M14.2 8.1h.9a1.3 1.3 0 0 1 0 2.6h-.9" />
        <path d="M8.5 13.3h7" />
      </template>
      <template v-else-if="name === 'park'">
        <circle cx="12" cy="8.1" r="2.6" />
        <path d="M12 10.7v2.7" />
      </template>
      <template v-else-if="name === 'forest'">
        <path d="M12 5.7 8.9 9.4h1.5l-2.2 2.9h7.6l-2.2-2.9h1.5z" />
        <path d="M12 12.3v1.8" />
      </template>
      <template v-else-if="name === 'ferry'">
        <path d="M7.9 10.3h8.2l-1.2 2.4H9.1z" />
        <path d="M9.8 10.3V8h4.4v2.3" />
        <path d="M12 8V6.6" />
      </template>
      <template v-else-if="name === 'wharf'">
        <circle cx="12" cy="6.9" r="1.1" />
        <path d="M12 8v5.4" />
        <path d="M9.5 9.5h5" />
        <path d="M8.6 10.8c0 1.9 1.3 2.9 3.4 2.9s3.4-1 3.4-2.9" />
      </template>
      <template v-else-if="name === 'cityhall'">
        <path d="M8 8.1 12 6l4 2.1" />
        <path d="M8.6 8.1h6.8" />
        <path d="M9.2 9.2v3M12 9.2v3M14.8 9.2v3" />
        <path d="M8.2 13.2h7.6" />
      </template>
      <template v-else-if="name === 'shopping'">
        <path d="M8.7 8.1h6.6l-.5 5.1H9.2z" />
        <path d="M10.2 8.1v-.6a1.8 1.8 0 0 1 3.6 0v.6" />
      </template>
      <template v-else-if="name === 'tower'">
        <path d="M9.7 13.2V8.2a2.3 2.3 0 0 1 4.6 0v5" />
        <path d="M12 10.2v3" />
        <path d="M8.5 13.2h7" />
      </template>
      <template v-else-if="name === 'skyscraper'">
        <path d="M9.6 13.2V6h4.8v7.2" />
        <path d="M8.4 13.2h7.2" />
        <path d="M10.8 7.8h.6M12.6 7.8h.6M10.8 9.8h.6M12.6 9.8h.6M10.8 11.8h.6M12.6 11.8h.6" />
      </template>
      <template v-else-if="name === 'houses'">
        <path d="M7.6 10.6 9.8 8.4l2.2 2.2" />
        <path d="M8.3 10.1v3h3v-3" />
        <path d="M11.9 11.1 14.2 8.8l2.2 2.3" />
        <path d="M12.6 10.6v2.5h3v-2.5" />
      </template>
      <template v-else-if="name === 'stadium'">
        <ellipse cx="12" cy="9.9" rx="4.1" ry="2.7" />
        <ellipse cx="12" cy="9.9" rx="1.5" ry="0.9" />
      </template>
      <template v-else-if="name === 'bridge'">
        <path d="M7.4 12.6h9.2" />
        <path d="M9.3 12.6V8.4M14.7 12.6V8.4" />
        <path d="M7.4 10.4c2.2-1.9 7-1.9 9.2 0" />
      </template>
      <template v-else-if="name === 'museum'">
        <path d="M8.6 13.2v-2.6a3.4 3.4 0 0 1 6.8 0v2.6" />
        <path d="M8 13.2h8" />
        <path d="M12 7.2V6.2" />
      </template>
      <template v-else-if="name === 'peak'">
        <path d="M7.8 13.2 10.6 8.2l1.7 2.5 1.6-2.5 2.6 5" />
      </template>
      <template v-else-if="name === 'mission'">
        <path d="M8.9 13.2V9.6L12 7l3.1 2.6v3.6" />
        <path d="M12 5.2v1.8M11.1 6.1h1.8" />
        <path d="M8.2 13.2h7.6" />
      </template>
    </g>
    <!-- plain pin: white hole -->
    <circle v-else cx="12" cy="9.6" r="2.4" fill="#fff" />
  </svg>
</template>
