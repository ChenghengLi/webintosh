<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSystemStore } from '../../stores/system'
import { useWindowsStore } from '../../stores/windows'
import { HOME, exists, getNode, listDir, makeDir, normalizePath, readFile, writeFile } from '@/fs.js'
import { FONTS, MARGINS, PAGE_SIZES } from './ribbon-data.js'
import Ribbon from './Ribbon.vue'
import Backstage from './Backstage.vue'

const props = defineProps({ openPath: { type: String, default: '' } })

const sys = useSystemStore()
const wm = useWindowsStore()
const windowId = inject('windowId', null)

const DOCS = HOME + '/Documents'

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'insert', label: 'Insert' },
  { id: 'layout', label: 'Layout' },
]

const editor = ref(null)
const activeTab = ref('home')
const backstage = ref(null) // null | 'new' | 'open' | 'save' | 'info'
const docName = ref('Document')
const filePath = ref('') // '' = never saved
const dirty = ref(false)
const contentText = ref('') // plain-text mirror for the live word count
const docFiles = ref([])
const fontFamily = ref('system')
const fontSize = ref('11')
const foreColor = ref('#1d1d1f')
const highlight = ref('transparent')
const spacing = ref('1.15')
const marginId = ref('normal')
const orientation = ref('portrait')
const pageSizeId = ref('letter')
const columns = ref(1)
const zoom = ref(100)
const shared = ref(false)
const fmt = ref({ bold: false, italic: false, underline: false, strike: false, align: 'left', ul: false, ol: false })

const margin = computed(() => MARGINS.find((m) => m.id === marginId.value) || MARGINS[1])
const pageSize = computed(() => PAGE_SIZES.find((p) => p.id === pageSizeId.value) || PAGE_SIZES[0])
const pageDims = computed(() => {
  const { w, h } = pageSize.value
  return orientation.value === 'landscape' ? { w: h, h: w } : { w, h }
})
const editorMinH = computed(() => Math.max(420, pageDims.value.h - 240))
const words = computed(() => {
  const t = contentText.value.trim()
  return t ? t.split(/\s+/).length : 0
})
const saveState = computed(() =>
  dirty.value ? 'Unsaved changes' : filePath.value ? 'Saved to Documents' : 'Not saved yet',
)

// ---- Editing ---------------------------------------------------------------

function onInput() {
  contentText.value = editor.value ? editor.value.innerText : ''
  dirty.value = true
}

function focusEditor() {
  if (editor.value) editor.value.focus()
}

function exec(cmd, value = null) {
  if (!editor.value) return
  editor.value.focus()
  document.execCommand(cmd, false, value)
  refreshFmt()
  onInput()
}

function applyFont() {
  const f = FONTS.find((x) => x.id === fontFamily.value) || FONTS[0]
  exec('fontName', f.css)
}

// execCommand('fontSize') only takes legacy 1–7, so mark with size 7 and
// rewrite the marker as an inline pixel size.
function applySize() {
  if (!editor.value) return
  editor.value.focus()
  document.execCommand('fontSize', false, '7')
  editor.value.querySelectorAll('font[size="7"]').forEach((el) => {
    el.removeAttribute('size')
    el.style.fontSize = fontSize.value + 'px'
  })
  onInput()
}

function applyColor(c) {
  foreColor.value = c
  exec('foreColor', c)
}

function applyHighlight(c) {
  highlight.value = c
  if (!editor.value) return
  editor.value.focus()
  try {
    document.execCommand('hiliteColor', false, c)
  } catch {
    document.execCommand('backColor', false, c)
  }
  onInput()
}

// Run fn over the top-level blocks touched by the selection (all blocks when
// the selection is outside the editor).
function forEachBlock(fn) {
  const ed = editor.value
  if (!ed) return
  let blocks = []
  const sel = window.getSelection()
  if (sel && sel.rangeCount && ed.contains(sel.anchorNode)) {
    const range = sel.getRangeAt(0)
    blocks = Array.from(ed.children).filter((el) => {
      try {
        return range.intersectsNode(el)
      } catch {
        return false
      }
    })
    if (!blocks.length) {
      let n = sel.anchorNode
      while (n && n.parentElement !== ed) n = n.parentElement
      if (n && n !== ed) blocks = [n]
    }
  }
  if (!blocks.length) blocks = Array.from(ed.children)
  blocks.forEach((el) => {
    if (el.style) fn(el)
  })
}

function setSpacing(s) {
  spacing.value = s
  const ed = editor.value
  if (!ed) return
  ed.focus()
  forEachBlock((el) => {
    el.style.lineHeight = s
  })
  ed.style.lineHeight = s // default for new paragraphs
  onInput()
}

function setShading(c) {
  if (!editor.value) return
  editor.value.focus()
  forEachBlock((el) => {
    el.style.background = c === 'transparent' ? '' : c
  })
  onInput()
}

