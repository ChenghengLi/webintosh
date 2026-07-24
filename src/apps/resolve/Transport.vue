<script setup>
import Icon from './Icon.vue'
import { state, timecode, contentEnd, togglePlay, goStart, goEnd, nudge } from './state'
</script>

<template>
  <div class="transport">
    <span class="tc">{{ timecode(state.playhead) }}</span>
    <div class="btns">
      <button class="t-btn" title="Go to start" @click="goStart">
        <Icon name="skip-start" :size="15" />
      </button>
      <button class="t-btn" title="Back 1s" @click="nudge(-1)">
        <Icon name="step-back" :size="15" />
      </button>
      <button
        class="t-btn play"
        :title="state.playing ? 'Pause (Space)' : 'Play (Space)'"
        @click="togglePlay"
      >
        <Icon :name="state.playing ? 'pause' : 'play'" :size="16" />
      </button>
      <button class="t-btn" title="Forward 1s" @click="nudge(1)">
        <Icon name="step-forward" :size="15" />
      </button>
      <button class="t-btn" title="Go to end" @click="goEnd">
        <Icon name="skip-end" :size="15" />
      </button>
      <button
        class="t-btn loop" :class="{ on: state.loop }"
        title="Loop playback" @click="state.loop = !state.loop"
      >
        <Icon name="loop" :size="13" />
      </button>
    </div>
    <span class="tc dim">{{ timecode(contentEnd) }}</span>
  </div>
</template>

<style scoped>
.transport {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  height: 38px;
  background: var(--panel, #1e1e21);
  border-bottom: 1px solid var(--edge, #28282c);
}
.tc {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--orange, #e8862e);
  min-width: 96px;
  text-align: right;
}
.tc.dim {
  color: var(--dim, #8a8a90);
  text-align: left;
}
.btns {
  display: flex;
  align-items: center;
  gap: 4px;
}
.t-btn {
  background: none;
  border: none;
  color: var(--txt, #d8d8dc);
  min-width: 30px;
  height: 26px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  display: grid;
  place-items: center;
}
.t-btn:hover {
  background: var(--edge-2, #343439);
  color: #fff;
}
.t-btn.play {
  color: #fff;
}
.t-btn.loop {
  margin-left: 8px;
  color: var(--dim, #8a8a90);
  border: 1px solid var(--edge-2, #343439);
}
.t-btn.loop.on {
  background: var(--orange, #e8862e);
  border-color: transparent;
  color: #17130c;
}
</style>
