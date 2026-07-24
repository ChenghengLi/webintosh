<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useWindowsStore } from '../../stores/windows'
import {
  HOME,
  exists,
  fileIcon,
  getNode,
  listDir,
  makeDir,
  normalizePath,
  readFile,
  writeFile,
} from '@/fs.js'

const props = defineProps({ openPath: { type: String, default: '' } })

const wm = useWindowsStore()
const windowId = inject('windowId', null)

const DOCS = HOME + '/Documents'
const FONT_SIZES = [12, 14, 18, 24, 36]
const ALIGNS = [
  { id: 'left', label: 'Left', cmd: 'justifyLeft', lines: [[1, 13], [1, 9], [1, 13], [1, 9]] },
  { id: 'center', label: 'Center', cmd: 'justifyCenter', lines: [[1, 13], [3, 11], [1, 13], [3, 11]] },
  { id: 'right', label: 'Right', cmd: 'justifyRight', lines: [[1, 13], [5, 13], [1, 13], [5, 13]] },
]
const FORMATS = [
  { id: 'bold', cmd: 'bold', cls: 'b', text: 'B', tip: 'Bold (⌘B)' },
  { id: 'italic', cmd: 'italic', cls: 'i', text: 'I', tip: 'Italic (⌘I)' },
  { id: 'underline', cmd: 'underline', cls: 'u', text: 'U', tip: 'Underline (⌘U)' },
]

const editor = ref(null)
const title = ref('Untitled.txt')
const filePath = ref('') // '' = never saved to the virtual FS
const dirty = ref(false)
const plainMode = ref(false)
const openMenuOpen = ref(false)
const textFiles = ref([])
const content = ref('') // plain-text mirror of the editor, for word/char counts
const flash = ref('')
const flashOk = ref(false)
const fontSize = ref('14')
const fmt = ref({ bold: false, italic: false, underline: false, align: 'left' })
let flashTimer = null

// ---- Editing ---------------------------------------------------------------

function onInput() {
  content.value = editor.value ? editor.value.innerText : ''
  dirty.value = true
}

function focusEditor() {
  if (editor.value) editor.value.focus()
}

function exec(cmd) {
  if (plainMode.value || !editor.value) return
  editor.value.focus()
  document.execCommand(cmd, false, null)
  refreshFmt()
  onInput()
}

// execCommand('fontSize') only accepts legacy 1–7 values, so mark the
// selection with size 7 and rewrite the marker as an inline pixel size.
function applyFontSize() {
  if (plainMode.value || !editor.value) return
  editor.value.focus()
  document.execCommand('fontSize', false, '7')
  editor.value.querySelectorAll('font[size="7"]').forEach((el) => {
    el.removeAttribute('size')
    el.style.fontSize = fontSize.value + 'px'
  })
  onInput()
}

function refreshFmt() {
  if (!editor.value || plainMode.value) return
  try {
    fmt.value = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      align: document.queryCommandState('justifyCenter')
        ? 'center'
        : document.queryCommandState('justifyRight')
          ? 'right'
          : 'left',
    }
  } catch {
    /* queryCommandState unsupported — leave buttons as they are */
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

// ---- File integration --------------------------------------------------------

function sanitizedTitle() {
  let t = title.value.replace(/[\\/:*?"<>|]/g, '').trim()
  if (!t) t = 'Untitled.txt'
  if (!/\.[a-z0-9]+$/i.test(t)) t += '.txt'
  return t
}

function save() {
  if (!editor.value) return
  const name = sanitizedTitle()
  if (name !== title.value) title.value = name
  if (!exists(DOCS)) makeDir(DOCS)
  const path = DOCS + '/' + name
  if (writeFile(path, editor.value.innerText)) {
    filePath.value = path
    dirty.value = false
    showFlash('Saved', true)
  } else {
    showFlash('Save failed')
  }
}

function collectTextFiles(dirPath, depth = 0) {
  if (depth > 5) return []
  const out = []
  for (const item of listDir(dirPath) || []) {
    const p = dirPath + '/' + item.name
    if (item.type === 'dir') out.push(...collectTextFiles(p, depth + 1))
    else if (/\.(txt|md)$/i.test(item.name)) out.push(p)
  }
  return out
}

function toggleOpenMenu() {
  openMenuOpen.value = !openMenuOpen.value
  if (openMenuOpen.value) textFiles.value = collectTextFiles(HOME)
}

function openFile(path) {
  if (dirty.value && !window.confirm('Discard unsaved changes to “' + title.value + '”?')) return
  const data = readFile(path)
  if (data == null || !editor.value) return
  editor.value.innerText = data
  content.value = data
  title.value = path.split('/').pop()
  filePath.value = path
  plainMode.value = true // .txt/.md open as plain text, like real TextEdit
  dirty.value = false
  openMenuOpen.value = false
  fmt.value = { bold: false, italic: false, underline: false, align: 'left' }
  nextTick(focusEditor)
}

function newDoc() {
  if (dirty.value && !window.confirm('Discard unsaved changes to “' + title.value + '”?')) return
  if (!editor.value) return
  editor.value.innerHTML = ''
  content.value = ''
  title.value = 'Untitled.txt'
  filePath.value = ''
  plainMode.value = false
  dirty.value = false
  fmt.value = { bold: false, italic: false, underline: false, align: 'left' }
  focusEditor()
}

function togglePlain() {
  if (!editor.value) return
  if (!plainMode.value) {
    const t = editor.value.innerText // reading + writing innerText strips all formatting
    editor.value.innerText = t
    content.value = t
    plainMode.value = true
    dirty.value = true
    fmt.value = { bold: false, italic: false, underline: false, align: 'left' }
  } else {
    plainMode.value = false
  }
  focusEditor()
}

function showFlash(msg, ok = false) {
  flash.value = msg
  flashOk.value = ok
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.value = ''), 1600)
}

// ---- Status bar + window title ----------------------------------------------

const words = computed(() => {
  const t = content.value.trim()
  return t ? t.split(/\s+/).length : 0
})
const chars = computed(() => content.value.length)
const statusPath = computed(
  () => filePath.value || 'Not saved — will save to ' + DOCS + '/' + sanitizedTitle(),
)
const shortPath = (p) => (p.startsWith(HOME + '/') ? '~/' + p.slice(HOME.length + 1) : p)
const baseName = (p) => p.split('/').pop()

// Keep the window title (WindowFrame) in sync, with a dirty dot like macOS.
watch(
  [title, dirty],
  () => {
    if (windowId == null) return
    const w = wm.windows.find((win) => win.id === windowId)
    if (w) w.title = (dirty.value ? '● ' : '') + title.value
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange)
  if (props.openPath) {
    const p = normalizePath(props.openPath, HOME)
    if (getNode(p)?.type === 'file') openFile(p)
  }
  focusEditor()
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
  clearTimeout(flashTimer)
})
</script>