function setBorder(mode) {
  if (!editor.value) return
  editor.value.focus()
  forEachBlock((el) => {
    el.style.border = ''
    el.style.borderBottom = ''
    if (mode === 'all') el.style.border = '1px solid #8a8a8a'
    else if (mode === 'bottom') el.style.borderBottom = '1px solid #8a8a8a'
  })
  onInput()
}

// Quick styles gallery: Normal / Heading 1 / Heading 2 / Title.
const STYLE_TAGS = { normal: 'div', h1: 'h1', h2: 'h2', title: 'div' }
function applyStyle(id) {
  if (!editor.value) return
  exec('formatBlock', '<' + (STYLE_TAGS[id] || 'div') + '>')
  editor.value.focus()
  forEachBlock((el) => {
    el.style.fontSize = ''
    el.style.fontWeight = ''
    if (id === 'title') {
      el.style.fontSize = '28px'
      el.style.fontWeight = '300'
    }
  })
  onInput()
}

function refreshFmt() {
  if (!editor.value) return
  try {
    fmt.value = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
      align: document.queryCommandState('justifyCenter')
        ? 'center'
        : document.queryCommandState('justifyRight')
          ? 'right'
          : document.queryCommandState('justifyFull')
            ? 'justify'
            : 'left',
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList'),
    }
  } catch {
    /* queryCommandState unsupported — keep current button state */
  }
}

function onSelectionChange() {
  const sel = window.getSelection()
  if (!sel || !editor.value) return
  if (editor.value.contains(sel.anchorNode)) refreshFmt()
}

function onKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
    return
  }
  if (e.key === 'Tab') {
    e.preventDefault()
    document.execCommand('insertText', false, '\t')
    onInput()
  }
}

// ---- Insert tab --------------------------------------------------------------

function insertHTML(html) {
  if (!editor.value) return
  editor.value.focus()
  document.execCommand('insertHTML', false, html)
  onInput()
}

function insertPageBreak() {
  insertHTML('<div class="page-break" contenteditable="false">Page Break</div><div><br></div>')
}

function insertTable() {
  let html = '<table style="border-collapse:collapse;width:100%;margin:8px 0">'
  for (let r = 0; r < 3; r++) {
    html += '<tr>'
    for (let c = 0; c < 3; c++) {
      html += '<td style="border:1px solid #8a8a8a;padding:6px 10px;min-width:48px">&nbsp;</td>'
    }
    html += '</tr>'
  }
  html += '</table><div><br></div>'
  insertHTML(html)
}

function insertEmoji(e) {
  if (!editor.value) return
  editor.value.focus()
  document.execCommand('insertText', false, e)
  onInput()
}

function insertLink() {
  if (!editor.value) return
  const url = window.prompt('Link URL:', 'https://')
  if (!url) return
  exec('createLink', url)
}

function multilevel() {
  exec('insertUnorderedList')
  exec('indent')
}

// ---- Top bar -----------------------------------------------------------------

function share() {
  sys.clipboard = contentText.value
  shared.value = true
  setTimeout(() => {
    shared.value = false
  }, 1500)
}

function zoomStep(d) {
  zoom.value = Math.min(200, Math.max(50, zoom.value + d))
}

// ---- File integration ----------------------------------------------------------

function docTitle() {
  const first = (editor.value ? editor.value.innerText : '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)
  const t = (first || 'Document').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60)
  return t || 'Document'
}

function save() {
  if (!editor.value) return
  const name = docTitle() + '.doc.html'
  if (!exists(DOCS)) makeDir(DOCS)
  const path = DOCS + '/' + name
  if (writeFile(path, editor.value.innerHTML)) {
    docName.value = name.replace(/\.doc\.html$/, '')
    filePath.value = path
    dirty.value = false
    backstage.value = null
  }
}

function refreshDocList() {
  const items = listDir(DOCS) || []
  docFiles.value = items
    .filter((i) => i.type === 'file' && /\.doc\.html$/i.test(i.name))
    .map((i) => DOCS + '/' + i.name)
}

function openFile(path) {
  if (dirty.value && !window.confirm('Discard unsaved changes to “' + docName.value + '”?')) return
  const data = readFile(path)
  if (data == null || !editor.value) return
  editor.value.innerHTML = data
  contentText.value = editor.value.innerText
  docName.value = path.split('/').pop().replace(/\.doc\.html$/, '')
  filePath.value = path
  dirty.value = false
  backstage.value = null
  refreshFmt()
  nextTick(focusEditor)
}

function newDoc() {
  if (dirty.value && !window.confirm('Discard unsaved changes to “' + docName.value + '”?')) return
  if (!editor.value) return
  editor.value.innerHTML = ''
  contentText.value = ''
  docName.value = 'Document'
  filePath.value = ''
  dirty.value = false
  backstage.value = null
  fmt.value = { bold: false, italic: false, underline: false, strike: false, align: 'left', ul: false, ol: false }
  focusEditor()
}

