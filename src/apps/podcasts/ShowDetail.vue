<script setup>
// Show detail pane: big cover, metadata, Follow toggle, full episode list.
import { ref } from 'vue'
import { fmtDur } from './data'
import PlayPause from './PlayPause.vue'

const ACCENT = '#8e44ad'

const props = defineProps({
  show: { type: Object, required: true },
  followed: { type: Boolean, default: false },
  current: { type: Object, default: null }, // { showId, idx } or null
  playing: { type: Boolean, default: false },
  backLabel: { type: String, default: 'Back' },
})
const emit = defineEmits(['back', 'toggleFollow', 'play'])

const isCur = (idx) =>
  props.current && props.current.showId === props.show.id && props.current.idx === idx

// Covers that failed to load (offline): hide the img, keep gradient + emoji.
const failed = ref(new Set())
const onCoverError = (key) => { failed.value = new Set(failed.value).add(key) }
</script>

<template>
  <div class="pane detail">
    <button class="back" @click="emit('back')">‹ {{ backLabel }}</button>
    <div class="sh-head">
      <div class="cover big" :style="{ background: show.bg }">
        <span>{{ show.emoji }}</span>
        <img v-if="!failed.has(show.id)" class="cover-img" :src="show.cover" :alt="show.title"
          loading="lazy" draggable="false" @error="onCoverError(show.id)" />
      </div>
      <div class="sh-info">
        <div class="kicker">{{ show.category }}</div>
        <div class="sh-title">{{ show.title }}</div>
        <div class="sh-author">{{ show.author }}</div>
        <div class="sh-desc">{{ show.desc }}</div>
        <div class="sh-actions">
          <button class="follow" :class="{ on: followed }" @click="emit('toggleFollow')">
            <svg v-if="followed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{{ followed ? 'Following' : 'Follow' }}
          </button>
          <button class="play-latest" @click="emit('play', 0)"><span class="pp"><svg viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span> Play Latest</button>
        </div>
        <div class="sh-meta">{{ show.episodes.length }} Episodes · Updated {{ show.episodes[0].date }}</div>
      </div>
    </div>

    <div class="ep-head">Episodes</div>
    <div class="eps">
      <div v-for="(ep, i) in show.episodes" :key="ep.title" class="ep" :class="{ cur: isCur(i) }">
        <button class="ep-play" @click="emit('play', i)" :title="isCur(i) && playing ? 'Pause' : 'Play'">
          <PlayPause :playing="isCur(i) && playing" />
        </button>
        <div class="ep-text">
          <div class="ep-title">{{ ep.title }}</div>
          <div class="ep-desc">{{ ep.desc }}</div>
          <div class="ep-meta">{{ ep.date }} · {{ fmtDur(ep.dur) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.back {
  color: v-bind(ACCENT);
  font-size: 13px;
  padding: 0;
  margin-bottom: 10px;
}
.sh-head {
  display: flex;
  gap: 26px;
  align-items: flex-start;
  margin-bottom: 26px;
}
.cover.big {
  width: 200px;
  height: 200px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 0.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
  position: relative;
  overflow: hidden;
}
.cover.big span {
  font-size: 80px;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
}
.cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.sh-info {
  min-width: 0;
  padding-top: 4px;
}
.kicker {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: v-bind(ACCENT);
}
.sh-title {
  font-size: 24px;
  font-weight: 700;
  margin-top: 2px;
}
.sh-author {
  font-size: 14px;
  color: var(--text-dim);
  margin-top: 2px;
}
.sh-desc {
  font-size: 12px;
  color: var(--text-dim);
  margin: 8px 0 14px;
  max-width: 460px;
  line-height: 1.45;
}
.sh-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.follow {
  background: v-bind(ACCENT);
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  padding: 5px 22px;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(142, 68, 173, 0.35);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.follow svg {
  width: 12px;
  height: 12px;
  display: block;
}
.follow.on {
  background: var(--hover);
  color: var(--text);
  box-shadow: none;
}
.play-latest {
  font-size: 13px;
  font-weight: 600;
  color: v-bind(ACCENT);
  padding: 5px 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.play-latest:hover {
  background: var(--hover);
}
.play-latest .pp {
  display: inline-flex;
}
.play-latest .pp svg {
  width: 10px;
  height: 10px;
  display: block;
}
.sh-meta {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 12px;
}

.ep-head {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 6px;
}
.eps {
  border-top: 0.5px solid var(--border);
}
.ep {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 12px 8px;
  border-bottom: 0.5px solid var(--border);
  border-radius: 8px;
}
.ep:hover {
  background: var(--hover);
}
.ep.cur .ep-title {
  color: v-bind(ACCENT);
}
.ep-play {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  margin-top: 2px;
  border-radius: 50%;
  border: 1.5px solid v-bind(ACCENT);
  color: v-bind(ACCENT);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 1px;
}
.ep-play svg {
  width: 12px;
  height: 12px;
  display: block;
}
.ep-play:hover {
  background: v-bind(ACCENT);
  color: #fff;
}
.ep-text {
  flex: 1;
  min-width: 0;
}
.ep-title {
  font-size: 13px;
  font-weight: 600;
}
.ep-desc {
  font-size: 12px;
  color: var(--text-dim);
  line-height: 1.4;
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ep-meta {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 4px;
}
</style>
