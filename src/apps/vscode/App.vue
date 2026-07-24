<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { HOME, fileIcon, getNode, normalizePath } from '@/fs.js'
import ExplorerPanel from './Explorer.vue'
import FolderPicker from './FolderPicker.vue'
import { closeTab, isDirty, openFile, openFolder, restore, saveTab, startCreate, ws } from './workspace.js'
import { highlightCode } from './highlight.js'

const props = defineProps({ openPath: { type: String, default: '' } })

// ---- Activity bar / sidebar panels -------------------------------------

const ACTIVITY = [
  {
    id: 'explorer',
    label: 'Explorer',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 2h-8L8 3.5V7H3.5L2 8.5v12L3.5 22h13l1.5-1.5v-12L16.5 7H9.5l1-2.5h7V2zM9.5 8.5h7V20h-13v-11.5h6z"/></svg>',
  },
  {
    id: 'search',
    label: 'Search',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.7 14.3a7 7 0 1 0-1.4 1.4l4.3 4.3 1.4-1.4-4.3-4.3zM10 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>',
  },
  {
    id: 'scm',
    label: 'Source Control',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="5" r="2.4"/><circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M6 7.4v9.2h1.6V7.4H6zm9.1 3a3.9 3.9 0 0 0-7.4-1.6l1.5.6a2.3 2.3 0 0 1 4.4 1H15.1z"/></svg>',
  },
  {
    id: 'run',
    label: 'Run and Debug',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.8 18.4 12 7 19.2V4.8z"/></svg>',
  },
  {
    id: 'extensions',
    label: 'Extensions',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm10 10h8v8h-8v-8zM3 13h8v8H3v-8zm12.6-10 5 5-1.7 1.7-5-5L15.6 3z"/></svg>',
  },
]
const EXTENSIONS = [
  { icon: '🎨', name: 'Prettier', desc: 'Code formatter' },
  { icon: '✅', name: 'ESLint', desc: 'JavaScript linting' },
  { icon: '💚', name: 'Vue - Official', desc: 'Vue language support' },
  { icon: '🐍', name: 'Python', desc: 'Python language support' },
]

const panel = ref('explorer')
const sidebarVisible = ref(true)
function selectPanel(id) {
  if (panel.value === id) sidebarVisible.value = !sidebarVisible.value
  else {
    panel.value = id
    sidebarVisible.value = true
  }
}

// ---- Tabs / editor (state lives in ./workspace.js) ------------------------

const activeTab = computed(() => ws.tabs.find((t) => t.path === ws.activePath) || null)
const lineCount = computed(() => (activeTab.value ? activeTab.value.content.split('\n').length : 0))
// Highlighted copy of the buffer rendered underneath the (transparent-text) textarea.
const highlighted = computed(() =>
  activeTab.value ? highlightCode(activeTab.value.content, activeTab.value.name) : '',
)

function save(tab = activeTab.value) {
  saveTab(tab)
}
function onKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
    return
  }
  // insertSpaces + tabSize 2, like real VS Code; execCommand keeps native undo.
  if (e.key === 'Tab') {
    e.preventDefault()
    const ta = e.target
    if (document.execCommand && document.execCommand('insertText', false, '  ')) return
    const s = ta.selectionStart
    ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd)
    ta.selectionStart = ta.selectionEnd = s + 2
    ta.dispatchEvent(new Event('input'))
  }
}

// ---- Gutter/highlight scroll sync + Ln/Col tracking ---------------------------

