<script setup>
// Inline SVG weather glyphs — replaces the old emoji icons.
// Condition glyphs use app-appropriate colors (yellow sun, white cloud,
// blue rain); chrome glyphs (calendar, wind, drop, ...) use currentColor.
defineProps({
  name: { type: String, default: 'sun' },
})

// Feather-style cloud outline, reused (transformed) by the cloudy glyphs.
const CLOUD = 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z'
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <!-- sun with rays -->
    <g v-if="name === 'sun'" stroke="#ffd60a" stroke-width="1.8">
      <circle cx="12" cy="12" r="4.2" />
      <line x1="12" y1="3" x2="12" y2="5.4" />
      <line x1="12" y1="18.6" x2="12" y2="21" />
      <line x1="3" y1="12" x2="5.4" y2="12" />
      <line x1="18.6" y1="12" x2="21" y2="12" />
      <line x1="5.6" y1="5.6" x2="7.3" y2="7.3" />
      <line x1="16.7" y1="16.7" x2="18.4" y2="18.4" />
      <line x1="18.4" y1="5.6" x2="16.7" y2="7.3" />
      <line x1="7.3" y1="16.7" x2="5.6" y2="18.4" />
    </g>

    <!-- sun + cloud -->
    <template v-else-if="name === 'partly'">
      <g stroke="#ffd60a" stroke-width="1.7">
        <circle cx="8.2" cy="8.2" r="3" />
        <line x1="8.2" y1="2.4" x2="8.2" y2="3.9" />
        <line x1="2.4" y1="8.2" x2="3.9" y2="8.2" />
        <line x1="4.1" y1="4.1" x2="5.2" y2="5.2" />
        <line x1="12.3" y1="4.1" x2="11.2" y2="5.2" />
        <line x1="4.1" y1="12.3" x2="5.2" y2="11.2" />
      </g>
      <path :d="CLOUD" transform="translate(3.5 5) scale(0.72)" fill="#f5f5f7" stroke="#f5f5f7" stroke-width="1.9" />
    </template>

    <!-- moon crescent -->
    <path
      v-else-if="name === 'moon'"
      d="M20.2 14.4A8.4 8.4 0 1 1 9.6 3.8a6.8 6.8 0 0 0 10.6 10.6z"
      stroke="#f5f5f7"
      stroke-width="1.8"
    />

    <!-- cloud with rain lines -->
    <template v-else-if="name === 'rain'">
      <path :d="CLOUD" transform="translate(0 -2.4)" fill="#f5f5f7" stroke="#f5f5f7" stroke-width="1.4" />
      <g stroke="#5ac8fa" stroke-width="1.9">
        <line x1="8" y1="18.6" x2="6.9" y2="21" />
        <line x1="12.6" y1="18.6" x2="11.5" y2="21" />
        <line x1="17.2" y1="18.6" x2="16.1" y2="21" />
      </g>
    </template>

    <!-- cloud with lightning -->
    <template v-else-if="name === 'storm'">
      <path :d="CLOUD" transform="translate(0 -2.4)" fill="#f5f5f7" stroke="#f5f5f7" stroke-width="1.4" />
      <path
        d="M13.2 16.6 9.9 20.9h2.5l-1 3 4.5-5.1h-2.5l1.3-2.2z"
        fill="#ffd60a"
        stroke="#ffd60a"
        stroke-width="1"
      />
    </template>

    <!-- sun + cloud + rain -->
    <template v-else-if="name === 'sunshower'">
      <g stroke="#ffd60a" stroke-width="1.6">
        <circle cx="7.6" cy="7.6" r="2.5" />
        <line x1="7.6" y1="2.6" x2="7.6" y2="3.9" />
        <line x1="2.6" y1="7.6" x2="3.9" y2="7.6" />
        <line x1="4.1" y1="4.1" x2="5" y2="5" />
        <line x1="11.1" y1="4.1" x2="10.2" y2="5" />
      </g>
      <path :d="CLOUD" transform="translate(4 4.6) scale(0.66)" fill="#f5f5f7" stroke="#f5f5f7" stroke-width="2" />
      <g stroke="#5ac8fa" stroke-width="1.7">
        <line x1="9.6" y1="19" x2="8.8" y2="20.9" />
        <line x1="13.8" y1="19" x2="13" y2="20.9" />
        <line x1="18" y1="19" x2="17.2" y2="20.9" />
      </g>
    </template>

    <!-- plain cloud (also the fallback for unknown names) -->
    <path
      v-else-if="name === 'cloud'"
      :d="CLOUD"
      fill="#f5f5f7"
      stroke="#f5f5f7"
      stroke-width="1.4"
    />

    <!-- card-title chrome glyphs (currentColor) -->
    <g v-else-if="name === 'calendar'" stroke="currentColor" stroke-width="1.8">
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="8.5" y1="3" x2="8.5" y2="7" />
      <line x1="15.5" y1="3" x2="15.5" y2="7" />
    </g>

    <g v-else-if="name === 'wind'" stroke="currentColor" stroke-width="1.8">
      <path d="M3.5 8.2h9.5a2.6 2.6 0 1 0-2.6-2.6" />
      <path d="M3.5 12.4h13.5a2.6 2.6 0 1 1-2.6 2.6" />
      <path d="M3.5 16.6h7.5a2.2 2.2 0 1 1-2.2 2.2" />
    </g>

    <path
      v-else-if="name === 'drop'"
      d="M12 3.6s6 6.3 6 10.1a6 6 0 0 1-12 0C6 9.9 12 3.6 12 3.6z"
      stroke="currentColor"
      stroke-width="1.8"
    />

    <g v-else-if="name === 'sunrise'" stroke="currentColor" stroke-width="1.8">
      <line x1="12" y1="8.6" x2="12" y2="3.4" />
      <polyline points="8.9,6.5 12,3.4 15.1,6.5" />
      <path d="M7.6 17.4a4.4 4.4 0 0 1 8.8 0" />
      <line x1="3.4" y1="17.4" x2="20.6" y2="17.4" />
      <line x1="7" y1="20.6" x2="17" y2="20.6" />
    </g>

    <g v-else-if="name === 'sunset'" stroke="currentColor" stroke-width="1.8">
      <line x1="12" y1="3.4" x2="12" y2="8.6" />
      <polyline points="8.9,5.5 12,8.6 15.1,5.5" />
      <path d="M7.6 17.4a4.4 4.4 0 0 1 8.8 0" />
      <line x1="3.4" y1="17.4" x2="20.6" y2="17.4" />
      <line x1="7" y1="20.6" x2="17" y2="20.6" />
    </g>

    <g v-else-if="name === 'thermometer'" stroke="currentColor" stroke-width="1.8">
      <path d="M14 13.8V4.2a2 2 0 0 0-4 0v9.6a4.3 4.3 0 1 0 4 0z" />
      <line x1="12" y1="8" x2="12" y2="17.4" />
    </g>

    <!-- fallback: plain cloud -->
    <path v-else :d="CLOUD" fill="#f5f5f7" stroke="#f5f5f7" stroke-width="1.4" />
  </svg>
</template>
