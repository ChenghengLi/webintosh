<script setup>
const props = defineProps({
  view: { type: String, required: true }, // 'new' | 'open' | 'save' | 'info'
  docFiles: { type: Array, default: () => [] },
  filePath: { type: String, default: '' },
  words: { type: Number, default: 0 },
  chars: { type: Number, default: 0 },
  saveState: { type: String, default: '' },
  suggestedName: { type: String, default: 'Document.doc.html' },
})

const emit = defineEmits(['navigate', 'new', 'open', 'save', 'close'])

const baseName = (p) => p.split('/').pop()
</script>

<template>
  <div class="backstage">
    <div class="bs-rail">
      <div class="bs-brand">Word</div>
      <button class="bs-item" :class="{ on: view === 'new' }" @click="emit('navigate', 'new')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6.5 3.5h7L18 8v12.5H6.5z" />
          <path d="M13.5 3.5V8H18" />
        </svg>
        <span>New</span>
      </button>
      <button class="bs-item" :class="{ on: view === 'open' }" @click="emit('navigate', 'open')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3.5 7A1.5 1.5 0 015 5.5h4l2 2.5h8A1.5 1.5 0 0120.5 9.5v8A1.5 1.5 0 0119 19H5a1.5 1.5 0 01-1.5-1.5z" />
        </svg>
        <span>Open</span>
      </button>
      <button class="bs-item" :class="{ on: view === 'save' }" @click="emit('navigate', 'save')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 4h11l3.5 3.5V20H5z" />
          <rect x="8.5" y="4" width="7" height="5" />
          <rect x="8.5" y="13" width="7" height="7" />
        </svg>
        <span>Save</span>
      </button>
      <button class="bs-item" :class="{ on: view === 'info' }" @click="emit('navigate', 'info')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <line x1="12" y1="11" x2="12" y2="16.5" />
          <circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none" />
        </svg>
        <span>Info</span>
      </button>
      <div class="bs-spacer"></div>
      <button class="bs-item" @click="emit('close')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 5.5L8.5 12l6.5 6.5" />
        </svg>
        <span>Back</span>
      </button>
    </div>

    <div class="bs-content">
      <template v-if="view === 'new'">
        <h2>New</h2>
        <button class="new-doc-card" @click="emit('new')">
          <svg class="nd-icon" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2b579a" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6.5 2.5h7L18 7v14.5H6.5z" />
            <path d="M13.5 2.5V7H18" />
            <line x1="9" y1="11" x2="15.5" y2="11" />
            <line x1="9" y1="14" x2="15.5" y2="14" />
            <line x1="9" y1="17" x2="13.5" y2="17" />
          </svg>
          <span class="nd-label">Blank document</span>
        </button>
      </template>

      <template v-else-if="view === 'open'">
        <h2>Open</h2>
        <p class="bs-sub">Documents in ~/Documents</p>
        <div v-if="!props.docFiles.length" class="bs-empty">No saved Word documents yet. Save one first.</div>
        <button v-for="f in props.docFiles" :key="f" class="doc-row" @click="emit('open', f)">
          <img src="/icons/word.png" alt="" class="doc-ico" />
          <span class="doc-name">{{ baseName(f) }}</span>
          <span class="doc-open">Open</span>
        </button>
      </template>

      <template v-else-if="view === 'save'">
        <h2>Save</h2>
        <p class="bs-sub">Saved as <strong>{{ suggestedName }}</strong> in ~/Documents</p>
        <button class="bs-primary" @click="emit('save')">Save</button>
      </template>

      <template v-else-if="view === 'info'">
        <h2>Info</h2>
        <div class="info-grid">
          <span class="ik">Name</span><span>{{ filePath ? baseName(filePath) : suggestedName }}</span>
          <span class="ik">Location</span><span>{{ filePath || 'Not saved yet — saves to ~/Documents' }}</span>
          <span class="ik">Words</span><span>{{ words }}</span>
          <span class="ik">Characters</span><span>{{ chars }}</span>
          <span class="ik">Status</span><span>{{ saveState }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.backstage {
  flex: 1;
  display: flex;
  min-height: 0;
}
.bs-rail {
  width: 190px;
  flex-shrink: 0;
  background: #2b579a;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 10px 8px;
  gap: 2px;
}
.bs-brand {
  font-size: 20px;
  font-weight: 700;
  padding: 6px 10px 14px;
}
.bs-item {
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
  padding: 8px 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}
.bs-item:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.bs-item.on {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-weight: 600;
}
.bs-spacer {
  flex: 1;
}
.bs-content {
  flex: 1;
  overflow: auto;
  padding: 28px 36px;
  background: var(--window-bg);
}
.bs-content h2 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 14px;
}
.bs-sub {
  color: var(--text-dim);
  font-size: 12.5px;
  margin-bottom: 16px;
}
.new-doc-card {
  width: 170px;
  height: 200px;
  border: 0.5px solid var(--border);
  border-radius: 10px;
  background: var(--glass);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.new-doc-card:hover {
  border-color: #2b579a;
  box-shadow: 0 4px 16px rgba(43, 87, 154, 0.25);
}
.nd-label {
  font-size: 12.5px;
  color: var(--text-dim);
}
.bs-empty {
  color: var(--text-dim);
  font-size: 13px;
  padding: 18px 0;
}
.doc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  padding: 9px 12px;
  border-radius: 8px;
  border: 0.5px solid transparent;
  text-align: left;
}
.doc-row:hover {
  background: var(--hover);
  border-color: var(--border);
}
.doc-ico {
  width: 26px;
  height: 26px;
}
.doc-name {
  flex: 1;
  font-size: 13px;
}
.doc-open {
  font-size: 12px;
  color: #2b579a;
  font-weight: 600;
}
.bs-primary {
  background: #2b579a;
  color: #fff;
  font-size: 13px;
  padding: 7px 26px;
  border-radius: 8px;
}
.bs-primary:hover {
  background: #1f4173;
}
.info-grid {
  display: grid;
  grid-template-columns: 110px auto;
  gap: 10px 16px;
  font-size: 13px;
  max-width: 560px;
}
.info-grid .ik {
  color: var(--text-dim);
}
</style>
