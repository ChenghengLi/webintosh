<script setup>
import { computed } from 'vue'

const props = defineProps({
  h: { type: Number, default: 0 },
  m: { type: Number, default: 0 },
  s: { type: Number, default: 0 },
  day: { type: Boolean, default: true },
  size: { type: Number, default: 52 },
})

// Tip of a hand at `angleDeg` (0 = 12 o'clock) with the given length,
// in a 48×48 viewBox centred on (24, 24).
function tip(angleDeg, len) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: +(24 + len * Math.cos(a)).toFixed(2),
    y: +(24 + len * Math.sin(a)).toFixed(2),
  }
}

const hourTip = computed(() => tip(((props.h % 12) + props.m / 60) * 30, 10))
const minTip = computed(() => tip((props.m + props.s / 60) * 6, 15))
const secTip = computed(() => tip(props.s * 6, 17.5))

const ticks = computed(() => {
  const out = []
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180
    const major = i % 3 === 0
    const r1 = major ? 18.8 : 20.4
    out.push({
      x1: +(24 + r1 * Math.sin(a)).toFixed(2),
      y1: +(24 - r1 * Math.cos(a)).toFixed(2),
      x2: +(24 + 22 * Math.sin(a)).toFixed(2),
      y2: +(24 - 22 * Math.cos(a)).toFixed(2),
      major,
    })
  }
  return out
})
</script>

<template>
  <svg class="analog" :class="{ night: !day }" :width="size" :height="size" viewBox="0 0 48 48">
    <circle class="face" cx="24" cy="24" r="22.6" />
    <line
      v-for="(t, i) in ticks" :key="i"
      class="tick" :class="{ major: t.major }"
      :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2"
    />
    <line class="hand hour" x1="24" y1="24" :x2="hourTip.x" :y2="hourTip.y" />
    <line class="hand min" x1="24" y1="24" :x2="minTip.x" :y2="minTip.y" />
    <line class="hand sec" x1="24" y1="24" :x2="secTip.x" :y2="secTip.y" />
    <circle class="pin" cx="24" cy="24" r="1.5" />
  </svg>
</template>

<style scoped>
/* Daytime face: light dial with dark hands. */
.face { fill: #ececf0; }
.tick { stroke: #a7a7ae; stroke-width: 1; }
.tick.major { stroke: #6e6e75; stroke-width: 1.6; }
.hand { stroke: #1b1b1f; stroke-linecap: round; }
.hand.hour { stroke-width: 2.8; }
.hand.min { stroke-width: 1.9; }
.hand.sec { stroke: #ff9f0a; stroke-width: 1; }
.pin { fill: #ff9f0a; }

/* Night face: dark dial with light hands (like the real World Clock). */
.night .face { fill: #2b2b2f; }
.night .tick { stroke: #75757d; }
.night .tick.major { stroke: #a2a2aa; }
.night .hand { stroke: #ececf0; }
.night .hand.sec { stroke: #ff9f0a; }
</style>
