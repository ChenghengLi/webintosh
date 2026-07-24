<script setup>
// Office-style ribbon: File / Home / Insert / Design tabs plus the Present button.
// All chrome icons are hand-drawn inline SVG (24 viewBox, currentColor, no emoji).
import { ref } from 'vue'
import { EMOJIS, FILL_COLORS, FONT_SIZES, LAYOUTS, THEMES } from './deck.js'

defineProps({
  fontSize: { type: Number, default: 20 },
  activeFill: { type: String, default: '' },
  themeId: { type: String, default: 'white' },
})
const emit = defineEmits(['add-slide', 'exec', 'font-size', 'fill', 'insert', 'update:theme', 'present'])

const TABS = [
  { id: 'home', name: 'Home' },
  { id: 'insert', name: 'Insert' },
  { id: 'design', name: 'Design' },
]
const tab = ref('home')
const openMenu = ref(null) // 'file' | 'layout' | 'emoji' | null

// Paragraph alignment stacks: [x1, x2] per line (4 lines, y = 6 / 10.5 / 15 / 19.5).
const ALIGNS = [
  { id: 'left', cmd: 'justifyLeft', lines: [[4, 20], [4, 13], [4, 17], [4, 10]] },
  { id: 'center', cmd: 'justifyCenter', lines: [[4, 20], [7.5, 16.5], [5.5, 18.5], [9, 15]] },
  { id: 'right', cmd: 'justifyRight', lines: [[4, 20], [11, 20], [7, 20], [14, 20]] },
]

function switchTab(id) {
  tab.value = id
  openMenu.value = null
}
function toggleMenu(id) {
  openMenu.value = openMenu.value === id ? null : id
}
function pickLayout(layout) {
  emit('add-slide', layout)
  openMenu.value = null
}
function pickEmoji(em) {
  emit('insert', 'emoji', em)
  openMenu.value = null
}
</script>