function openBackstage(view) {
  backstage.value = view
  if (view === 'open') refreshDocList()
}

// ---- Window title sync ---------------------------------------------------------

watch(
  [docName, dirty],
  () => {
    if (windowId == null) return
    const w = wm.windows.find((win) => win.id === windowId)
    if (w) w.title = (dirty.value ? '● ' : '') + docName.value + '.doc'
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange)
  if (editor.value) editor.value.style.lineHeight = spacing.value
  if (props.openPath) {
    const p = normalizePath(props.openPath, HOME)
    if (getNode(p)?.type === 'file') openFile(p)
  }
  focusEditor()
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
})
</script>

<template>
  <div class="app-root word">
    <!-- Top bar: traffic-light-safe left, centered doc title + save state, Share right -->
    <div class="topbar">
      <div class="tb-safe"></div>
      <div class="tb-title" :title="filePath || 'Not saved yet'">
        <span class="tb-name">{{ docName }}.doc</span>
        <span class="tb-sub">{{ saveState }}</span>
      </div>
      <div class="tb-actions">
        <button class="tb-save" title="Save (⌘S)" @click="save">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 4h11l3.5 3.5V20H5z" />
            <rect x="8.5" y="4" width="7" height="5" />
            <rect x="8.5" y="13" width="7" height="7" />
          </svg>
        </button>
        <button class="share-btn" :class="{ done: shared }" title="Share" @click="share">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 14.5V4" />
            <path d="M8.2 7.4L12 3.6l3.8 3.8" />
            <path d="M5 11.5V19a1.6 1.6 0 001.6 1.6h10.8A1.6 1.6 0 0019 19v-7.5" />
          </svg>
          <span>{{ shared ? 'Copied' : 'Share' }}</span>
        </button>
      </div>
    </div>

    <!-- Ribbon tab row -->
    <div class="tab-row">
      <button class="tab file-tab" :class="{ active: !!backstage }" @click="openBackstage('new')">File</button>
      <button
        v-for="t in TABS"
        :key="t.id"
        class="tab"
        :class="{ active: !backstage && activeTab === t.id }"
        @click="activeTab = t.id; backstage = null"
      >{{ t.label }}</button>
    </div>

    <Ribbon
      v-if="!backstage"
      v-model:font-family="fontFamily"
      v-model:font-size="fontSize"
      :active-tab="activeTab"
      :fmt="fmt"
      :fore-color="foreColor"
      :highlight="highlight"
      :spacing="spacing"
      :margin-id="marginId"
      :orientation="orientation"
      :page-size-id="pageSizeId"
      :columns="columns"
      @exec="exec"
      @apply-font="applyFont"
      @apply-size="applySize"
      @apply-color="applyColor"
      @apply-highlight="applyHighlight"
      @set-spacing="setSpacing"
      @apply-style="applyStyle"
      @set-shading="setShading"
      @set-border="setBorder"
      @insert-page-break="insertPageBreak"
      @insert-table="insertTable"
      @insert-emoji="insertEmoji"
      @insert-link="insertLink"
      @multilevel="multilevel"
      @set-margin="marginId = $event"
      @set-orientation="orientation = $event"
      @set-page-size="pageSizeId = $event"
      @set-columns="columns = $event"
    />

    <!-- Editing canvas -->
    <div v-show="!backstage" class="canvas">
      <div class="page-wrap" :style="{ zoom: zoom / 100 }">
        <div
          class="page"
          :style="{
            padding: margin.padding,
            width: pageDims.w + 'px',
            maxWidth: pageDims.w + 'px',
            minHeight: pageDims.h + 'px',
          }"
        >
          <div
            ref="editor"
            class="editor"
            contenteditable="true"
            spellcheck="false"
            aria-label="Document body"
            :style="{
              minHeight: editorMinH + 'px',
              columnCount: columns > 1 ? columns : '',
              columnGap: columns > 1 ? '48px' : '',
            }"
            @input="onInput"
            @keydown="onKeydown"
          ></div>
        </div>
      </div>
    </div>

    <Backstage
      v-if="backstage"
      :view="backstage"
      :doc-files="docFiles"
      :file-path="filePath"
      :words="words"
      :chars="contentText.length"
      :save-state="saveState"
      :suggested-name="docTitle() + '.doc.html'"
      @navigate="openBackstage"
      @new="newDoc"
      @open="openFile"
      @save="save"
      @close="backstage = null"
    />

    <!-- Status bar -->
    <div class="statusbar">
      <span class="st">Page 1 of 1</span>
      <span class="st-sep"></span>
      <span class="st">{{ words }} {{ words === 1 ? 'word' : 'words' }}</span>
      <span class="st-sep"></span>
      <span class="st">English (US)</span>
      <span class="st-spacer"></span>
      <button class="st zb" title="Zoom out" @click="zoomStep(-10)">−</button>
      <input v-model.number="zoom" class="zoom-slider" type="range" min="50" max="200" step="5" title="Zoom" />
      <button class="st zb" title="Zoom in" @click="zoomStep(10)">+</button>
      <span class="st zoom-pct">{{ zoom }}%</span>
    </div>
  </div>