const editorEl = ref(null)
const gutterEl = ref(null)
const highlightEl = ref(null)
function syncScroll() {
  if (!editorEl.value) return
  if (gutterEl.value) gutterEl.value.scrollTop = editorEl.value.scrollTop
  if (highlightEl.value) {
    highlightEl.value.scrollTop = editorEl.value.scrollTop
    highlightEl.value.scrollLeft = editorEl.value.scrollLeft
  }
}
const cursor = reactive({ ln: 1, col: 1 })
function updateCursor(e) {
  const pos = e.target.selectionStart ?? 0
  const before = e.target.value.slice(0, pos)
  const lines = before.split('\n')
  cursor.ln = lines.length
  cursor.col = lines[lines.length - 1].length + 1
}
watch(
  () => ws.activePath,
  async () => {
    cursor.ln = 1
    cursor.col = 1
    await nextTick()
    if (editorEl.value) {
      editorEl.value.scrollTop = 0
      editorEl.value.scrollLeft = 0
      syncScroll()
      editorEl.value.focus()
    }
  },
)

// ---- Status bar language guess --------------------------------------------

const LANGS = {
  js: 'JavaScript', mjs: 'JavaScript', ts: 'TypeScript', vue: 'Vue', css: 'CSS',
  html: 'HTML', json: 'JSON', md: 'Markdown', txt: 'Plain Text', py: 'Python',
}
const language = computed(() => {
  const name = activeTab.value?.name || ''
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  return LANGS[ext] || 'Plain Text'
})

// ---- Welcome screen actions -------------------------------------------------

function displayPath(p) {
  return p.startsWith(HOME) ? '~' + p.slice(HOME.length) : p
}
function newFileFromWelcome() {
  panel.value = 'explorer'
  sidebarVisible.value = true
  startCreate(ws.workspacePath, 'file')
}
function openRecent(path) {
  openFolder(path)
  panel.value = 'explorer'
  sidebarVisible.value = true
}
function onPickFolder(path) {
  openFolder(path)
  ws.pickerOpen = false
}

onMounted(() => {
  restore()
  if (!props.openPath) return
  const p = normalizePath(props.openPath, HOME)
  if (getNode(p)?.type === 'file') openFile(p)
})
</script>

