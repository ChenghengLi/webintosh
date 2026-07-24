<script setup>
import { computed, ref } from 'vue'
import { formatTime } from './data'

const props = defineProps({
  player: { type: Object, required: true },
  currentTrack: { type: Object, default: null },
  liked: { type: Object, required: true }, // Set ref (unwrapped by parent template pass)
  volume: { type: Number, default: 60 },
  unavailable: { type: Boolean, default: false },
})
const emit = defineEmits([
  'toggle-play', 'next', 'prev', 'seek', 'toggle-like',
  'toggle-shuffle', 'toggle-repeat', 'volume',
])

const progress = computed(() => {
  if (!props.currentTrack) return 0
  return Math.min(1, props.player.progress / props.currentTrack.duration) * 100
})

const seekBar = ref(null)
const volBar = ref(null)

function ratioFromEvent(e, el) {
  const r = el.getBoundingClientRect()
  return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
}
function onSeek(e) {
  if (!props.currentTrack || !seekBar.value) return
  emit('seek', ratioFromEvent(e, seekBar.value))
}
function onVol(e) {
  if (!volBar.value) return
  emit('volume', Math.round(ratioFromEvent(e, volBar.value) * 100))
}

const isLiked = computed(() => props.currentTrack && props.liked.has(props.currentTrack.id))

// Covers that failed to load (offline): hide the img, keep the gradient tile.
const failed = ref(new Set())
const onCoverError = (key) => { failed.value = new Set(failed.value).add(key) }
const volIcon = computed(() => {
  if (props.volume === 0) return 'M3 9v6h4l5 5V4L7 9H3zm13.6 3l2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4-2.7-2.7z'
  if (props.volume < 50) return 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z'
  return 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z'
})
</script>

<template>
  <footer class="player">
    <!-- left: now playing -->
    <div class="np">
      <template v-if="currentTrack">
        <span class="np-cover" :style="{ background: `linear-gradient(135deg, ${currentTrack.color}, #121212 170%)` }">
          ♪
          <img v-if="!failed.has(currentTrack.id)" class="cover-img" :src="currentTrack.cover"
            :alt="currentTrack.album" loading="lazy" draggable="false" @error="onCoverError(currentTrack.id)" />
        </span>
        <span class="np-meta">
          <span class="np-title">{{ currentTrack.title }}</span>
          <span v-if="unavailable" class="np-offline">Unavailable offline</span>
          <span v-else class="np-artist">{{ currentTrack.artist }}</span>
        </span>
        <button
          class="icon-btn np-like"
          :class="{ liked: isLiked }"
          :title="isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'"
          @click="emit('toggle-like', currentTrack.id)"
        >{{ isLiked ? '♥' : '♡' }}</button>
      </template>
    </div>

    <!-- center: transport + seek -->
    <div class="transport">
      <div class="t-controls">
        <button
          class="icon-btn"
          :class="{ active: player.shuffle }"
          title="Shuffle"
          @click="emit('toggle-shuffle')"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
            <path d="M17 3h4v4h-2.3l-3.4 3.9-1.6-1.8L17.4 6H17V3zM3 7h3.4c2 0 3.6 1 4.7 2.7l-1.6 1.8C8.8 10.3 7.7 9 6.4 9H3V7zm14 10h.4l-3.7-3.1 1.6-1.8 3.4 3.9H20v-2h2v4h-4v-2h-1zM3 15h3.4c1.3 0 2.4-1.3 3.1-2.5l1.6 1.8c-1.1 1.7-2.7 2.7-4.7 2.7H3v-2z" />
          </svg>
        </button>
        <button class="icon-btn" title="Previous" @click="emit('prev')">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
        </button>
        <button class="play-btn" :title="player.playing ? 'Pause' : 'Play'" @click="emit('toggle-play')">
          <svg v-if="player.playing" viewBox="0 0 24 24" width="20" height="20" fill="#000"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="#000"><path d="M8 5v14l11-7z" /></svg>
        </button>
        <button class="icon-btn" title="Next" @click="emit('next')">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
        </button>
        <button
          class="icon-btn repeat"
          :class="{ active: player.repeat !== 'off' }"
          :title="player.repeat === 'one' ? 'Repeat one' : player.repeat === 'all' ? 'Repeat' : 'Enable repeat'"
          @click="emit('toggle-repeat')"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
          </svg>
          <span v-if="player.repeat === 'one'" class="one">1</span>
        </button>
      </div>
      <div class="seek-row">
        <span class="time">{{ currentTrack ? formatTime(player.progress) : '0:00' }}</span>
        <div ref="seekBar" class="bar seek" @click="onSeek">
          <div class="bar-fill" :style="{ width: progress + '%' }"></div>
          <div class="knob" :style="{ left: progress + '%' }"></div>
        </div>
        <span class="time">{{ currentTrack ? formatTime(currentTrack.duration) : '0:00' }}</span>
      </div>
    </div>

    <!-- right: volume -->
    <div class="right">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="#b3b3b3"><path :d="volIcon" /></svg>
      <div ref="volBar" class="bar vol" @click="onVol">
        <div class="bar-fill" :style="{ width: volume + '%' }"></div>
        <div class="knob" :style="{ left: volume + '%' }"></div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.player {
  height: 84px;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 1.6fr 1fr;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: #000;
  border-top: 1px solid #282828;
}
.np {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.np-cover {
  width: 52px;
  height: 52px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.np-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.np-title {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-artist {
  color: #b3b3b3;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-offline {
  color: #e91429;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-like {
  font-size: 16px;
  flex-shrink: 0;
}
.np-like.liked {
  color: #1ed760;
}
.transport {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.t-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}
.icon-btn {
  background: none;
  border: none;
  color: #b3b3b3;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 2px;
  transition: color 0.15s;
}
.icon-btn:hover {
  color: #fff;
}
.icon-btn.active {
  color: #1ed760;
}
.icon-btn.active::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #1ed760;
}
.repeat .one {
  position: absolute;
  top: -2px;
  right: -4px;
  font-size: 8px;
  font-weight: 800;
  color: #1ed760;
}
.play-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s;
}
.play-btn:hover {
  transform: scale(1.06);
}
.seek-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 560px;
}
.time {
  color: #a7a7a7;
  font-size: 11px;
  min-width: 34px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.bar {
  position: relative;
  height: 4px;
  background: #4d4d4d;
  border-radius: 2px;
  cursor: pointer;
}
.bar.seek {
  flex: 1;
}
.bar-fill {
  height: 100%;
  background: #b3b3b3;
  border-radius: 2px;
}
.bar:hover .bar-fill {
  background: #1ed760;
}
.knob {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.12s;
  pointer-events: none;
}
.bar:hover .knob {
  opacity: 1;
}
.right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
.bar.vol {
  width: 96px;
}
</style>
