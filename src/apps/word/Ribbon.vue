<script setup>
import { ref } from 'vue'
import { EMOJIS, FONTS, HIGHLIGHTS, MARGINS, PAGE_SIZES, SIZES, SPACINGS, TEXT_COLORS } from './ribbon-data.js'

const props = defineProps({
  activeTab: { type: String, default: 'home' },
  fmt: { type: Object, required: true },
  foreColor: { type: String, default: '#1d1d1f' },
  highlight: { type: String, default: 'transparent' },
  spacing: { type: String, default: '1.15' },
  marginId: { type: String, default: 'normal' },
  orientation: { type: String, default: 'portrait' },
  pageSizeId: { type: String, default: 'letter' },
  columns: { type: Number, default: 1 },
})

const emit = defineEmits([
  'exec',
  'applyFont',
  'applySize',
  'applyColor',
  'applyHighlight',
  'setSpacing',
  'applyStyle',
  'setShading',
  'setBorder',
  'insertPageBreak',
  'insertTable',
  'insertEmoji',
  'insertLink',
  'multilevel',
  'setMargin',
  'setOrientation',
  'setPageSize',
  'setColumns',
])

const fontFamily = defineModel('fontFamily', { type: String, default: 'system' })
const fontSize = defineModel('fontSize', { type: String, default: '11' })

const openMenu = ref(null) // 'color' | 'highlight' | 'spacing' | 'shading' | 'borders' | 'symbol' | 'margins' | 'orientation' | 'size' | 'columns'

const FORMATS = [
  { id: 'bold', cmd: 'bold', cls: 'b', text: 'B', tip: 'Bold (⌘B)' },
  { id: 'italic', cmd: 'italic', cls: 'i', text: 'I', tip: 'Italic (⌘I)' },
  { id: 'underline', cmd: 'underline', cls: 'u', text: 'U', tip: 'Underline (⌘U)' },
  { id: 'strike', cmd: 'strikeThrough', cls: 's', text: 'S', tip: 'Strikethrough' },
]
// Line stacks inside a 24×24 box; each entry is [x1, x2] at row i (y = 6 + i*4).
const ALIGNS = [
  { id: 'left', cmd: 'justifyLeft', tip: 'Align Left', lines: [[4, 20], [4, 13], [4, 17], [4, 13]] },
  { id: 'center', cmd: 'justifyCenter', tip: 'Align Center', lines: [[4, 20], [7, 17], [5, 19], [7, 17]] },
  { id: 'right', cmd: 'justifyRight', tip: 'Align Right', lines: [[4, 20], [11, 20], [7, 20], [11, 20]] },
  { id: 'justify', cmd: 'justifyFull', tip: 'Justify', lines: [[4, 20], [4, 20], [4, 20], [4, 20]] },
]
const QUICK_STYLES = [
  { id: 'normal', name: 'Normal' },
  { id: 'h1', name: 'Heading 1' },
  { id: 'h2', name: 'Heading 2' },
  { id: 'title', name: 'Title' },
]
const BORDER_MODES = [
  { id: 'bottom', label: 'Bottom Border' },
  { id: 'all', label: 'All Borders' },
  { id: 'none', label: 'No Border' },
]
const ORIENTATIONS = [
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
]
const COLUMN_OPTIONS = [
  { n: 1, label: 'One' },
  { n: 2, label: 'Two' },
  { n: 3, label: 'Three' },
]

function toggleMenu(name) {
  openMenu.value = openMenu.value === name ? null : name
}
function pick(action, value) {
  openMenu.value = null
  emit(action, value)
}
// Grow / shrink font: hop to the next size in SIZES, then re-apply to the selection.
function stepFont(dir) {
  const cur = parseInt(fontSize.value, 10) || 11
  let next
  if (dir > 0) next = SIZES.find((s) => s > cur) ?? SIZES[SIZES.length - 1]
  else next = [...SIZES].reverse().find((s) => s < cur) ?? SIZES[0]
  fontSize.value = String(next)
  emit('applySize')
}
</script>