</template>

<style scoped>
.word {
  background: var(--window-bg);
  color: var(--text);
  overflow: hidden;
  container-type: inline-size;
}

/* ---- Top bar ------------------------------------------------------------- */
.topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: 46px;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
  position: relative;
}
.tb-safe {
  width: 76px; /* keep clear of the window traffic lights */
  flex-shrink: 0;
}
.tb-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 46%;
  pointer-events: none;
  line-height: 1.25;
}
.tb-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.tb-sub {
  font-size: 10.5px;
  color: var(--text-dim);
  white-space: nowrap;
}
.tb-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
}
.tb-save {
  width: 28px;
  height: 26px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #2b579a;
}
:root[data-theme='dark'] .tb-save {
  color: #8db3e2;
}
.tb-save:hover {
  background: var(--hover);
}
.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #2b579a;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 14px;
  border-radius: 13px;
}
.share-btn:hover {
  background: #1f4173;
}
.share-btn.done {
  background: #217346;
}

/* ---- Tab row ------------------------------------------------------------- */
.tab-row {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 0 12px;
  background: var(--window-bg);
  border-bottom: 0.5px solid var(--border);
}
.tab {
  padding: 6px 13px 5px;
  font-size: 12.5px;
  color: var(--text-dim);
  border-bottom: 2px solid transparent;
  margin-bottom: -0.5px;
}
.tab:hover {
  color: var(--text);
}
.tab.active {
  color: var(--text);
  border-bottom-color: #2b579a;
  font-weight: 600;
}
.file-tab {
  color: #2b579a;
  font-weight: 700;
}
.file-tab.active {
  color: #2b579a;
  border-bottom-color: #2b579a;
}
:root[data-theme='dark'] .file-tab {
  color: #8db3e2;
}

/* ---- Canvas + page -------------------------------------------------------------- */
.canvas {
  flex: 1;
  overflow: auto;
  background: #e6e6e6;
  padding: 24px 16px 48px;
}
:root[data-theme='dark'] .canvas {
  background: #0e0e11;
}
.page-wrap {
  width: fit-content;
  margin: 0 auto;
}
.page {
  background: #fff;
  color: #1d1d1f;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14), 0 8px 28px rgba(0, 0, 0, 0.12);
}
:root[data-theme='dark'] .page {
  background: #1b1b1f;
  color: #f2f2f7;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 8px 28px rgba(0, 0, 0, 0.45);
}
.editor {
  outline: none;
  font-size: 15px;
  caret-color: #2b579a;
  word-wrap: break-word;
}
.editor:empty::before {
  content: 'Start typing…';
  color: #9a9aa0;
  pointer-events: none;
}
.editor :deep(h1) {
  font-size: 22px;
  font-weight: 600;
  color: #2b579a;
  margin: 10px 0 4px;
}
.editor :deep(h2) {
  font-size: 17px;
  font-weight: 600;
  color: #2b579a;
  margin: 8px 0 3px;
}
:root[data-theme='dark'] .editor :deep(h1),
:root[data-theme='dark'] .editor :deep(h2) {
  color: #8db3e2;
}
.editor :deep(ul),
.editor :deep(ol) {
  padding-left: 26px;
}
.editor :deep(a) {
  color: #2b579a;
}
:root[data-theme='dark'] .editor :deep(a) {
  color: #8db3e2;
}
.editor :deep(table) {
  border-collapse: collapse;
}
.editor :deep(.page-break) {
  margin: 14px 0;
  padding: 5px 0;
  border-top: 1.5px dashed #8a8a8a;
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8a8a8a;
  -webkit-user-select: none;
  user-select: none;
}

/* ---- Status bar --------------------------------------------------------------------- */
.statusbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #2b579a;
  color: #fff;
  padding: 3px 14px;
  font-size: 11.5px;
}
.st {
  white-space: nowrap;
}
.st-sep {
  width: 0.5px;
  height: 12px;
  background: rgba(255, 255, 255, 0.35);
}
.st-spacer {
  flex: 1;
}
.zb {
  color: #fff;
  font-size: 13px;
  width: 20px;
  height: 18px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.zb:hover {
  background: rgba(255, 255, 255, 0.15);
}
.zoom-slider {
  width: 110px;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #fff;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}
.zoom-pct {
  min-width: 38px;
  text-align: right;
}
</style>
