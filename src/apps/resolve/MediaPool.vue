<script setup>
import { ref } from 'vue'
import { state, importVideo, addToTimeline } from './state'
import Icon from './Icon.vue'

const selectedPoolId = ref(null)

function onDragStart(e, item) {
  e.dataTransfer.setData('text/resolve-pool', item.id)
  e.dataTransfer.effectAllowed = 'copy'
}

// Double-click: drop the clip onto V1 (or A1 for audio) at the playhead.
function quickAdd(item) {
  addToTimeline(item, 'v1', state.playhead)
}
</script>

<template>
  <div class="media-pool">
    <div class="pane-header">
      <span>Media Pool</span>
      <button class="import-btn" title="Import media" @click="importVideo">
        <Icon name="plus" :size="11" />
        <span>Import</span>
      </button>
    </div>
    <div class="pool-list">
      <div
        v-for="item in state.pool"
        :key="item.id"
        class="pool-item"
        :class="{ sel: selectedPoolId === item.id }"
        draggable="true"
        @click="selectedPoolId = item.id"
        @dblclick="quickAdd(item)"
        @dragstart="onDragStart($event, item)"
      >
        <div class="thumb" :style="{ background: item.grad }">
          <Icon :name="item.icon || 'film'" :size="16" class="thumb-icon" />
        </div>
        <div class="pool-meta">
          <div class="pool-name">
            <Icon :name="item.icon || 'film'" :size="11" class="name-icon" />
            <span class="name-txt">{{ item.name }}</span>
          </div>
          <div class="pool-sub">{{ item.duration.toFixed(1) }}s · 3840×2160 · 30fps</div>
        </div>
      </div>
      <div v-if="!state.pool.length" class="pool-empty">No media — click Import.</div>
    </div>
    <div class="pool-hint">Drag clips to the timeline, or double-click to insert at playhead.</div>
  </div>
</template>

<style scoped>
.media-pool {
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
.import-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--edge-2, #343439);
  color: var(--txt, #d8d8dc);
  border: 1px solid #45454c;
  border-radius: 5px;
  font-size: 11px;
  padding: 2px 8px;
  cursor: pointer;
  font-family: inherit;
}
.import-btn:hover {
  background: var(--orange, #e8862e);
  color: #17130c;
  border-color: transparent;
}
.pool-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pool-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px;
  border-radius: 7px;
  cursor: grab;
  border: 1px solid transparent;
}
.pool-item:hover {
  background: #26262b;
}
.pool-item.sel {
  background: #2b2b31;
  border-color: var(--orange, #e8862e);
}
.thumb {
  width: 52px;
  height: 30px;
  border-radius: 5px;
  flex: none;
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.18);
}
.thumb-icon {
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
}
.pool-meta {
  min-width: 0;
}
.pool-name {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--txt, #d8d8dc);
}
.name-icon {
  color: var(--dim, #8a8a90);
}
.name-txt {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pool-sub {
  font-size: 10px;
  color: var(--dim, #8a8a90);
}
.pool-empty {
  color: var(--dim, #8a8a90);
  font-size: 11px;
  text-align: center;
  margin-top: 20px;
}
.pool-hint {
  flex: none;
  padding: 5px 10px;
  font-size: 10px;
  color: #6a6a72;
  border-top: 1px solid var(--edge, #28282c);
}
</style>
