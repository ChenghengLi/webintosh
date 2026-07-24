<script setup>
import { ref, nextTick, onMounted, inject } from 'vue'
import { useSystemStore } from '../../stores/system'
import { useWindowsStore } from '../../stores/windows'
import { HOME, normalizePath, listDir, getNode } from '../../fs'
import { createCommands, macDate, DIR_STYLE } from './commands'

// ---------------------------------------------------------------------------
// Terminal.app ("Basic" profile) — a working zsh-flavoured shell over src/fs,
// with tab completion, readline-style editing and colorized ls output.
// ---------------------------------------------------------------------------

const systemStore = useSystemStore()
const windowsStore = useWindowsStore()
const windowId = inject('windowId', null)

// optional initial working directory (e.g. Finder → "New Terminal at Folder")
const props = defineProps({ path: { type: String, default: '' } })
const initialCwd = (() => {
  if (!props.path) return HOME
  const p = normalizePath(props.path)
  const n = getNode(p)
  return n && n.type === 'dir' ? p : HOME
})()

const cwd = ref(initialCwd)
const input = ref('')
// { type: 'cmd', cwd, text } | { type: 'out', text } | { type: 'out', html }
const lines = ref([])
const scrollEl = ref(null)
const inputEl = ref(null)

const HISTORY_KEY = 'macos-web:terminal-history'
const history = ref(loadHistory())
let histIdx = history.value.length
let draft = ''
const bootTime = Date.now()

function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value.slice(-100)))
}

// ----- prompt / paths -------------------------------------------------------

function shortCwd(p) {
  if (p === HOME) return '~'
  if (p.startsWith(HOME + '/')) return '~' + p.slice(HOME.length)
  return p
}

const promptStr = (p) => `guest@macos-web ${shortCwd(p)} % `

function expandTilde(arg) {
  if (arg === '~') return HOME
  if (arg.startsWith('~/')) return HOME + arg.slice(1)
  return arg
}

const resolve = (arg) => normalizePath(expandTilde(arg), cwd.value)

function tokenize(str) {
  const tokens = []
  let cur = ''
  let quote = null
  let started = false
  for (const ch of str) {
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      started = true
    } else if (/\s/.test(ch)) {
      if (cur || started) {
        tokens.push(cur)
        cur = ''
        started = false
      }
    } else cur += ch
  }
  if (cur || started) tokens.push(cur)
  return tokens
}

// ----- output ---------------------------------------------------------------

const out = (text) => lines.value.push({ type: 'out', text })

