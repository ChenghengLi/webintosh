<script setup>
import { onBeforeUnmount, reactive, watch } from 'vue'
import { state } from './state'

// Simulated stereo program levels. Bars animate only while the transport is
// playing; peak markers hold briefly and decay (classic PPM behavior).
const m = reactive({ l: 0, r: 0, pl: 0, pr: 0 })
let timer = null

function tick() {
  // smooth random walk toward a fresh target level
  m.l += (0.25 + Math.random() * 0.72 - m.l) * 0.5
  m.r += (0.25 + Math.random() * 0.72 - m.r) * 0.5
  // peaks follow instantly upward, decay slowly
  m.pl = Math.max(m.l, m.pl - 0.05)
  m.pr = Math.max(m.r, m.pr - 0.05)
}

function stop() {
  if (timer) clearInterval(timer)
  timer = null
  m.l = m.r = m.pl = m.pr = 0
}

watch(
  () => state.playing,
  (p) => {
    if (p) {
      if (!timer) timer = setInterval(tick, 120)
    } else {
      stop()
    }
  },
)

onBeforeUnmount(stop)

const pct = (v) => `${Math.round(Math.min(1, Math.max(0, v)) * 1000) / 10}%`
</script>

<template>
  <div class="meters" title="Program audio meters">
    <div class="bars">
      <div class="bar">
        <div class="fill" :style="{ height: pct(m.l) }" />
        <div class="peak" :style="{ bottom: pct(m.pl) }" />
      </div>
      <div class="bar">
        <div class="fill" :style="{ height: pct(m.r) }" />
        <div class="peak" :style="{ bottom: pct(m.pr) }" />
      </div>
    </div>
    <div class="scale">
      <span>0</span>
      <span>-10</span>
      <span>-20</span>
      <span>-40</span>
    </div>
  </div>
</template>

<style scoped>
.meters {
  flex: none;
  width: 46px;
  display: flex;
  gap: 5px;
  padding: 10px 8px;
  background: #141416;
  border-left: 1px solid var(--edge, #28282c);
}
.bars {
  flex: 1;
  display: flex;
  gap: 4px;
  min-height: 0;
}
.bar {
  position: relative;
  flex: 1;
  background: #0b0b0d;
  border-radius: 2px;
  box-shadow: inset 0 0 0 0.5px #2c2c32;
  overflow: hidden;
}
.fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, #28c76f 0%, #28c76f 56%, #ffd60a 78%, #ff453a 96%);
  transition: height 90ms linear;
}
.peak {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.85);
  transform: translateY(1px);
  transition: bottom 90ms linear;
}
.scale {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1px 0;
  font-size: 7px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  color: #6a6a72;
  user-select: none;
}
</style>