<template>
  <div class="app-root vscode">
    <div class="workbench">
      <!-- Activity bar -->
      <div class="activity-bar">
        <button
          v-for="item in ACTIVITY"
          :key="item.id"
          class="activity-btn"
          :class="{ active: panel === item.id && sidebarVisible }"
          :title="item.label"
          @click="selectPanel(item.id)"
        >
          <span class="activity-icon" v-html="item.svg"></span>
        </button>
        <div class="spacer"></div>
        <button class="activity-btn" title="Accounts">
          <span class="activity-icon">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 11zm0 1.5c-3 0-7 1.6-7 4.6V19h14v-1.9c0-3-4-4.6-7-4.6z"/></svg>
          </span>
        </button>
        <button class="activity-btn" title="Manage">
          <span class="activity-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.4"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8"/></svg>
          </span>
        </button>
      </div>

      <!-- Sidebar -->
      <div v-show="sidebarVisible" class="sidebar">
        <ExplorerPanel v-if="panel === 'explorer'" />

        <template v-else-if="panel === 'search'">
          <div class="side-header"><span>SEARCH</span><span class="dots">⋯</span></div>
          <div class="side-body placeholder">
            <input class="fake-input" placeholder="Search" readonly />
            <input class="fake-input" placeholder="Replace" readonly />
            <p>Type in the editor instead — global search is not wired up in this demo.</p>
          </div>
        </template>

        <template v-else-if="panel === 'scm'">
          <div class="side-header"><span>SOURCE CONTROL</span><span class="dots">⋯</span></div>
          <div class="side-body placeholder">
            <p>No source control providers registered.</p>
            <p>The virtual file system is not under version control.</p>
          </div>
        </template>

        <template v-else-if="panel === 'run'">
          <div class="side-header"><span>RUN AND DEBUG</span><span class="dots">⋯</span></div>
          <div class="side-body placeholder">
            <button class="run-btn">Run and Debug</button>
            <p>To customize Run and Debug, open a folder with a launch configuration.</p>
          </div>
        </template>

        <template v-else>
          <div class="side-header"><span>EXTENSIONS</span><span class="dots">⋯</span></div>
          <div class="side-body">
            <div class="ext-pad"><input class="fake-input" placeholder="Search Extensions in Marketplace" readonly /></div>
            <div v-for="ext in EXTENSIONS" :key="ext.name" class="ext-row">
              <span class="ext-icon">{{ ext.icon }}</span>
              <div class="ext-meta">
                <div class="ext-name">{{ ext.name }}</div>
                <div class="ext-desc">{{ ext.desc }}</div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Editor -->
      <div class="editor">
        <div v-if="ws.tabs.length" class="tabs">
          <div
            v-for="tab in ws.tabs"
            :key="tab.path"
            class="tab"
            :class="{ active: tab.path === ws.activePath, dirty: isDirty(tab) }"
            :title="tab.path"
            @click="ws.activePath = tab.path"
          >
            <span class="tab-icon">{{ fileIcon(tab.name, 'file') }}</span>
            <span class="tab-name">{{ tab.name }}</span>
            <span class="tab-dot">●</span>
            <button class="tab-close" @click.stop="closeTab(tab)">×</button>
          </div>
        </div>

        <div v-if="activeTab" class="editor-body">
          <div ref="gutterEl" class="gutter">
            <div v-for="n in lineCount" :key="n" class="gutter-line">{{ n }}</div>
          </div>
          <div class="code-wrap">
            <div ref="highlightEl" class="highlight" aria-hidden="true" v-html="highlighted"></div>
            <textarea
              ref="editorEl"
              v-model="activeTab.content"
              class="code"
              wrap="off"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              @scroll="syncScroll"
              @keydown="onKeydown"
              @input="updateCursor"
              @click="updateCursor"
              @keyup="updateCursor"
            ></textarea>
          </div>
        </div>

        <div v-else class="welcome">
          <img class="welcome-logo" src="/icons/vscode.png" alt="Visual Studio Code" />
          <div class="welcome-title">Visual Studio Code</div>
          <div class="welcome-sub">Editing evolved</div>
          <div class="welcome-cols">
            <div class="welcome-col">
              <div class="welcome-heading">Start</div>
              <button class="welcome-link" @click="newFileFromWelcome">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M10.7 1H3.5l-.5.5v13l.5.5h9l.5-.5V4.3L10.7 1zM4 14V2h6v3h3v9H4zm6.5-11.2V4h1.2L10.5 2.8z"/></svg>
                New File…
              </button>
              <button class="welcome-link" @click="ws.pickerOpen = true">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.5a1 1 0 0 1 1-1H6l1.5 1.5h6a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V3.5zm1 8h11V5.5H7L5.5 4h-3v7.5z"/></svg>
                Open Folder…
              </button>
            </div>
            <div class="welcome-col">
              <div class="welcome-heading">Recent</div>
              <button v-for="p in ws.recent" :key="p" class="welcome-link" :title="p" @click="openRecent(p)">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.5a1 1 0 0 1 1-1H6l1.5 1.5h6a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V3.5zm1 8h11V5.5H7L5.5 4h-3v7.5z"/></svg>
                {{ displayPath(p) }}
              </button>
              <div v-if="!ws.recent.length" class="welcome-none">No recent folders</div>
            </div>
          </div>
          <div class="welcome-hints"><kbd>⌘S</kbd> Save file</div>
        </div>
      </div>
    </div>

    <!-- Status bar -->
    <div class="statusbar">
      <div class="sb-side">
        <span class="sb-item">⎇ main</span>
        <span class="sb-item">✗ 0&nbsp;&nbsp;⚠ 0</span>
      </div>
      <div class="sb-side right">
        <span v-if="activeTab" class="sb-item">Ln {{ cursor.ln }}, Col {{ cursor.col }}</span>
        <span class="sb-item">UTF-8</span>
        <span class="sb-item">LF</span>
        <span class="sb-item">{{ language }}</span>
      </div>
    </div>

    <!-- Folder picker modal -->
    <FolderPicker
      v-if="ws.pickerOpen"
      :start-path="ws.workspacePath"
      @select="onPickFolder"
      @close="ws.pickerOpen = false"
    />
  </div>