// HTML-escape user-controlled text before it goes into a v-html line.
function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Rich output: rows = [[{ text, style }], ...]. Segment styles are hardcoded
// constants (never user input); every text segment is escaped, so the
// resulting v-html line is XSS-safe.
function outSeg(rows) {
  const html = rows
    .map((row) =>
      row.map((s) => (s.style ? `<span style="${s.style}">${esc(s.text)}</span>` : esc(s.text))).join(''),
    )
    .join('\n')
  lines.value.push({ type: 'out', html })
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

// ----- commands ---------------------------------------------------------------

const commands = createCommands({
  cwd,
  out,
  outSeg,
  resolve,
  bootTime,
  history,
  clearScreen: () => {
    lines.value = []
  },
  system: systemStore,
  windows: windowsStore,
  windowId,
})

// ----- execution ------------------------------------------------------------

function exec(raw) {
  lines.value.push({ type: 'cmd', cwd: cwd.value, text: raw })
  const trimmed = raw.trim()
  if (trimmed) {
    history.value.push(raw)
    saveHistory()
    const [cmd, ...args] = tokenize(trimmed)
    const fn = commands[cmd]
    if (fn) fn(args)
    else out(`zsh: command not found: ${cmd}`)
  }
  scrollToBottom()
}

// ----- tab completion -----------------------------------------------------------

// Candidates for a path token: split into dir part + basename, list the dir,
// keep entries starting with the basename. Directories get a trailing '/'.
function completePath(token) {
  const idx = token.lastIndexOf('/')
  const dirPart = idx >= 0 ? token.slice(0, idx + 1) : ''
  const base = idx >= 0 ? token.slice(idx + 1) : token
  const dirPath = dirPart ? resolve(dirPart) : cwd.value
  const items = listDir(dirPath) || []
  return items
    .filter((i) => i.name.startsWith(base))
    .map((i) => ({
      insert: dirPart + i.name + (i.type === 'dir' ? '/' : ''),
      display: i.name + (i.type === 'dir' ? '/' : ''),
      isDir: i.type === 'dir',
    }))
}

function onTab() {
  const value = input.value
  const pos = cursorPos()
  const before = value.slice(0, pos)
  const after = value.slice(pos)
  const token = (before.match(/[^\s]*$/) || [''])[0]
  const tokenStart = before.length - token.length
  const isCommand = before.slice(0, tokenStart).trim() === ''

  let candidates
  if (isCommand) {
    candidates = Object.keys(commands)
      .filter((name) => name.startsWith(token))
      .sort()
      .map((name) => ({ insert: name, display: name, isDir: false }))
  } else {
    candidates = completePath(token).sort((a, b) => a.display.localeCompare(b.display))
  }
  if (!candidates.length) return

  if (candidates.length === 1) {
    const c = candidates[0]
    const insert = c.insert + (c.isDir ? '' : ' ')
    setInput(before.slice(0, tokenStart) + insert + after, tokenStart + insert.length)
    return
  }

  // Multiple matches: extend to the longest common prefix, then list the
  // candidates above the prompt like zsh does.
  let prefix = candidates[0].insert
  for (const c of candidates.slice(1)) {
    while (prefix && !c.insert.startsWith(prefix)) prefix = prefix.slice(0, -1)
  }
  if (prefix.length > token.length) {
    setInput(before.slice(0, tokenStart) + prefix + after, tokenStart + prefix.length)
  }

  const row = []
  candidates.forEach((c, idx) => {
    row.push({ text: c.display, style: c.isDir ? DIR_STYLE : '' })
    if (idx < candidates.length - 1) row.push({ text: '   ' })
  })
  outSeg([row])
  scrollToBottom()
}

// ----- readline-style editing -------------------------------------------------

function cursorPos() {
  const el = inputEl.value
  return el && el.selectionStart != null ? el.selectionStart : input.value.length
}

// Update the input and restore the cursor. Setting el.value directly keeps
// Vue's v-model patch from touching the DOM (it skips equal values), so the
// caret survives the re-render.
function setInput(value, pos) {
  input.value = value
  const el = inputEl.value
  if (el) {
    el.value = value
    el.setSelectionRange(pos, pos)
  }
}

function setCursor(pos) {
  const el = inputEl.value
  if (el) el.setSelectionRange(pos, pos)
}

function killWord() {
  const pos = cursorPos()
  const before = input.value.slice(0, pos)
  const after = input.value.slice(pos)
  const stripped = before.replace(/\s+$/, '').replace(/\S+$/, '')
  setInput(stripped + after, stripped.length)
}

function onKeydown(e) {
  if (e.key === 'Enter') {
    const value = input.value
    input.value = ''
    exec(value)
    histIdx = history.value.length
    draft = ''
  } else if (e.key === 'Tab') {
    e.preventDefault()
    onTab()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (histIdx > 0) {
      if (histIdx === history.value.length) draft = input.value
      histIdx -= 1
      input.value = history.value[histIdx]
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (histIdx < history.value.length) {
      histIdx += 1
      input.value = histIdx === history.value.length ? draft : history.value[histIdx]
    }
  } else if (e.ctrlKey && !e.metaKey) {
    const k = e.key.toLowerCase()
    if (k === 'l') {
      e.preventDefault()
      lines.value = []
    } else if (k === 'c') {
      e.preventDefault()
      lines.value.push({ type: 'cmd', cwd: cwd.value, text: `${input.value}^C` })
      input.value = ''
      histIdx = history.value.length
      scrollToBottom()
    } else if (k === 'a') {
      e.preventDefault()
      setCursor(0)
    } else if (k === 'e') {
      e.preventDefault()
      setCursor(input.value.length)
    } else if (k === 'u') {
      e.preventDefault()
      setInput('', 0)
    } else if (k === 'k') {
      e.preventDefault()
      const pos = cursorPos()
      setInput(input.value.slice(0, pos), pos)
    } else if (k === 'w') {
      e.preventDefault()
      killWord()
    }
  }
}

function focusInput() {
  inputEl.value?.focus()
}

function onClick() {
  // Let the user select text without the input stealing focus back.
  const sel = window.getSelection()
  if (sel && sel.toString()) return
  focusInput()
}

onMounted(() => {
  out(`Last login: ${macDate()} on ttys000`)
  nextTick(focusInput)
})
</script>

<template>
  <div class="app-root term" @click="onClick">
    <div ref="scrollEl" class="scroll">
      <div v-for="(line, i) in lines" :key="i" class="line">
        <template v-if="line.type === 'cmd'">
          <span class="prompt">{{ promptStr(line.cwd) }}</span>{{ line.text }}
        </template>
        <template v-else-if="line.html != null"><span v-html="line.html"></span></template>
        <template v-else>{{ line.text }}</template>
      </div>
      <div class="line input-line">
        <span class="prompt">{{ promptStr(cwd) }}</span>
        <input
          ref="inputEl"
          v-model="input"
          class="input"
          type="text"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          aria-label="Terminal input"
          @keydown="onKeydown"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.term {
  background: #fdfdfd;
  color: #1a1a1a;
  font-family: Menlo, Monaco, 'SF Mono', Consolas, 'Courier New', monospace;
  font-size: 12.5px;
  line-height: 1.45;
  cursor: text;
  user-select: text;
}

.scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 8px 8px;
  overflow-wrap: anywhere;
}

.scroll::-webkit-scrollbar {
  width: 8px;
}

.scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.22);
  border-radius: 4px;
}

.scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.35);
}

.line {
  white-space: pre-wrap;
  min-height: 1.45em;
}

.prompt {
  font-weight: 700;
}

.input-line {
  display: flex;
  align-items: baseline;
}

.input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  caret-color: #1a1a1a;
}

.scroll ::selection {
  background: rgba(0, 98, 255, 0.28);
}
</style>