<template>
  <div class="app-root textedit">
    <!-- Formatting toolbar -->
    <div class="toolbar glass">
      <div class="tb-group">
        <button class="tb-btn" title="New document" @click="newDoc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>
        <div class="menu-anchor">
          <button class="tb-btn wide" :class="{ on: openMenuOpen }" title="Open a text file" @click.stop="toggleOpenMenu">
            Open <span class="chev">▾</span>
          </button>
          <div v-if="openMenuOpen" class="menu-backdrop" @click="openMenuOpen = false"></div>
          <div v-if="openMenuOpen" class="dropdown glass-strong">
            <div class="dropdown-title">Text files in your home folder</div>
            <div v-if="!textFiles.length" class="menu-empty">No .txt or .md files found</div>
            <button v-for="f in textFiles" :key="f" class="menu-item" @click="openFile(f)">
              <span class="mi-icon">{{ fileIcon(baseName(f), 'file') }}</span>
              <span class="mi-path">{{ shortPath(f) }}</span>
            </button>
          </div>
        </div>
        <button class="tb-btn wide" title="Save (⌘S)" @click="save">Save</button>
      </div>

      <div class="title-wrap">
        <span v-if="dirty" class="dirty-dot" title="Unsaved changes">●</span>
        <input class="title-input" v-model="title" spellcheck="false" aria-label="Document name" @keydown.enter.prevent="focusEditor" />
        <span v-if="flash" class="flash"><svg v-if="flashOk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{{ flash }}</span>
      </div>

      <div class="tb-group">
        <select class="size-select" v-model="fontSize" :disabled="plainMode" title="Font size" @change="applyFontSize">
          <option v-for="s in FONT_SIZES" :key="s" :value="String(s)">{{ s }}</option>
        </select>
        <button
          v-for="b in FORMATS"
          :key="b.id"
          class="tb-btn fmt"
          :class="[b.cls, { on: fmt[b.id] }]"
          :disabled="plainMode"
          :title="b.tip"
          @mousedown.prevent
          @click="exec(b.cmd)"
        >{{ b.text }}</button>
        <span class="sep"></span>
        <button
          v-for="a in ALIGNS"
          :key="a.id"
          class="tb-btn fmt"
          :class="{ on: fmt.align === a.id }"
          :disabled="plainMode"
          :title="'Align ' + a.label"
          @mousedown.prevent
          @click="exec(a.cmd)"
        >
          <svg width="15" height="12" viewBox="0 0 14 12" aria-hidden="true">
            <line v-for="(ln, i) in a.lines" :key="i" :x1="ln[0]" :x2="ln[1]" :y1="1.5 + i * 3" :y2="1.5 + i * 3"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
        <span class="sep"></span>
        <button
          class="tb-btn wide"
          :class="{ on: plainMode }"
          :title="plainMode ? 'Switch back to rich text' : 'Strip all formatting'"
          @click="togglePlain"
        >{{ plainMode ? 'Make Rich Text' : 'Make Plain Text' }}</button>
      </div>
    </div>

    <!-- Paper -->
    <div class="paper-wrap">
      <div
        ref="editor" class="editor" :class="{ plain: plainMode }" contenteditable="true"
        spellcheck="true" aria-label="Document text" @input="onInput" @keydown="onKeydown"
      ></div>
    </div>

    <!-- Status bar -->
    <div class="statusbar">
      <span class="sb-path">{{ statusPath }}</span>
      <span class="sb-stats">
        {{ words }} {{ words === 1 ? 'word' : 'words' }} · {{ chars }}
        {{ chars === 1 ? 'character' : 'characters' }} · {{ plainMode ? 'Plain Text' : 'Rich Text' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.textedit {
  position: relative;
}

/* ---- Toolbar ------------------------------------------------------------- */
.toolbar {
  flex: none;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 6px 10px;
  border-bottom: 0.5px solid var(--border);
  z-index: 20;
}
.tb-group {
  display: flex;
  align-items: center;
  gap: 2px;
}
.tb-btn {
  height: 26px;
  min-width: 28px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.tb-btn svg {
  width: 15px;
  height: 15px;
  display: block;
}
.tb-btn:hover:not(:disabled) {
  background: var(--hover);
}
.tb-btn.on {
  background: var(--selection);
  color: var(--accent);
}
.tb-btn:disabled {
  opacity: 0.35;
}
.tb-btn.wide { padding: 0 10px; }
.tb-btn.fmt.b { font-weight: 700; }
.tb-btn.fmt.i {
  font-style: italic;
  font-family: Georgia, serif;
}
.tb-btn.fmt.u { text-decoration: underline; }
.chev { font-size: 9px; margin-left: 3px; color: var(--text-dim); }
.sep {
  width: 0.5px;
  height: 16px;
  background: var(--border);
  margin: 0 5px;
}
.size-select {
  height: 24px;
  width: 56px;
  margin-right: 4px;
  border: 0.5px solid var(--border);
  border-radius: 6px;
  background: var(--window-bg);
  color: var(--text);
  font-size: 12px;
  padding: 0 4px;
  outline: none;
}

/* ---- Title --------------------------------------------------------------- */
.title-wrap {
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.dirty-dot { font-size: 10px; color: var(--text-dim); }
/* Hidden while idle — the window title bar already shows the document name;
   the input fades in on hover/focus purely as a rename affordance. */
.title-input {
  width: 190px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  background: transparent;
  border: 0.5px solid transparent;
  border-radius: 6px;
  padding: 3px 8px;
  outline: none;
  opacity: 0;
}
.title-wrap:hover .title-input,
.title-input:focus {
  opacity: 1;
}
.title-input:hover { border-color: var(--border); }
.title-input:focus {
  border-color: var(--accent);
  background: var(--window-bg);
}
.flash {
  font-size: 11px;
  color: #30d158;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.flash svg {
  width: 11px;
  height: 11px;
  display: block;
}

/* ---- Open dropdown --------------------------------------------------------- */
.menu-anchor {
  position: relative;
}
.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
}
.dropdown {
  position: absolute;
  top: 31px;
  left: 0;
  z-index: 100;
  min-width: 270px;
  max-width: 340px;
  max-height: 300px;
  overflow-y: auto;
  border-radius: 10px;
  border: 0.5px solid var(--border);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
  padding: 5px;
}
.dropdown-title {
  font-size: 11px;
  color: var(--text-dim);
  padding: 4px 8px 5px;
}
.menu-empty {
  font-size: 12px;
  color: var(--text-dim);
  padding: 6px 8px 8px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  text-align: left;
  font-size: 12.5px;
  color: var(--text);
  padding: 4px 8px;
  border-radius: 6px;
}
.menu-item:hover {
  background: var(--accent);
  color: #fff;
}
.mi-icon {
  flex: none;
}
.mi-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- Paper ----------------------------------------------------------------- */
.paper-wrap {
  flex: 1;
  overflow-y: auto;
  background: #ffffff;
}
.editor {
  min-height: 100%;
  padding: 30px 42px;
  outline: none;
  font-family: 'New York', ui-serif, Georgia, 'Times New Roman', serif;
  font-size: 14px;
  line-height: 1.55;
  color: #1d1d1f;
  caret-color: var(--accent);
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.editor.plain {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
}
.editor:empty::before {
  content: 'Start typing…';
  color: rgba(128, 128, 128, 0.55);
  pointer-events: none;
}
:root[data-theme='dark'] .paper-wrap {
  background: #1c1c1e;
}
:root[data-theme='dark'] .editor {
  color: #f5f5f7;
}

/* ---- Status bar -------------------------------------------------------------- */
.statusbar {
  flex: none;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  border-top: 0.5px solid var(--border);
  background: var(--titlebar-bg);
  font-size: 11px;
  color: var(--text-dim);
}
.sb-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sb-stats {
  flex: none;
}
</style>