<template>
  <div class="ribbon">
    <div class="tabs">
      <span class="dd">
        <button class="tab file" :class="{ on: openMenu === 'file' }" @click="toggleMenu('file')">File</button>
        <div v-if="openMenu === 'file'" class="menu file-menu glass-strong">
          <div class="fm-title">Presentation</div>
          <button class="menu-item" disabled>New Presentation</button>
          <button class="menu-item" disabled>Open…</button>
          <button class="menu-item" disabled>Save</button>
          <button class="menu-item" disabled>Print…</button>
          <div class="fm-note">Changes save automatically.</div>
        </div>
      </span>
      <button v-for="t in TABS" :key="t.id" class="tab" :class="{ on: tab === t.id }" @click="switchTab(t.id)">
        {{ t.name }}
      </button>
      <div class="tabs-fill"></div>
      <button class="present-btn" title="Start slide show" @click="emit('present')">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="14" rx="3" fill="#fff" />
          <path d="M10.4 9.2 15.6 12l-5.2 2.8z" fill="#d24726" />
        </svg>
        <span>Present</span>
      </button>
    </div>

    <div class="ribbon-body">
      <!-- HOME -->
      <template v-if="tab === 'home'">
        <div class="rg">
          <div class="rg-body">
            <div class="dd">
              <button class="big-btn ric" title="Add a slide" @click="toggleMenu('layout')">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="4.5" width="14" height="10.5" rx="1.5" />
                  <line x1="6" y1="8" x2="12" y2="8" />
                  <line x1="6" y1="11" x2="13.5" y2="11" />
                  <circle cx="17" cy="16.5" r="4.8" fill="#21a366" stroke="none" />
                  <path d="M17 14.2v4.6M14.7 16.5h4.6" stroke="#fff" stroke-width="1.7" />
                </svg>
                <span class="big-label">New Slide
                  <svg class="chev" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6" /></svg>
                </span>
              </button>
              <div v-if="openMenu === 'layout'" class="menu glass-strong">
                <button v-for="l in LAYOUTS" :key="l.id" class="menu-item" @click="pickLayout(l.id)">
                  <span class="lay-ico" :class="l.id"><i></i><i></i><i></i></span>
                  {{ l.name }}
                </button>
              </div>
            </div>
          </div>
          <div class="rg-label">Slides</div>
        </div>
        <div class="rsep"></div>
        <div class="rg">
          <div class="rg-body font-row">
            <select class="fsel" :value="fontSize" title="Font size" @change="emit('font-size', +$event.target.value)">
              <option v-for="s in FONT_SIZES" :key="s" :value="s">{{ s }}</option>
            </select>
            <button class="tool ric" title="Bold" @mousedown.prevent="emit('exec', 'bold')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M8.5 4.5v15" />
                <path d="M8.5 4.5h4.4a3.6 3.6 0 0 1 0 7.2H8.5" />
                <path d="M8.5 11.7h5.6a3.9 3.9 0 0 1 0 7.8H8.5" />
              </svg>
            </button>
            <button class="tool ric" title="Italic" @mousedown.prevent="emit('exec', 'italic')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="9.5" y1="5" x2="15.5" y2="5" />
                <line x1="8.5" y1="19" x2="14.5" y2="19" />
                <line x1="13.6" y1="5" x2="10.4" y2="19" />
              </svg>
            </button>
            <button class="tool ric" title="Underline" @mousedown.prevent="emit('exec', 'underline')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M8 4.5v7.5a4 4 0 0 0 8 0V4.5" />
                <line x1="6.5" y1="20" x2="17.5" y2="20" />
              </svg>
            </button>
          </div>
          <div class="rg-label">Font</div>
        </div>
        <div class="rsep"></div>
        <div class="rg">
          <div class="rg-body para-row">
            <button
              v-for="a in ALIGNS"
              :key="a.id"
              class="tool ric"
              :title="'Align ' + a.id"
              @mousedown.prevent="emit('exec', a.cmd)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
                <line v-for="(ln, i) in a.lines" :key="i" :x1="ln[0]" :x2="ln[1]" :y1="6 + i * 4.5" :y2="6 + i * 4.5" />
              </svg>
            </button>
            <span class="vsep"></span>
            <button class="tool ric" title="Bullets" @mousedown.prevent="emit('exec', 'insertUnorderedList')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
                <circle cx="5.2" cy="6" r="1.3" fill="currentColor" stroke="none" />
                <circle cx="5.2" cy="12" r="1.3" fill="currentColor" stroke="none" />
                <circle cx="5.2" cy="18" r="1.3" fill="currentColor" stroke="none" />
                <line x1="10" y1="6" x2="19.5" y2="6" />
                <line x1="10" y1="12" x2="19.5" y2="12" />
                <line x1="10" y1="18" x2="19.5" y2="18" />
              </svg>
            </button>
          </div>
          <div class="rg-label">Paragraph</div>
        </div>
        <div class="rsep"></div>
        <div class="rg">
          <div class="rg-body para-row">
            <button class="tool ric" title="Rectangle" @click="emit('insert', 'rect')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3.5" y="7" width="17" height="10" rx="1" />
              </svg>
            </button>
            <button class="tool ric" title="Oval" @click="emit('insert', 'circle')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <ellipse cx="12" cy="12" rx="8.5" ry="5.5" />
              </svg>
            </button>
            <button class="tool ric deco" title="Line" @click.stop>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                <line x1="5" y1="19" x2="19" y2="5" />
              </svg>
            </button>
          </div>
          <div class="rg-label">Shapes</div>
        </div>
        <div class="rsep"></div>
        <div class="rg">
          <div class="rg-body fill-row">
            <button class="big-btn ric fill-btn" title="Shape fill" @click.stop>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12.2 3.6 4.6 11.2a1.6 1.6 0 0 0 0 2.3l4.9 4.9a1.6 1.6 0 0 0 2.3 0l7.6-7.6z" />
                <line x1="13.8" y1="2.5" x2="16" y2="4.7" />
                <path d="M20.2 13.8s-2 2.4-2 3.7a2 2 0 0 0 4 0c0-1.3-2-3.7-2-3.7z" fill="currentColor" stroke="none" />
              </svg>
              <span class="fill-bar" :style="{ background: activeFill || 'transparent' }"></span>
            </button>
            <div class="swatches">
              <button
                v-for="c in FILL_COLORS"
                :key="c"
                class="sw"
                :class="{ on: activeFill === c }"
                :style="{ background: c }"
                :title="'Shape fill ' + c"
                @click="emit('fill', c)"
              ></button>
            </div>
          </div>
          <div class="rg-label">Fill</div>
        </div>
        <div class="rsep"></div>
        <div class="rg deco">
          <div class="rg-body edit-col">
            <button class="mini-btn ric" title="Select" @click.stop>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M6.5 3.8 18 12.6l-5.6.7 3.1 6-2.6 1.3-3-5.8-3.4 3.4z" />
              </svg>
              <span>Select</span>
            </button>
            <button class="mini-btn ric" title="Find" @click.stop>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6" />
                <line x1="15.3" y1="15.3" x2="20" y2="20" />
              </svg>
              <span>Find</span>
            </button>
          </div>
          <div class="rg-label">Edit</div>
        </div>
      </template>

      <!-- INSERT -->
      <template v-else-if="tab === 'insert'">
        <div class="rg">
          <div class="rg-body">
            <button class="big-btn ric" title="Insert a text box" @click="emit('insert', 'text')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
                <path d="M9.3 9.5h5.4M12 9.5V15" />
              </svg>
              <span class="big-label">Text Box</span>
            </button>
          </div>
          <div class="rg-label">Text</div>
        </div>
        <div class="rsep"></div>
        <div class="rg">
          <div class="rg-body">
            <div class="dd">
              <button class="big-btn ric" title="Insert a symbol" @click="toggleMenu('emoji')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="9.2" cy="10" r="1.15" fill="currentColor" stroke="none" />
                  <circle cx="14.8" cy="10" r="1.15" fill="currentColor" stroke="none" />
                  <path d="M8.5 13.8a5 5 0 0 0 7 0" />
                </svg>
                <span class="big-label">Symbol
                  <svg class="chev" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6" /></svg>
                </span>
              </button>
              <div v-if="openMenu === 'emoji'" class="menu emoji-menu glass-strong">
                <button v-for="em in EMOJIS" :key="em" class="em" @click="pickEmoji(em)">{{ em }}</button>
              </div>
            </div>
          </div>
          <div class="rg-label">Symbols</div>
        </div>
        <div class="rsep"></div>
        <div class="rg">
          <div class="rg-body">
            <button class="big-btn ric" title="Insert a rectangle" @click="emit('insert', 'rect')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3.5" y="7" width="17" height="10" rx="1" />
              </svg>
              <span class="big-label">Rectangle</span>
            </button>
            <button class="big-btn ric" title="Insert an oval" @click="emit('insert', 'circle')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <ellipse cx="12" cy="12" rx="8.5" ry="5.5" />
              </svg>
              <span class="big-label">Oval</span>
            </button>
          </div>
          <div class="rg-label">Shapes</div>
        </div>
      </template>

      <!-- DESIGN -->
      <template v-else-if="tab === 'design'">
        <div class="rg">
          <div class="rg-body themes">
            <button
              v-for="t in THEMES"
              :key="t.id"
              class="theme-card"
              :class="{ on: themeId === t.id }"
              @click="emit('update:theme', t.id)"
            >
              <span class="theme-thumb" :style="{ background: t.bg }">
                <span class="tt-title" :style="{ background: t.text }"></span>
                <span class="tt-line" :style="{ background: t.text }"></span>
              </span>
              <span class="theme-name">{{ t.name }}</span>
            </button>
          </div>
          <div class="rg-label">Themes</div>
        </div>
      </template>
    </div>

    <div v-if="openMenu" class="menu-backdrop" @click="openMenu = null"></div>
  </div>
