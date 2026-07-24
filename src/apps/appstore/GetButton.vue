<script setup>
// Pill button cycling GET -> progress ring -> OPEN / Installed, like the real App Store.
const props = defineProps({
  status: { type: String, default: 'idle' }, // idle | installing | installed
  progress: { type: Number, default: 0 },
  openable: { type: Boolean, default: false }, // installed app exists in the registry
  label: { type: String, default: 'GET' },
  hero: { type: Boolean, default: false }, // rendered on a colored banner
})
const emit = defineEmits(['action'])

const R = 8.5
const CIRC = 2 * Math.PI * R
</script>

<template>
  <button v-if="status === 'idle'" class="getbtn" :class="{ hero }" @click.stop="emit('action')">
    {{ label }}
  </button>

  <span v-else-if="status === 'installing'" class="ring" :class="{ hero }" role="progressbar">
    <svg viewBox="0 0 24 24">
      <circle class="track" cx="12" cy="12" :r="R" />
      <circle
        class="fill"
        cx="12"
        cy="12"
        :r="R"
        :stroke-dasharray="CIRC"
        :stroke-dashoffset="CIRC * (1 - props.progress)"
      />
    </svg>
    <span class="stop" />
  </span>

  <button v-else-if="openable" class="getbtn open" :class="{ hero }" @click.stop="emit('action')">
    OPEN
  </button>
  <span v-else class="installed">Installed</span>
</template>

<style scoped>
.getbtn {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--accent);
  background: rgba(120, 120, 128, 0.16);
  border-radius: 999px;
  padding: 4px 14px;
  min-width: 64px;
  text-align: center;
  transition: background 0.15s ease;
}
.getbtn:hover {
  background: rgba(120, 120, 128, 0.28);
}
.getbtn.hero {
  background: rgba(255, 255, 255, 0.26);
  color: #fff;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.getbtn.hero:hover {
  background: rgba(255, 255, 255, 0.4);
}

.ring {
  position: relative;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ring svg {
  width: 22px;
  height: 22px;
  transform: rotate(-90deg);
}
.ring circle {
  fill: none;
  stroke-width: 2.5;
}
.ring .track {
  stroke: rgba(128, 128, 128, 0.35);
}
.ring .fill {
  stroke: var(--accent);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.07s linear;
}
.ring.hero .track {
  stroke: rgba(255, 255, 255, 0.35);
}
.ring.hero .fill {
  stroke: #fff;
}
.stop {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: rgba(128, 128, 128, 0.75);
}
.ring.hero .stop {
  background: #fff;
}

.installed {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  padding: 4px 10px;
}
</style>
