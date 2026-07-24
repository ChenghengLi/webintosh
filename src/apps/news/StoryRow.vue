<script setup>
// Story row used across feeds: text left, big 120px thumb right,
// hover-revealed bookmark toggle (always visible once saved).
import SIcon from './SIcon.vue'

defineProps({
  story: { type: Object, required: true },
  saved: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'toggle-save'])

function gradCss(s) {
  return `linear-gradient(135deg, ${s.grad.join(', ')})`
}
</script>

<template>
  <div class="row" @click="emit('open', story)">
    <div class="row-main">
      <div class="src">
        {{ story.source }}
        <span v-if="story.plus" class="plus-mini">News+</span>
      </div>
      <div class="row-head">{{ story.headline }}</div>
      <div class="time">{{ story.time }}</div>
    </div>
    <div class="thumb" :style="{ background: gradCss(story) }">{{ story.emoji }}</div>
    <button
      class="save-btn"
      :class="{ on: saved }"
      :title="saved ? 'Remove from Saved Stories' : 'Save Story'"
      @click.stop="emit('toggle-save', story)"
    >
      <SIcon :name="saved ? 'bookmark-fill' : 'bookmark'" />
    </button>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 10px;
  margin: 0 -10px;
  border-radius: 12px;
  cursor: default;
}
.row:hover {
  background: var(--hover);
}
.row-main {
  flex: 1;
  min-width: 0;
}
.src {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--nred);
}
.plus-mini {
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 800;
  color: var(--nred);
  border: 0.5px solid var(--nred);
  vertical-align: 1px;
}
.row-head {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  margin-top: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.time {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 4px;
}
.thumb {
  width: 120px;
  height: 84px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  border: 0.5px solid var(--border);
}
.save-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-self: flex-end;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.row:hover .save-btn,
.save-btn.on {
  opacity: 1;
}
.save-btn.on {
  color: var(--nred);
}
.save-btn svg {
  width: 15px;
  height: 15px;
  display: block;
}
</style>