</template>

<style scoped>
.vscode { background: #1e1e1e; color: #d4d4d4; font-size: 13px; user-select: none; overflow: hidden; position: relative; }
.workbench { flex: 1; display: flex; min-height: 0; }

/* Activity bar */
.activity-bar { width: 48px; background: #333333; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.activity-bar .spacer { flex: 1; }
.activity-btn {
  width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
  background: none; border: none; border-left: 2px solid transparent; color: #858585; cursor: pointer; padding: 0;
}
.activity-btn:hover { color: #ffffff; }
.activity-btn.active { color: #ffffff; border-left-color: #ffffff; }
.activity-icon { display: flex; }
.activity-icon :deep(svg) { width: 24px; height: 24px; }

/* Sidebar */
.sidebar { width: 230px; background: #252526; display: flex; flex-direction: column; flex-shrink: 0; overflow: hidden; }
.side-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px 6px; font-size: 11px; letter-spacing: 0.5px; color: #bbbbbb;
}
.dots { cursor: pointer; color: #858585; }
.side-body { flex: 1; overflow-y: auto; padding-bottom: 8px; }

/* Placeholder panels */
.placeholder { padding: 12px; color: #858585; font-size: 12px; line-height: 1.5; }
.fake-input {
  width: 100%; box-sizing: border-box; background: #3c3c3c; border: 1px solid #3c3c3c;
  color: #cccccc; font-size: 12px; padding: 4px 6px; border-radius: 2px; margin-bottom: 6px; outline: none;
}
.run-btn {
  width: 100%; background: #0e639c; color: #ffffff; border: none; padding: 5px 0;
  font-size: 12px; border-radius: 2px; cursor: pointer; margin-bottom: 8px;
}
.ext-pad { padding: 8px 8px 2px; }
.ext-row { display: flex; gap: 10px; padding: 8px 12px; align-items: center; }
.ext-row:hover { background: #2a2d2e; }
.ext-icon { font-size: 22px; }
.ext-name { font-size: 12.5px; color: #d4d4d4; }
.ext-desc { font-size: 11.5px; color: #858585; }

/* Editor */
.editor { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #1e1e1e; }
.tabs { display: flex; height: 35px; background: #2d2d2d; overflow-x: auto; flex-shrink: 0; scrollbar-width: none; }
.tab {
  display: flex; align-items: center; gap: 6px; padding: 0 10px; min-width: 0; max-width: 200px;
  font-size: 12.5px; color: #969696; background: #2d2d2d; border-right: 1px solid #252526;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
}
.tab.active { background: #1e1e1e; color: #ffffff; }
.tab-icon { font-size: 12px; }
.tab-name { overflow: hidden; text-overflow: ellipsis; }
.tab-close {
  background: none; border: none; color: inherit; font-size: 14px; line-height: 1;
  padding: 1px 3px; border-radius: 4px; cursor: pointer; visibility: hidden;
}
.tab-close:hover { background: #4b4b4b; }
.tab.active .tab-close, .tab:hover .tab-close { visibility: visible; }
.tab-dot { display: none; font-size: 11px; color: #c5c5c5; }
.tab.dirty .tab-dot { display: inline; }
.tab.dirty .tab-close { visibility: hidden; }
.tab.dirty:hover .tab-close { visibility: visible; }
.tab.dirty:hover .tab-dot { display: none; }

.editor-body { flex: 1; display: flex; min-height: 0; }
.gutter {
  width: 52px; flex-shrink: 0; overflow: hidden; text-align: right; box-sizing: border-box;
  padding: 8px 10px 8px 0; color: #6e7681; background: #1e1e1e;
  font-family: 'SF Mono', Menlo, monospace; font-size: 12px; line-height: 19px;
}

/* Editor stack: highlighted render below, transparent-text textarea on top.
   Both layers share identical font metrics, padding and tab-size so the
   colored copy lines up exactly with the textarea's caret/selection. */
.code-wrap { position: relative; flex: 1; min-width: 0; display: flex; }
.highlight {
  position: absolute; inset: 0; overflow: hidden; pointer-events: none; box-sizing: border-box;
  margin: 0; border: none; padding: 8px 12px 40px 4px; color: #d4d4d4; tab-size: 2;
  font-family: 'SF Mono', Menlo, monospace; font-size: 12px; line-height: 19px;
}
.highlight :deep(.hl-line) { white-space: pre; min-height: 19px; }
.highlight :deep(.t-kw) { color: #c586c0; }
.highlight :deep(.t-str) { color: #ce9178; }
.highlight :deep(.t-com) { color: #6a9955; }
.highlight :deep(.t-num) { color: #b5cea8; }
.highlight :deep(.t-type) { color: #4ec9b0; }
.highlight :deep(.t-fn) { color: #dcdcaa; }
.highlight :deep(.t-sel) { color: #d7ba7d; }
.highlight :deep(.t-prop) { color: #9cdcfe; }
.highlight :deep(.t-tag) { color: #569cd6; }
.highlight :deep(.t-lit) { color: #569cd6; }
.highlight :deep(.t-punct) { color: #808080; }
.highlight :deep(.t-head) { color: #569cd6; font-weight: 700; }
.highlight :deep(.t-bold) { font-weight: 700; }
.highlight :deep(.t-it) { font-style: italic; }
.code {
  flex: 1; min-width: 0; position: relative; background: transparent; color: transparent;
  border: none; outline: none; resize: none; padding: 8px 12px 8px 4px; tab-size: 2;
  caret-color: #aeafad; user-select: text;
  font-family: 'SF Mono', Menlo, monospace; font-size: 12px; line-height: 19px;
  white-space: pre; overflow: auto;
}
.code::selection { background: rgba(38, 79, 120, 0.6); color: transparent; }

/* Welcome / empty state */
.welcome { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #858585; }
.welcome-logo { width: 96px; height: 96px; opacity: 0.5; margin-bottom: 8px; filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4)); }
.welcome-title { font-size: 22px; color: #bbbbbb; }
.welcome-sub { font-size: 13px; margin-bottom: 14px; }
.welcome-cols { display: flex; gap: 72px; margin: 10px 0 18px; align-items: flex-start; }
.welcome-col { display: flex; flex-direction: column; gap: 2px; min-width: 180px; }
.welcome-heading { font-size: 13px; font-weight: 600; color: #bbbbbb; margin-bottom: 6px; }
.welcome-link {
  display: flex; align-items: center; gap: 8px; background: none; border: none;
  color: #3794ff; font-size: 12.5px; font-family: inherit; padding: 3px 0;
  cursor: pointer; text-align: left; white-space: nowrap;
}
.welcome-link:hover { text-decoration: underline; }
.welcome-link svg { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.9; }
.welcome-none { font-size: 12px; color: #6a6a6a; padding: 3px 0; }
.welcome-hints { text-align: center; font-size: 12.5px; line-height: 2; }
.welcome-hints kbd {
  background: #333333; border: 1px solid #4b4b4b; border-radius: 4px;
  padding: 1px 5px; font-family: inherit; margin-right: 4px;
}

/* Status bar */
.statusbar {
  height: 22px; background: #007acc; color: #ffffff; display: flex;
  justify-content: space-between; align-items: center; font-size: 12px; flex-shrink: 0;
}
.sb-side { display: flex; align-items: center; height: 100%; }
.sb-item { padding: 0 9px; height: 100%; display: flex; align-items: center; white-space: nowrap; }
.sb-item:hover { background: rgba(255, 255, 255, 0.12); }
</style>