</template>

<style scoped>
.ribbon {
  border-bottom: 0.5px solid var(--border);
  background: var(--titlebar-bg);
  flex: none;
}
.tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px 0;
}
.tab {
  padding: 6px 14px;
  font-size: 12.5px;
  color: var(--text-dim);
  background: transparent;
  border: none;
  border-radius: 7px 7px 0 0;
  cursor: pointer;
}
.tab:hover {
  color: var(--text);
}
.tab.on {
  color: #d24726;
  font-weight: 600;
  background: var(--window-bg);
  box-shadow: inset 0 -2px 0 #d24726;
}
.tab.file {
  color: #d24726;
  font-weight: 600;
}
.tab.file.on {
  background: var(--window-bg);
  box-shadow: inset 0 -2px 0 #d24726;
}
.tabs-fill {
  flex: 1;
}
.present-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(180deg, #e05a2b, #c43d12);
  border: none;
  border-radius: 7px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
.present-btn:hover {
  filter: brightness(1.08);
}
.ribbon-body {
  display: flex;
  align-items: stretch;
  gap: 10px;
  min-height: 92px;
  padding: 8px 12px;
  background: var(--window-bg);
  border-top: 0.5px solid var(--border);
}
.rg {
  display: flex;
  flex-direction: column;
}
.rg-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}
.rg-label {
  padding-top: 4px;
  text-align: center;
  font-size: 10.5px;
  color: var(--text-dim);
}
.rsep {
  width: 0.5px;
  margin: 6px 2px;
  background: var(--border);
}
.vsep {
  width: 0.5px;
  align-self: stretch;
  margin: 4px 2px;
  background: var(--border);
}

