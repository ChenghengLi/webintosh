<script setup>
// Small floating "Get Info" panel. `info` is a display-ready record from
// actions.js entryInfo() plus absolute x/y coordinates inside the app root.
defineProps({
  info: { type: Object, required: true },
})
defineEmits(['close'])
</script>

<template>
  <div
    class="info-panel glass-strong"
    :style="{ left: info.x + 'px', top: info.y + 'px' }"
    @contextmenu.prevent
  >
    <div class="info-head">
      <img class="info-icon" :src="info.icon" :alt="info.name" draggable="false" />
      <span class="info-name">{{ info.name }}</span>
      <button class="info-close" title="Close" @click="$emit('close')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="info-rows">
      <div class="row"><span class="k">Kind</span><span class="v">{{ info.kind }}</span></div>
      <div class="row"><span class="k">Path</span><span class="v" :title="info.path">{{ info.path }}</span></div>
      <div class="row"><span class="k">Size</span><span class="v">{{ info.size }}</span></div>
    </div>
  </div>
</template>

<style scoped>
.info-panel {
  position: absolute;
  z-index: 30;
  width: 248px;
  padding: 12px;
  border-radius: 12px;
  border: 0.5px solid var(--border);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  color: var(--text);
  font-size: 13px;
}
.info-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.info-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
}
.info-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  word-break: break-word;
}
.info-close {
  border: none;
  background: transparent;
  color: var(--text-dim);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
  flex-shrink: 0;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.info-close svg {
  width: 10px;
  height: 10px;
  display: block;
}
.info-close:hover {
  background: var(--hover);
  color: var(--text);
}
.row {
  display: flex;
  gap: 10px;
  padding: 3px 0;
}
.k {
  width: 44px;
  flex-shrink: 0;
  color: var(--text-dim);
}
.v {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