<template>
  <div class="ribbon">
    <!-- ============ HOME ============ -->
    <div v-if="props.activeTab === 'home'" class="panel">
      <!-- Clipboard -->
      <div class="group">
        <div class="group-body">
          <button class="rb-btn tall" title="Paste" @mousedown.prevent>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="6" y="5.5" width="12" height="15" rx="1.8" />
              <rect x="9" y="3" width="6" height="4" rx="1.2" fill="var(--window-bg)" />
              <line x1="9.5" y1="11" x2="14.5" y2="11" />
              <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
            </svg>
            <span>Paste</span>
          </button>
          <div class="stack">
            <button class="rb-btn row" title="Cut" @mousedown.prevent>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="6.5" cy="17.5" r="2.5" />
                <path d="M8.6 8.2L20 19" />
                <path d="M8.6 15.8L20 5" />
              </svg>
              <span>Cut</span>
            </button>
            <button class="rb-btn row" title="Copy" @mousedown.prevent>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="8" width="11" height="13" rx="1.8" />
                <path d="M15 8V5.8A1.8 1.8 0 0013.2 4H5.8A1.8 1.8 0 004 5.8v9.4A1.8 1.8 0 005.8 17H9" />
              </svg>
              <span>Copy</span>
            </button>
          </div>
        </div>
        <div class="group-label">Clipboard</div>
      </div>

      <!-- Font -->
      <div class="group">
        <div class="group-body col">
          <div class="rowline">
            <select v-model="fontFamily" class="font-select" title="Font" @change="emit('applyFont')" @mousedown.stop>
              <option v-for="f in FONTS" :key="f.id" :value="f.id">{{ f.label }}</option>
            </select>
            <select v-model="fontSize" class="size-select" title="Font size" @change="emit('applySize')" @mousedown.stop>
              <option v-for="s in SIZES" :key="s" :value="String(s)">{{ s }}</option>
            </select>
            <button class="rb-btn sq" title="Grow Font" @mousedown.prevent @click="stepFont(1)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <text x="2.5" y="18" font-size="14" font-weight="600" fill="currentColor" stroke="none">A</text>
                <path d="M17.5 6.5l3.2 5h-6.4z" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button class="rb-btn sq" title="Shrink Font" @mousedown.prevent @click="stepFont(-1)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <text x="2.5" y="18" font-size="14" font-weight="600" fill="currentColor" stroke="none">A</text>
                <path d="M17.5 11.5l3.2-5h-6.4z" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>
          <div class="rowline">
            <button
              v-for="b in FORMATS"
              :key="b.id"
              class="rb-btn sq ltr"
              :class="[b.cls, { on: fmt[b.id] }]"
              :title="b.tip"
              @mousedown.prevent
              @click="emit('exec', b.cmd)"
            >{{ b.text }}</button>
            <span class="vsep"></span>
            <div class="anchor">
              <button class="rb-btn sq" title="Text Highlight Color" @mousedown.prevent @click="toggleMenu('highlight')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <text x="3" y="13.5" font-size="11" font-weight="600" fill="currentColor" stroke="none">ab</text>
                  <rect x="2.5" y="16.5" width="17" height="4.5" rx="1" :fill="highlight === 'transparent' ? '#ffd60a' : highlight" stroke="none" />
                </svg>
              </button>
              <div v-if="openMenu === 'highlight'" class="menu-backdrop" @mousedown.prevent @click="openMenu = null"></div>
              <div v-if="openMenu === 'highlight'" class="dropdown glass-strong">
                <div class="dd-title">Text Highlight Color</div>
                <div class="swatch-grid">
                  <button
                    v-for="h in HIGHLIGHTS"
                    :key="h.value"
                    class="swatch-cell"
                    :class="{ on: highlight === h.value, none: h.value === 'transparent' }"
                    :title="h.label"
                    :style="h.value === 'transparent' ? {} : { background: h.value }"
                    @mousedown.prevent
                    @click="pick('applyHighlight', h.value)"
                  >{{ h.value === 'transparent' ? '✕' : '' }}</button>
                </div>
              </div>
            </div>
            <div class="anchor">
              <button class="rb-btn sq" title="Font Color" @mousedown.prevent @click="toggleMenu('color')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <text x="4.5" y="14.5" font-size="13" font-weight="600" fill="currentColor" stroke="none">A</text>
                  <rect x="3.5" y="16.5" width="17" height="4" rx="1" :fill="foreColor" stroke="none" />
                </svg>
              </button>
              <div v-if="openMenu === 'color'" class="menu-backdrop" @mousedown.prevent @click="openMenu = null"></div>
              <div v-if="openMenu === 'color'" class="dropdown glass-strong">
                <div class="dd-title">Font Color</div>
                <div class="swatch-grid">
                  <button
                    v-for="c in TEXT_COLORS"
                    :key="c.value"
                    class="swatch-cell"
                    :class="{ on: foreColor === c.value }"
                    :title="c.label"
                    :style="{ background: c.value }"
                    @mousedown.prevent
                    @click="pick('applyColor', c.value)"
                  ></button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="group-label">Font</div>
      </div>

      <!-- Paragraph -->
      <div class="group">
        <div class="group-body col">
          <div class="rowline">
            <button class="rb-btn sq" :class="{ on: fmt.ul }" title="Bullets" @mousedown.prevent @click="emit('exec', 'insertUnorderedList')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" />
                <line x1="10" y1="6" x2="20" y2="6" />
                <line x1="10" y1="12" x2="20" y2="12" />
                <line x1="10" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            <button class="rb-btn sq" :class="{ on: fmt.ol }" title="Numbering" @mousedown.prevent @click="emit('exec', 'insertOrderedList')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                <text x="2.5" y="7.5" font-size="6" font-weight="600" fill="currentColor" stroke="none">1</text>
                <text x="2.5" y="13.5" font-size="6" font-weight="600" fill="currentColor" stroke="none">2</text>
                <text x="2.5" y="19.5" font-size="6" font-weight="600" fill="currentColor" stroke="none">3</text>
                <line x1="10" y1="6" x2="20" y2="6" />
                <line x1="10" y1="12" x2="20" y2="12" />
                <line x1="10" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            <button class="rb-btn sq" title="Multilevel List" @mousedown.prevent @click="emit('multilevel')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                <circle cx="4.5" cy="5.5" r="1.3" fill="currentColor" stroke="none" />
                <line x1="8.5" y1="5.5" x2="14" y2="5.5" />
                <circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" />
                <line x1="13" y1="12" x2="18.5" y2="12" />
                <circle cx="13.5" cy="18.5" r="1.3" fill="currentColor" stroke="none" />
                <line x1="17.5" y1="18.5" x2="21.5" y2="18.5" />
              </svg>
            </button>
            <span class="vsep"></span>
            <button class="rb-btn sq" title="Decrease Indent" @mousedown.prevent @click="emit('exec', 'outdent')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="11" y1="6" x2="20" y2="6" />
                <line x1="11" y1="10" x2="20" y2="10" />
                <line x1="4" y1="14" x2="20" y2="14" />
                <line x1="11" y1="18" x2="20" y2="18" />
                <path d="M7.5 6.5L4 10l3.5 3.5" />
              </svg>
            </button>
            <button class="rb-btn sq" title="Increase Indent" @mousedown.prevent @click="emit('exec', 'indent')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="11" y1="6" x2="20" y2="6" />
                <line x1="11" y1="10" x2="20" y2="10" />
                <line x1="4" y1="14" x2="20" y2="14" />
                <line x1="11" y1="18" x2="20" y2="18" />
                <path d="M4.5 6.5L8 10l-3.5 3.5" />
              </svg>
            </button>
            <span class="vsep"></span>
            <div class="anchor">
              <button class="rb-btn sq" title="Line and Paragraph Spacing" @mousedown.prevent @click="toggleMenu('spacing')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="9" y1="6" x2="20" y2="6" />
                  <line x1="9" y1="12" x2="20" y2="12" />
                  <line x1="9" y1="18" x2="20" y2="18" />
                  <path d="M3.5 8.5L5.5 6l2 2.5" />
                  <path d="M3.5 15.5l2 2.5 2-2.5" />
                </svg>
              </button>
              <div v-if="openMenu === 'spacing'" class="menu-backdrop" @mousedown.prevent @click="openMenu = null"></div>
              <div v-if="openMenu === 'spacing'" class="dropdown glass-strong">
                <div class="dd-title">Line Spacing</div>
                <button
                  v-for="s in SPACINGS"
                  :key="s.value"
                  class="menu-item"
                  :class="{ on: spacing === s.value }"
                  @mousedown.prevent
                  @click="pick('setSpacing', s.value)"
                >{{ s.label }}</button>
              </div>
            </div>
          </div>
          <div class="rowline">
            <button
              v-for="a in ALIGNS"
              :key="a.id"
              class="rb-btn sq"
              :class="{ on: fmt.align === a.id }"
              :title="a.tip"
              @mousedown.prevent
              @click="emit('exec', a.cmd)"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                <line
                  v-for="(ln, i) in a.lines"
                  :key="i"
                  :x1="ln[0]" :x2="ln[1]" :y1="6 + i * 4" :y2="6 + i * 4"
                />
              </svg>
            </button>
            <span class="vsep"></span>
            <div class="anchor">
              <button class="rb-btn sq" title="Shading" @mousedown.prevent @click="toggleMenu('shading')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M10 4.5l7 7-8.5 8.5-7-7z" />
                  <path d="M10 4.5L12 2.5" />
                  <path d="M18.5 15.5c.9 1.3 1.7 2.3 1.7 3.2a1.7 1.7 0 11-3.4 0c0-.9.8-1.9 1.7-3.2z" />
                </svg>
              </button>
              <div v-if="openMenu === 'shading'" class="menu-backdrop" @mousedown.prevent @click="openMenu = null"></div>
              <div v-if="openMenu === 'shading'" class="dropdown glass-strong">
                <div class="dd-title">Shading</div>
                <div class="swatch-grid">
                  <button
                    v-for="c in TEXT_COLORS"
                    :key="c.value"
                    class="swatch-cell"
                    :title="c.label"
                    :style="{ background: c.value }"
                    @mousedown.prevent
                    @click="pick('setShading', c.value)"
                  ></button>
                  <button class="swatch-cell none" title="No Color" @mousedown.prevent @click="pick('setShading', 'transparent')">✕</button>
                </div>
              </div>
            </div>
            <div class="anchor">
              <button class="rb-btn sq" title="Borders" @mousedown.prevent @click="toggleMenu('borders')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="5" y="5" width="14" height="14" rx="1" />
                  <line x1="5" y1="18.2" x2="19" y2="18.2" stroke-width="2.6" />
                </svg>
              </button>
              <div v-if="openMenu === 'borders'" class="menu-backdrop" @mousedown.prevent @click="openMenu = null"></div>
              <div v-if="openMenu === 'borders'" class="dropdown glass-strong">
                <div class="dd-title">Borders</div>
                <button
                  v-for="b in BORDER_MODES"
                  :key="b.id"
                  class="menu-item"
                  @mousedown.prevent
                  @click="pick('setBorder', b.id)"
                >{{ b.label }}</button>
              </div>
            </div>
          </div>
        </div>
        <div class="group-label">Paragraph</div>
      </div>

      <!-- Styles -->
      <div class="group">
        <div class="group-body">
          <button
            v-for="s in QUICK_STYLES"
            :key="s.id"
            class="style-box"
            :class="'st-' + s.id"
            :title="s.name"
            @mousedown.prevent
            @click="emit('applyStyle', s.id)"
          >AaBbCc</button>
        </div>
        <div class="group-label">Styles</div>
      </div>

      <!-- Editing -->
      <div class="group deco">
        <div class="group-body">
          <div class="stack">
            <button class="rb-btn row" title="Find" @mousedown.prevent>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="5.5" />
                <line x1="14.8" y1="14.8" x2="20" y2="20" />
              </svg>
              <span>Find</span>
            </button>
            <button class="rb-btn row" title="Replace" @mousedown.prevent>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 8a8 8 0 0113.7-3L20 7.5" />
                <path d="M20 3.5v4h-4" />
                <path d="M20 16a8 8 0 01-13.7 3L4 16.5" />
                <path d="M4 20.5v-4h4" />
              </svg>
              <span>Replace</span>
            </button>
          </div>
        </div>
        <div class="group-label">Editing</div>
      </div>
    </div>

    <!-- ============ INSERT ============ -->
    <div v-else-if="props.activeTab === 'insert'" class="panel">
      <div class="group">
        <div class="group-body">
          <button class="rb-btn tall" title="Page Break" @mousedown.prevent @click="emit('insertPageBreak')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M7 3.5h6.5L18 8v12.5H7z" />
              <path d="M13.5 3.5V8H18" />
              <line x1="3.5" y1="14.5" x2="21" y2="14.5" stroke-dasharray="2.5 2" />
            </svg>
            <span>Page Break</span>
          </button>
        </div>
        <div class="group-label">Pages</div>
      </div>

      <div class="group">
        <div class="group-body">
          <button class="rb-btn tall" title="Table (3 × 3)" @mousedown.prevent @click="emit('insertTable')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="1" />
              <line x1="9.3" y1="5" x2="9.3" y2="19" />
              <line x1="14.7" y1="5" x2="14.7" y2="19" />
              <line x1="4" y1="9.7" x2="20" y2="9.7" />
              <line x1="4" y1="14.3" x2="20" y2="14.3" />
            </svg>
            <span>Table</span>
          </button>
        </div>
        <div class="group-label">Tables</div>
      </div>

      <div class="group">
        <div class="group-body">
          <button class="rb-btn tall" title="Picture" @mousedown.prevent>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="1.8" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="M5.5 17.5l4-4.5 3 3.2 3.2-3.7 2.8 5" />
            </svg>
            <span>Picture</span>
          </button>
          <button class="rb-btn tall" title="Shapes" @mousedown.prevent>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="8" cy="9" r="3.6" />
              <rect x="12.5" y="12.5" width="7" height="7" rx="1" />
              <path d="M16 3.5l3.6 5.8h-7.2z" />
            </svg>
            <span>Shapes</span>
          </button>
        </div>
        <div class="group-label">Illustrations</div>
      </div>

      <div class="group">
        <div class="group-body">
          <button class="rb-btn tall" title="Link" @mousedown.prevent @click="emit('insertLink')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 14.5a4.2 4.2 0 006 0l2.8-2.8a4.24 4.24 0 00-6-6l-1.5 1.5" />
              <path d="M14 9.5a4.2 4.2 0 00-6 0l-2.8 2.8a4.24 4.24 0 006 6l1.5-1.5" />
            </svg>
            <span>Link</span>
          </button>
        </div>
        <div class="group-label">Links</div>
      </div>

      <div class="group">
        <div class="group-body">
          <div class="anchor">
            <button class="rb-btn tall" title="Symbol" @mousedown.prevent @click="toggleMenu('symbol')">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" />
                <circle cx="9.2" cy="10" r="1.1" fill="currentColor" stroke="none" />
                <circle cx="14.8" cy="10" r="1.1" fill="currentColor" stroke="none" />
                <path d="M8.3 14a5.2 5.2 0 007.4 0" />
              </svg>
              <span>Symbol</span>
            </button>
            <div v-if="openMenu === 'symbol'" class="menu-backdrop" @mousedown.prevent @click="openMenu = null"></div>
            <div v-if="openMenu === 'symbol'" class="dropdown glass-strong dd-right emoji-dd">
              <div class="dd-title">Symbol</div>
              <div class="emoji-grid">
                <button v-for="e in EMOJIS" :key="e" class="emoji-cell" @mousedown.prevent @click="pick('insertEmoji', e)">{{ e }}</button>
              </div>
            </div>
          </div>
        </div>
        <div class="group-label">Symbols</div>
      </div>
    </div>

    <!-- ============ LAYOUT ============ -->
    <div v-else-if="props.activeTab === 'layout'" class="panel">
      <div class="group">
        <div class="group-body">
          <div class="anchor">
            <button class="rb-btn tall" title="Margins" @mousedown.prevent @click="toggleMenu('margins')">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="6" y="3.5" width="12" height="17" rx="1" />
                <rect x="8.8" y="6.5" width="6.4" height="11" stroke-dasharray="2 1.6" />
              </svg>
              <span>Margins</span>
            </button>
            <div v-if="openMenu === 'margins'" class="menu-backdrop" @mousedown.prevent @click="openMenu = null"></div>
            <div v-if="openMenu === 'margins'" class="dropdown glass-strong">
              <div class="dd-title">Margins</div>
              <button
                v-for="m in MARGINS"
                :key="m.id"
                class="menu-item wide-item"
                :class="{ on: marginId === m.id }"
                @mousedown.prevent
                @click="pick('setMargin', m.id)"
              >
                <span class="mi-label">{{ m.label }}</span>
                <span class="mi-desc">{{ m.desc }}</span>
              </button>
            </div>
          </div>

          <div class="anchor">
            <button class="rb-btn tall" title="Orientation" @mousedown.prevent @click="toggleMenu('orientation')">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3.5" y="8" width="17" height="10" rx="1" stroke-dasharray="2.5 2" />
                <rect x="7.5" y="4" width="8" height="14" rx="1" fill="var(--window-bg)" />
              </svg>
              <span>Orientation</span>
            </button>
            <div v-if="openMenu === 'orientation'" class="menu-backdrop" @mousedown.prevent @click="openMenu = null"></div>
            <div v-if="openMenu === 'orientation'" class="dropdown glass-strong">
              <div class="dd-title">Orientation</div>
              <button
                v-for="o in ORIENTATIONS"
                :key="o.id"
                class="menu-item"
                :class="{ on: orientation === o.id }"
                @mousedown.prevent
                @click="pick('setOrientation', o.id)"
              >{{ o.label }}</button>
            </div>
          </div>

          <div class="anchor">
            <button class="rb-btn tall" title="Size" @mousedown.prevent @click="toggleMenu('size')">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="6" y="3.5" width="12" height="14.5" rx="1" />
                <path d="M6 21h12" />
                <path d="M6 21l1.8-1.3M6 21l1.8 1.3M18 21l-1.8-1.3M18 21l-1.8 1.3" stroke-width="1.3" />
              </svg>
              <span>Size</span>
            </button>
            <div v-if="openMenu === 'size'" class="menu-backdrop" @mousedown.prevent @click="openMenu = null"></div>
            <div v-if="openMenu === 'size'" class="dropdown glass-strong">
              <div class="dd-title">Paper Size</div>
              <button
                v-for="p in PAGE_SIZES"
                :key="p.id"
                class="menu-item wide-item"
                :class="{ on: pageSizeId === p.id }"
                @mousedown.prevent
                @click="pick('setPageSize', p.id)"
              >
                <span class="mi-label">{{ p.label }}</span>
                <span class="mi-desc">{{ p.desc }}</span>
              </button>
            </div>
          </div>

          <div class="anchor">
            <button class="rb-btn tall" title="Columns" @mousedown.prevent @click="toggleMenu('columns')">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="4" y="5" width="16" height="14" rx="1" />
                <line x1="12" y1="5" x2="12" y2="19" />
              </svg>
              <span>Columns</span>
            </button>
            <div v-if="openMenu === 'columns'" class="menu-backdrop" @mousedown.prevent @click="openMenu = null"></div>
            <div v-if="openMenu === 'columns'" class="dropdown glass-strong dd-right">
              <div class="dd-title">Columns</div>
              <button
                v-for="c in COLUMN_OPTIONS"
                :key="c.n"
                class="menu-item"
                :class="{ on: columns === c.n }"
                @mousedown.prevent
                @click="pick('setColumns', c.n)"
              >{{ c.label }}</button>
            </div>
          </div>
        </div>
        <div class="group-label">Page Setup</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ribbon {
  flex-shrink: 0;
  background: var(--window-bg);
  border-bottom: 0.5px solid var(--border);
  padding: 4px 12px 2px;
}
.panel {
  display: flex;
  align-items: stretch;
  min-height: 76px;
}
.group {
  display: flex;
  flex-direction: column;
  border-right: 0.5px solid var(--border);
  padding: 0 8px;
  margin-right: 2px;
}
.group:first-child {
  padding-left: 0;
}
.group:last-child {
  border-right: none;
}
.group-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 3px;
}
.group-body.col {
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 4px;
}
.rowline {
  display: flex;
  align-items: center;
  gap: 2px;
}
.group-label {
  text-align: center;
  font-size: 10px;
  color: var(--text-dim);
  padding: 2px 0 1px;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.font-select,
.size-select {
  font: inherit;
  font-size: 12px;
  color: var(--text);
  background: var(--glass);
  border: 0.5px solid var(--border);
  border-radius: 5px;
  padding: 2px 5px;
  height: 23px;
}
.font-select {
  width: 138px;
}
.size-select {
  width: 50px;
}
.rb-btn {
  min-width: 24px;
  height: 24px;
  padding: 0 5px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 12.5px;
  color: #444;
}
:root[data-theme='dark'] .rb-btn {
  color: #d2d2d2;
}
.rb-btn:hover {
  background: var(--hover);
}
.rb-btn.on {
  background: var(--selection);
  box-shadow: inset 0 0 0 0.5px var(--accent);
}
.rb-btn.sq {
  width: 26px;
  padding: 0;
}
.rb-btn.ltr {
  font-size: 13px;
}
.rb-btn.ltr.b { font-weight: 700; }
.rb-btn.ltr.i { font-style: italic; font-family: Georgia, serif; }
.rb-btn.ltr.u { text-decoration: underline; }
.rb-btn.ltr.s { text-decoration: line-through; }
.rb-btn.tall {
  flex-direction: column;
  height: 58px;
  font-size: 11px;
  gap: 3px;
  padding: 3px 10px;
  color: #444;
}
:root[data-theme='dark'] .rb-btn.tall {
  color: #d2d2d2;
}
.rb-btn.row {
  height: 22px;
  justify-content: flex-start;
  font-size: 11.5px;
  padding: 0 7px 0 5px;
}
.vsep {
  width: 0.5px;
  height: 18px;
  margin: 0 3px;
  background: var(--border);
}
.anchor {
  position: relative;
}
.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 499;
}
.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 500;
  min-width: 140px;
  border-radius: 10px;
  border: 0.5px solid var(--border);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.22);
  padding: 8px;
}
.dropdown.dd-right {
  left: auto;
  right: 0;
}
.dd-title {
  font-size: 10.5px;
  color: var(--text-dim);
  padding: 0 4px 6px;
}
.swatch-grid {
  display: grid;
  grid-template-columns: repeat(4, 26px);
  gap: 5px;
}
.swatch-cell {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 0.5px solid var(--border);
  font-size: 13px;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
}
.swatch-cell.on {
  box-shadow: 0 0 0 2px var(--accent);
}
.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--text);
}
.menu-item:hover {
  background: var(--hover);
}
.menu-item.on {
  background: var(--selection);
}
.wide-item {
  min-width: 190px;
}
.mi-label {
  display: block;
}
.mi-desc {
  display: block;
  font-size: 10.5px;
  color: var(--text-dim);
}