/* ribbon icons: Office gray, lifted in dark theme */
.ric {
  color: #444;
}
:root[data-theme='dark'] .ric {
  color: #c9c9c9;
}

.big-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 64px;
  height: 100%;
  padding: 6px 10px;
  font-size: 11.5px;
  color: var(--text);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.big-btn:hover {
  background: var(--hover);
}
.big-btn.ric:hover {
  color: #444;
}
:root[data-theme='dark'] .big-btn.ric:hover {
  color: #c9c9c9;
}
.big-label {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--text);
}
.chev {
  color: var(--text-dim);
}
.dd {
  position: relative;
  height: 100%;
  display: flex;
}
.menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 500;
  min-width: 190px;
  padding: 5px;
  border: 0.5px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.28);
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  font-size: 12.5px;
  color: var(--text);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
}
.menu-item:hover {
  background: var(--hover);
}
.menu-item:disabled {
  opacity: 0.45;
  cursor: default;
}
.menu-item:disabled:hover {
  background: transparent;
}
.file-menu {
  min-width: 210px;
}
.fm-title {
  padding: 4px 10px 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.fm-note {
  margin-top: 4px;
  padding: 7px 10px 4px;
  border-top: 0.5px solid var(--border);
  font-size: 11px;
  color: var(--text-dim);
}
.emoji-menu {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  min-width: 216px;
}
.em {
  padding: 5px;
  font-size: 20px;
  line-height: 1;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.em:hover {
  background: var(--hover);
}

/* layout mini icons */
.lay-ico {
  position: relative;
  display: block;
  width: 28px;
  height: 19px;
  flex: none;
  border: 1px solid var(--text-dim);
  border-radius: 2.5px;
}
.lay-ico i {
  position: absolute;
  display: block;
  background: var(--text-dim);
  border-radius: 1px;
  opacity: 0.75;
}
.lay-ico.title i:nth-child(1) { left: 4px; right: 4px; top: 5px; height: 3.5px; }
.lay-ico.title i:nth-child(2) { left: 8px; right: 8px; top: 11px; height: 2.5px; }
.lay-ico.titleContent i:nth-child(1) { left: 3px; right: 3px; top: 2px; height: 3px; }
.lay-ico.titleContent i:nth-child(2) { left: 3px; right: 3px; top: 7px; height: 9px; }
.lay-ico.twoContent i:nth-child(1) { left: 3px; right: 3px; top: 2px; height: 3px; }
.lay-ico.twoContent i:nth-child(2) { left: 3px; width: 9.5px; top: 7px; height: 9px; }
.lay-ico.twoContent i:nth-child(3) { right: 3px; width: 9.5px; top: 7px; height: 9px; }
.lay-ico.blank i { display: none; }

/* font + paragraph groups */
.font-row,
.para-row {
  gap: 4px;
}
.fsel {
  width: 56px;
  padding: 3px 4px;
  font-size: 12px;
  color: var(--text);
  background: var(--window-bg);
  border: 0.5px solid var(--border);
  border-radius: 6px;
}
.tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 12.5px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.tool:hover {
  background: var(--hover);
}
.tool.deco {
  opacity: 0.55;
}

/* fill group */
.fill-row {
  gap: 8px;
}
.fill-btn {
  min-width: 40px;
  gap: 2px;
}
.fill-bar {
  width: 22px;
  height: 3.5px;
  border-radius: 2px;
  border: 0.5px solid var(--border);
}

/* shape fill swatches */
.swatches {
  display: grid;
  grid-template-columns: repeat(5, 18px);
  gap: 5px;
  align-content: center;
}
.sw {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0.5px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
}
.sw.on {
  outline: 2px solid #d24726;
  outline-offset: 1px;
}

/* edit group */
.edit-col {
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 3px;
}
.mini-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  font-size: 11.5px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.mini-btn span {
  color: var(--text);
}
.mini-btn:hover {
  background: var(--hover);
}

/* design themes */
.themes {
  gap: 10px;
}
.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.theme-card:hover {
  background: var(--hover);
}
.theme-card.on .theme-thumb {
  outline: 2px solid #d24726;
  outline-offset: 1.5px;
}
.theme-thumb {
  position: relative;
  display: block;
  width: 96px;
  height: 56px;
  border: 0.5px solid var(--border);
  border-radius: 5px;
}
.tt-title {
  position: absolute;
  left: 8px;
  top: 9px;
  width: 42px;
  height: 6px;
  border-radius: 2px;
  opacity: 0.9;
}
.tt-line {
  position: absolute;
  left: 8px;
  top: 22px;
  width: 62px;
  height: 4px;
  border-radius: 2px;
  opacity: 0.5;
}
.theme-name {
  font-size: 11px;
  color: var(--text);
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 499;
}

/* ---- Responsive ribbon (container: app root inline size) ---- */
@container (max-width: 880px) {
  .ribbon-body {
    gap: 6px;
    min-height: 66px;
    padding: 6px 8px;
  }
  .rg.deco {
    display: none;
  }
  .rsep:has(+ .rg.deco:last-child) {
    display: none;
  }
  .rg-body {
    gap: 4px;
  }
  .rg-label {
    display: none;
  }
  .big-btn {
    min-width: 52px;
    padding: 6px;
  }
  .tool {
    width: 24px;
    height: 24px;
  }
}
@container (max-width: 640px) {
  .ribbon-body {
    flex-wrap: nowrap;
    gap: 4px;
    min-height: 58px;
    overflow-x: auto;
    padding: 6px;
  }
  .rg {
    flex: 0 0 auto;
  }
  .rg-body {
    gap: 3px;
  }
  .rg-label {
    display: none;
  }
  .rsep {
    margin: 6px 1px;
  }
}
</style>
