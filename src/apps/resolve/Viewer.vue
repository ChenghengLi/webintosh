<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useSystemStore } from '../../stores/system'
import { state, timecode, programClip, togglePlay, clamp, gradeFilter } from './state'
import Icon from './Icon.vue'
import AudioMeters from './AudioMeters.vue'

const system = useSystemStore()
const videoEl = ref(null)
const offline = ref(false)
const muted = ref(true)

// Source-local time of the program clip under the playhead.
const clipLocal = computed(() => {
  const c = programClip.value
  return c ? c.offset + (state.playhead - c.start) : 0
})

const videoStyle = computed(() => {
  const c = programClip.value
  if (!c) return {}
  return {
    opacity: c.opacity,
    transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.zoom})`,
    filter: gradeFilter.value,
  }
})

const showOffline = computed(() => !!programClip.value && (offline.value || !programClip.value.url))

// Keep the <video> locked to the timeline: src follows the program clip,
// currentTime tracks the playhead, play/pause follows the transport.
function syncPlayback() {
  const v = videoEl.value
  const c = programClip.value
  if (!v) return
  if (!c || !c.url) {
    if (!v.paused) v.pause()
    if (v.getAttribute('src')) {
      v.removeAttribute('src')
      v.load()
    }
    return
  }
  if (v.getAttribute('src') !== c.url) {
    offline.value = false
    v.src = c.url
  }
  const t = Math.max(0, clipLocal.value)
  const drift = Math.abs(v.currentTime - t)
  // Frame-accurate seeks while paused/scrubbing; loose drift correction while
  // playing so playback stays smooth (and never fights a buffering video).
  const tol = state.playing ? 0.35 : 0.04
  if (drift > tol && (!state.playing || v.readyState >= 3)) {
    try {
      v.currentTime = t
    } catch {
      /* metadata not loaded yet — loadedmetadata re-syncs */
    }
  }
  if (state.playing) {
    // Past the source's real end: freeze on the last frame, never loop it.
    const pastEnd = Number.isFinite(v.duration) && t >= v.duration - 0.05
    if (!pastEnd && (v.paused || v.ended)) v.play().catch(() => {})
  } else if (!v.paused) {
    v.pause()
  }
}

watch(() => [programClip.value?.id, programClip.value?.url], syncPlayback)
watch(clipLocal, syncPlayback)
watch(() => state.playing, syncPlayback)

// Unmuted program audio follows the system volume slider.
watch(
  () => system.volume,
  (vol) => {
    const v = videoEl.value
    if (v) v.volume = clamp(vol ?? 60, 0, 100) / 100
  },
)

onMounted(() => {
  const v = videoEl.value
  if (v) v.volume = clamp(system.volume ?? 60, 0, 100) / 100
  syncPlayback()
})
</script>

<template>
  <div class="viewer">
    <div class="pane-header">
      <span>Viewer</span>
      <div class="header-right">
        <span class="clip-tag" v-if="programClip">
          <Icon :name="programClip.icon || 'film'" :size="12" class="tag-icon" />
          {{ programClip.name }}
        </span>
        <span class="clip-tag none" v-else>No clip under playhead</span>
        <button
          class="mute-btn" :class="{ off: muted }"
          :title="muted ? 'Unmute program audio' : 'Mute program audio'"
          @click="muted = !muted"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2.5 6.2v3.6h2.9L9.5 13V3L5.4 6.2H2.5z" fill="currentColor" stroke="none" />
            <template v-if="muted">
              <line x1="11.2" y1="6" x2="14.4" y2="10" />
              <line x1="14.4" y1="6" x2="11.2" y2="10" />
            </template>
            <template v-else>
              <path d="M11.4 5.7a3.2 3.2 0 0 1 0 4.6" />
              <path d="M13 3.9a5.8 5.8 0 0 1 0 8.2" />
            </template>
          </svg>
        </button>
      </div>
    </div>

    <div class="stage">
      <div class="screen-wrap" @dblclick="togglePlay">
        <div class="screen">
        <!-- program video, no native controls -->
        <video
          ref="videoEl"
          class="program"
          :style="videoStyle"
          :muted="muted"
          playsinline
          preload="auto"
          @error="offline = true"
          @loadeddata="offline = false"
          @loadedmetadata="syncPlayback"
        />

        <!-- letterbox -->
        <template v-if="programClip">
          <div class="bar top" />
          <div class="bar bottom" />
        </template>

        <!-- states -->
        <div v-if="!programClip" class="screen-state">
          <span>No clip</span>
        </div>
        <div v-else-if="showOffline" class="screen-state offline">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3.5 2.5 20h19L12 3.5z" />
            <line x1="12" y1="9.5" x2="12" y2="13.5" />
            <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
          </svg>
          <span>Media offline</span>
        </div>

        <!-- HUD overlays -->
        <div class="tc-main">{{ timecode(state.playhead) }}</div>
        <div v-if="programClip" class="tc-src">{{ timecode(clipLocal) }} · SRC</div>
        <div class="tc-fps">30 fps</div>
        <button class="big-play" v-if="!state.playing" @click.stop="togglePlay">
          <Icon name="play" :size="22" />
        </button>
        </div>
      </div>
      <AudioMeters />
    </div>
  </div>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  background: var(--panel, #1e1e21);
  min-height: 0;
}
.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dim, #8a8a90);
  border-bottom: 1px solid var(--edge, #28282c);
  flex: none;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.clip-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
  color: var(--orange, #e8862e);
}
.clip-tag.none {
  color: #5c5c64;
}
.mute-btn {
  background: none;
  border: none;
  color: var(--dim, #8a8a90);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: grid;
  place-items: center;
}
.mute-btn:hover {
  color: var(--txt, #d8d8dc);
  background: var(--edge-2, #343439);
}
.mute-btn.off {
  color: #5c5c64;
}
.stage {
  flex: 1;
  min-height: 0;
  display: flex;
}
.screen-wrap {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 10px;
  background: #141416;
}
.screen {
  position: relative;
  height: 100%;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 100%;
  width: auto;
  min-width: 0;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 0 0 1px #000, 0 6px 22px rgba(0, 0, 0, 0.5);
}
@supports not (aspect-ratio: 1) {
  .screen {
    width: 100%;
  }
}

/* program video */
.program {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  pointer-events: none;
}

/* letterbox bars */
.bar {
  position: absolute;
  left: 0;
  right: 0;
  height: 11%;
  background: #000;
}
.bar.top { top: 0; }
.bar.bottom { bottom: 0; }

/* empty / offline states */
.screen-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #000;
  color: #5c5c64;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.screen-state.offline {
  color: #d05454;
}

/* overlays */
.tc-main {
  position: absolute;
  bottom: 12.5%;
  left: 50%;
  transform: translateX(-50%);
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 15px;
  letter-spacing: 0.08em;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  padding: 2px 10px;
  border-radius: 5px;
}
.tc-src,
.tc-fps {
  position: absolute;
  top: 6px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(0, 0, 0, 0.45);
  padding: 1px 7px;
  border-radius: 4px;
}
.tc-src { left: 8px; }
.tc-fps { right: 8px; }
.big-play {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0 0 0 3px;
  overflow: hidden;
}
.big-play:hover {
  background: rgba(232, 134, 46, 0.85);
}
</style>