/* Styles gallery */
.style-box {
  width: 62px;
  height: 46px;
  border: 0.5px solid var(--border);
  border-radius: 4px;
  background: var(--window-bg);
  color: var(--text);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.style-box:hover {
  border-color: #2b579a;
  box-shadow: 0 0 0 1px #2b579a;
}
.style-box.st-h1 {
  font-size: 14px;
  font-weight: 700;
  color: #2b579a;
}
.style-box.st-h2 {
  font-size: 13px;
  font-weight: 600;
  color: #2b579a;
}
.style-box.st-title {
  font-size: 15px;
  font-weight: 300;
}
:root[data-theme='dark'] .style-box.st-h1,
:root[data-theme='dark'] .style-box.st-h2 {
  color: #8db3e2;
}

/* Symbol picker */
.emoji-dd {
  min-width: 0;
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 28px);
  gap: 2px;
}
.emoji-cell {
  width: 28px;
  height: 28px;
  font-size: 17px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.emoji-cell:hover {
  background: var(--hover);
}

/* ---- Responsive ribbon (container: app root inline size) ---- */
@container (max-width: 880px) {
  .panel {
    min-height: 62px;
  }
  .group {
    padding: 0 5px;
  }
  .group.deco {
    display: none;
  }
  .group:has(+ .group.deco:last-child) {
    border-right: none;
  }
  .group-body {
    gap: 2px;
  }
  .group-label {
    display: none;
  }
  .rb-btn.tall {
    padding: 3px 6px;
  }
}
@container (max-width: 640px) {
  .panel {
    flex-wrap: nowrap;
    min-height: 56px;
    overflow-x: auto;
  }
  .group {
    flex: 0 0 auto;
  }
  .group-body {
    gap: 2px;
  }
  .group-label {
    display: none;
  }
}
</style>
