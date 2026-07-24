<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { HOME, exists, readFile, writeFile } from '@/fs.js'
import { useSystemStore } from '@/stores/system'
import { colToNum, evaluate, numToCol, parseRef } from './engine'

const COLS = 20 // A..T
const ROWS = 50
const STORAGE_KEY = 'macos-web:excel'
const NAME_KEY = 'macos-web:excel-name'
const GREEN = '#217346'

const system = useSystemStore()

const TABS = [
  { id: 'file', label: 'File' },
  { id: 'home', label: 'Home' },
  { id: 'insert', label: 'Insert' },
  { id: 'formulas', label: 'Formulas' },
]
const FONT_SIZES = [9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28]
const FONT_FAMILIES = [
  { id: '', label: 'Calibri (Body)' },
  { id: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { id: 'Georgia, serif', label: 'Georgia' },
  { id: "'Times New Roman', Times, serif", label: 'Times New Roman' },
  { id: "'Courier New', Courier, monospace", label: 'Courier New' },
  { id: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
]
const FORMATS = [
  { id: 'general', label: 'General' },
  { id: 'number', label: 'Number' },
  { id: 'currency', label: 'Currency' },
  { id: 'percent', label: 'Percent' },
]
const FILLS = [
  { id: '#fff2cc', label: 'Yellow' },
  { id: '#f8cbad', label: 'Orange' },
  { id: '#ffc7ce', label: 'Red' },
  { id: '#c6efce', label: 'Green' },
  { id: '#bdd7ee', label: 'Blue' },
  { id: '#d9d2e9', label: 'Purple' },
  { id: '#e7e6e6', label: 'Gray' },
]
const FONT_COLORS = [
  { id: '#1d1d1f', label: 'Black' },
  { id: '#ffffff', label: 'White' },
  { id: '#c00000', label: 'Dark Red' },
  { id: '#ff0000', label: 'Red' },
  { id: '#ff8a00', label: 'Orange' },
  { id: '#bf8f00', label: 'Gold' },
  { id: '#217346', label: 'Green' },
  { id: '#2e75b6', label: 'Blue' },
  { id: '#7030a0', label: 'Purple' },
  { id: '#808080', label: 'Gray' },
]
const STYLE_KEYS = [
  'bold',
  'italic',
  'underline',
  'fill',
  'color',
  'fontSize',
  'fontFamily',
  'format',
  'decimals',
  'align',
  'valign',
]

// key -> { raw, bold?, italic?, underline?, fill?, color?, fontSize?, fontFamily?,
//          format?, decimals?, align?, valign? }
const cells = reactive({})
const sel = ref('B2')
const editing = ref(null) // { key, value }
const gridEl = ref(null)
const editEl = ref(null)
const barText = ref('')
const activeTab = ref('home') // 'file' shows the backstage panel
const openMenu = ref(null) // 'fill' | 'fontColor' | 'insertCells' | 'deleteCells'
const workbookName = ref('Book1')
const flash = ref('')
let flashTimer = null
let saveTimer = null

const colLetters = Array.from({ length: COLS }, (_, i) => numToCol(i + 1))
const rows = Array.from({ length: ROWS }, (_, i) => i + 1)
const selRef = computed(() => parseRef(sel.value) || { col: 1, row: 1 })
const selCell = computed(() => cells[sel.value] || {})

// ---- Formula evaluation (memoized per change, with cycle detection) --------

const evalResults = computed(() => {
  const cache = new Map()
  const active = new Set()
  const propagate = (code) => {
    throw Object.assign(new Error(code), { code })
  }
  function evalKey(key) {
    if (cache.has(key)) return cache.get(key)
    if (active.has(key)) return { err: '#REF!' }
    const c = cells[key]
    const raw = c ? String(c.raw ?? '') : ''
    if (raw === '') {
      const r = { value: '' }
      cache.set(key, r)
      return r
    }
    if (!raw.startsWith('=')) {
      const t = raw.trim()
      const n = Number(t)
      const r = { value: t !== '' && !Number.isNaN(n) ? n : raw }
      cache.set(key, r)
      return r
    }
    active.add(key)
    let r
    try {
      const v = evaluate(raw.slice(1), {
        cell: (ref) => {
          const rr = evalKey(ref)
          if (rr.err) propagate(rr.err)
          return rr.value
        },
        range: (c1, r1, c2, r2) => {
          const vals = []
          for (let cc = Math.min(c1, c2); cc <= Math.max(c1, c2); cc++) {
            for (let rk = Math.min(r1, r2); rk <= Math.max(r1, r2); rk++) {
              const res = evalKey(numToCol(cc) + rk)
              if (res.err) propagate(res.err)
              if (typeof res.value === 'number') vals.push(res.value)
            }
          }
          return vals
        },
      })
      r = { value: v }
    } catch (e) {
      r = { err: e.code || '#NAME?' }
    }
    active.delete(key)
    cache.set(key, r)
    return r
  }
  for (const key of Object.keys(cells)) evalKey(key)
  return cache
})

function resultOf(key) {
  return evalResults.value.get(key) || { value: '' }
}

function isNumeric(key) {
  const r = resultOf(key)
  return !r.err && typeof r.value === 'number'
}

function display(key) {
  const r = resultOf(key)
  if (r.err) return r.err
  const v = r.value
  if (v === '' || v == null) return ''
  if (typeof v !== 'number') return String(v)
  const c = cells[key]
  const fmt = c?.format || 'general'
  const clean = Math.abs(v) < 1e-10 ? 0 : v
  if (fmt === 'number') {
    const d = c?.decimals ?? 2
    return clean.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
  }
  if (fmt === 'currency') {
    const d = c?.decimals ?? 2
    return '$' + clean.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
  }
  if (fmt === 'percent') {
    const d = c?.decimals ?? 0
    return (clean * 100).toFixed(d) + '%'
  }
  return String(Math.round(clean * 1e10) / 1e10)
}

// ---- Cell data --------------------------------------------------------------

function ensure(key) {
  if (!cells[key]) cells[key] = { raw: '' }
  return cells[key]
}

function setRaw(key, raw) {
  raw = String(raw ?? '')
  const c = cells[key]
  if (c) c.raw = raw
  else if (raw !== '') cells[key] = { raw }
  if (c && raw === '' && !STYLE_KEYS.some((k) => c[k] !== undefined && c[k] !== false && c[k] !== ''))
    delete cells[key]
}

function toggleStyle(prop) {
  const c = ensure(sel.value)
  c[prop] = !c[prop]
}

function setFontSize(v) {
  ensure(sel.value).fontSize = Number(v)
}

function setFontFamily(v) {
  const c = ensure(sel.value)
  if (v) c.fontFamily = v
  else delete c.fontFamily
}

function setFormat(v) {
  const c = ensure(sel.value)
  if (v === 'general') delete c.format
  else c.format = v
}

function setFill(v) {
  const c = ensure(sel.value)
  if (v) c.fill = v
  else delete c.fill
  openMenu.value = null
}

function setFontColor(v) {
  const c = ensure(sel.value)
  if (v) c.color = v
  else delete c.color
  openMenu.value = null
}

function setAlign(a) {
  const c = ensure(sel.value)
  if (c.align === a) delete c.align
  else c.align = a
}

function setVAlign(a) {
  const c = ensure(sel.value)
  if (c.valign === a) delete c.valign
  else c.valign = a
}

function changeDecimals(delta) {
  const c = ensure(sel.value)
  if (!c.format || c.format === 'general') c.format = 'number'
  const cur = c.decimals ?? (c.format === 'percent' ? 0 : 2)
  c.decimals = Math.min(9, Math.max(0, cur + delta))
}

function cellStyle(key) {
  const c = cells[key]
  if (!c) return null
  const st = {}
  if (c.bold) st.fontWeight = '700'
  if (c.italic) st.fontStyle = 'italic'
  if (c.underline) st.textDecoration = 'underline'
  if (c.fill) st.background = c.fill
  if (c.color) st.color = c.color
  if (c.fontSize) st.fontSize = c.fontSize + 'px'
  if (c.fontFamily) st.fontFamily = c.fontFamily
  if (c.align) st.textAlign = c.align
  if (c.valign) st.verticalAlign = c.valign
  return st
}

// ---- Rows / columns -----------------------------------------------------------

// Rebuilds the cell map through mapFn(col, row) -> {col, row} | null.
// Used for insert/delete; formulas keep their original references.
function remapCells(mapFn) {
  const next = {}
  for (const key of Object.keys(cells)) {
    const r = parseRef(key)
    if (!r) continue
    const m = mapFn(r.col, r.row)
    if (!m) continue
    if (m.col < 1 || m.col > COLS || m.row < 1 || m.row > ROWS) continue
    next[numToCol(m.col) + m.row] = cells[key]
  }
  for (const key of Object.keys(cells)) delete cells[key]
  Object.assign(cells, next)
}

function insertRowAbove() {
  const at = selRef.value.row
  remapCells((col, row) => ({ col, row: row >= at ? row + 1 : row }))
  openMenu.value = null
  showFlash('Inserted row above ' + at)
}

function deleteRow() {
  const at = selRef.value.row
  remapCells((col, row) => (row === at ? null : { col, row: row > at ? row - 1 : row }))
  openMenu.value = null
  showFlash('Deleted row ' + at)
}

function insertColLeft() {
  const at = selRef.value.col
  remapCells((col, row) => ({ col: col >= at ? col + 1 : col, row }))
  openMenu.value = null
  showFlash('Inserted column left of ' + numToCol(at))
}

function deleteCol() {
  const at = selRef.value.col
  remapCells((col, row) => (col === at ? null : { col: col > at ? col - 1 : col, row }))
  openMenu.value = null
  showFlash('Deleted column ' + numToCol(at))
}

// ---- Clipboard / AutoSum ------------------------------------------------------

function copySel(cut = false) {
  const raw = cells[sel.value]?.raw ?? ''
  system.clipboard = raw !== '' ? raw : display(sel.value)
  if (cut) setRaw(sel.value, '')
}

function cutSel() {
  copySel(true)
}

function pasteSel() {
  if (system.clipboard) setRaw(sel.value, system.clipboard)
}

function insertFn(fn) {
  const { col, row } = selRef.value
  if (row <= 1) {
    showFlash('Select a cell below the data')
    return
  }
  const L = numToCol(col)
  setRaw(sel.value, '=' + fn + '(' + L + '1:' + L + (row - 1) + ')')
  move(0, 1)
}

function autoSum() {
  insertFn('SUM')
}

function noop() {
  /* decorative ribbon button */
}

// ---- Selection / editing ------------------------------------------------------

function move(dx, dy) {
  const r = selRef.value
  const col = Math.min(COLS, Math.max(1, r.col + dx))
  const row = Math.min(ROWS, Math.max(1, r.row + dy))
  sel.value = numToCol(col) + row
  nextTick(() => {
    const el = gridEl.value?.querySelector('td.sel')
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}

function onCellMouseDown(key, e) {
  if (e.target.tagName === 'INPUT') return
  e.preventDefault()
  if (editing.value && editing.value.key !== key) commitEdit()
  sel.value = key
  gridEl.value?.focus()
}

function startEdit(key, initial) {
  if (editing.value && editing.value.key === key) return
  sel.value = key
  editing.value = { key, value: initial !== undefined ? initial : (cells[key]?.raw ?? '') }
  nextTick(() => {
    const el = Array.isArray(editEl.value) ? editEl.value[0] : editEl.value
    if (el) {
      el.focus()
      if (initial === undefined) el.select()
    }
  })
}

function commitEdit(dx = 0, dy = 0) {
  const ed = editing.value
  if (!ed) return
  setRaw(ed.key, ed.value)
  editing.value = null
  if (dx || dy) move(dx, dy)
  gridEl.value?.focus()
}

function onEditKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitEdit(0, e.shiftKey ? -1 : 1)
  } else if (e.key === 'Tab') {
    e.preventDefault()
    commitEdit(e.shiftKey ? -1 : 1, 0)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    editing.value = null
    gridEl.value?.focus()
  }
}

function onGridKeydown(e) {
  if (editing.value) return
  if ((e.metaKey || e.ctrlKey) && !e.altKey) {
    const k = e.key.toLowerCase()
    if (k === 'c') {
      copySel()
      e.preventDefault()
      return
    }
    if (k === 'x') {
      cutSel()
      e.preventDefault()
      return
    }
    if (k === 'v') {
      pasteSel()
      e.preventDefault()
      return
    }
  }
  let handled = true
  switch (e.key) {
    case 'ArrowUp':
      move(0, -1)
      break
    case 'ArrowDown':
      move(0, 1)
      break
    case 'ArrowLeft':
      move(-1, 0)
      break
    case 'ArrowRight':
      move(1, 0)
      break
    case 'Enter':
      move(0, e.shiftKey ? -1 : 1)
      break
    case 'Tab':
      move(e.shiftKey ? -1 : 1, 0)
      break
    case 'Escape':
      openMenu.value = null
      if (activeTab.value === 'file') activeTab.value = 'home'
      break
    case 'Delete':
    case 'Backspace':
      setRaw(sel.value, '')
      break
    default:
      handled = false
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        startEdit(sel.value, e.key)
        handled = true
      }
  }
  if (handled) e.preventDefault()
}

// ---- Ribbon / tabs / menus ------------------------------------------------------

function onTabClick(id) {
  activeTab.value = id
  openMenu.value = null
  if (id !== 'file') gridEl.value?.focus()
}

function toggleMenu(id) {
  openMenu.value = openMenu.value === id ? null : id
}

function onTitleBlur(e) {
  if (!workbookName.value.trim()) workbookName.value = 'Book1'
  e.target.value = workbookName.value
}

function jumpTo(e) {
  const v = String(e.target.value || '').toUpperCase().trim()
  const r = parseRef(v)
  if (r && r.col >= 1 && r.col <= COLS && r.row >= 1 && r.row <= ROWS) {
    sel.value = numToCol(r.col) + r.row
    nextTick(() => {
      const el = gridEl.value?.querySelector('td.sel')
      if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
  }
  e.target.value = sel.value
  e.target.blur()
  gridEl.value?.focus()
}

// ---- Formula bar --------------------------------------------------------------

watch(
  [sel, () => cells[sel.value]?.raw],
  () => {
    barText.value = cells[sel.value]?.raw ?? ''
  },
  { immediate: true },
)

function commitBar() {
  setRaw(sel.value, barText.value)
  gridEl.value?.focus()
}

// ---- Status bar quick stats (selected column) -----------------------------------

const colStats = computed(() => {
  const col = selRef.value.col
  let sum = 0
  let count = 0
  for (let r = 1; r <= ROWS; r++) {
    const res = resultOf(numToCol(col) + r)
    if (!res.err && typeof res.value === 'number') {
      sum += res.value
      count++
    }
  }
  return { avg: count ? sum / count : 0, count, sum }
})

function fmtStat(n) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

// ---- Persistence / export -------------------------------------------------------

function seed() {
  const s = (key, raw, style = {}) => {
    cells[key] = { raw, ...style }
  }
  const money = { format: 'currency' }
  s('A1', 'Category', { bold: true, fill: '#e2efda' })
  s('B1', 'Amount', { bold: true, fill: '#e2efda' })
  s('C1', 'Notes', { bold: true, fill: '#e2efda' })
  s('A2', 'Rent')
  s('B2', '1200', money)
  s('C2', 'Due on the 1st')
  s('A3', 'Food')
  s('B3', '400', money)
  s('A4', 'Transport')
  s('B4', '150', money)
  s('A5', 'Fun')
  s('B5', '200', money)
  s('A6', 'Total', { bold: true })
  s('B6', '=SUM(B2:B5)', { bold: true, ...money })
  s('A7', 'Average')
  s('B7', '=AVG(B2:B5)', money)
  s('A8', 'Max')
  s('B8', '=MAX(B2:B5)', money)
  s('A9', 'Min')
  s('B9', '=MIN(B2:B5)', money)
  s('A10', 'Count')
  s('B10', '=COUNT(B2:B5)')
  save()
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cells))
    localStorage.setItem(NAME_KEY, workbookName.value)
  } catch {
    /* storage full — ignore */
  }
}

function saveClicked() {
  save()
  showFlash('Saved')
}

function exportCSV() {
  let maxCol = 0
  let maxRow = 0
  for (const key of Object.keys(cells)) {
    if ((cells[key]?.raw ?? '') === '') continue
    const r = parseRef(key)
    if (!r) continue
    maxCol = Math.max(maxCol, r.col)
    maxRow = Math.max(maxRow, r.row)
  }
  const lines = []
  for (let row = 1; row <= maxRow; row++) {
    const fields = []
    for (let col = 1; col <= maxCol; col++) {
      const r = resultOf(numToCol(col) + row)
      let v = r.err ? r.err : (r.value ?? '')
      v = String(v)
      if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"'
      fields.push(v)
    }
    lines.push(fields.join(','))
  }
  const ok = writeFile(HOME + '/Documents/sheet.csv', lines.join('\n'))
  showFlash(ok ? 'Exported to Documents/sheet.csv' : 'Export failed')
}

function importCSV() {
  const path = HOME + '/Documents/sheet.csv'
  if (!exists(path)) {
    showFlash('No sheet.csv in Documents — export first')
    return
  }
  const text = readFile(path)
  if (typeof text !== 'string') {
    showFlash('Could not read sheet.csv')
    return
  }
  const parsed = parseCSV(text)
  for (const key of Object.keys(cells)) delete cells[key]
  parsed.forEach((fields, ri) => {
    fields.forEach((v, ci) => {
      if (ri < ROWS && ci < COLS && v !== '') cells[numToCol(ci + 1) + (ri + 1)] = { raw: v }
    })
  })
  sel.value = 'A1'
  showFlash('Opened Documents/sheet.csv')
}

function parseCSV(text) {
  const out = []
  let field = ''
  let row = []
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQ = false
      } else field += ch
    } else if (ch === '"') {
      inQ = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      out.push(row)
      row = []
    } else field += ch
  }
  if (field !== '' || row.length) {
    row.push(field)
    out.push(row)
  }
  return out
}

// ---- File backstage actions -----------------------------------------------------

function bsSave() {
  saveClicked()
  activeTab.value = 'home'
}

function bsOpen() {
  importCSV()
  activeTab.value = 'home'
}

function bsExport() {
  exportCSV()
  activeTab.value = 'home'
}

function showFlash(msg) {
  flash.value = msg
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.value = ''), 2000)
}

watch(
  cells,
  () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 400)
  },
  { deep: true },
)

watch(workbookName, () => save())

function onDocClick(e) {
  if (!e.target.closest('[data-menu]')) openMenu.value = null
}

onMounted(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) Object.assign(cells, JSON.parse(stored))
    else seed()
    const storedName = localStorage.getItem(NAME_KEY)
    if (storedName) workbookName.value = storedName
  } catch {
    seed()
  }
  document.addEventListener('click', onDocClick)
  gridEl.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  clearTimeout(saveTimer)
  clearTimeout(flashTimer)
})
</script>

<template>
  <div class="app-root excel-root">
    <!-- Top bar: green Save + centered workbook title -->
    <div class="topbar">
      <div class="tb-side">
        <button class="save-btn" title="Save" @click="saveClicked">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 4.5h10.5L19 8v11.5H5z" />
            <path d="M8.5 4.5V9h6.5V4.5" />
            <path d="M8.5 13.5h7v6h-7z" />
          </svg>
        </button>
      </div>
      <div class="tb-title">
        <input
          v-model="workbookName"
          class="wb-title"
          spellcheck="false"
          :size="Math.max(4, workbookName.length)"
          title="Workbook name"
          @keydown.enter.prevent="$event.target.blur()"
          @blur="onTitleBlur"
        />
      </div>
      <div class="tb-side right"></div>
    </div>

    <!-- Ribbon tab row -->
    <div class="tabrow">
      <button
        v-for="t in TABS"
        :key="t.id"
        class="tab"
        :class="{ on: activeTab === t.id, file: t.id === 'file' }"
        @click="onTabClick(t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="work-area">
      <!-- Ribbon -->
      <div class="ribbon">
        <template v-if="activeTab === 'home' || activeTab === 'file'">
          <!-- Clipboard -->
          <div class="grp">
            <div class="grp-body">
              <button class="rb big" title="Paste" @click="pasteSel">
                <svg viewBox="0 0 24 24">
                  <rect x="6" y="4.5" width="12" height="15.5" rx="2" />
                  <path d="M9 4.5a3 3 0 0 1 6 0" />
                  <path d="M9.5 11h5M9.5 14.5h5" />
                </svg>
                <span>Paste</span>
              </button>
              <div class="vstack">
                <button class="rb row" title="Cut" @click="cutSel">
                  <svg viewBox="0 0 24 24">
                    <circle cx="7" cy="7" r="2.4" />
                    <circle cx="7" cy="17" r="2.4" />
                    <path d="M9.3 8.6 19 18.2M9.3 15.4 19 5.8" />
                  </svg>
                  <span>Cut</span>
                </button>
                <button class="rb row" title="Copy" @click="copySel()">
                  <svg viewBox="0 0 24 24">
                    <rect x="8.5" y="8.5" width="11" height="11.5" rx="1.5" />
                    <path d="M15.5 8.5v-2A1.5 1.5 0 0 0 14 5H6a1.5 1.5 0 0 0-1.5 1.5V15A1.5 1.5 0 0 0 6 16.5h2.5" />
                  </svg>
                  <span>Copy</span>
                </button>
              </div>
            </div>
            <div class="grp-label">Clipboard</div>
          </div>

          <!-- Font -->
          <div class="grp">
            <div class="grp-body">
              <div class="vstack">
                <div class="hstack">
                  <select
                    class="rsel fam"
                    title="Font"
                    :value="selCell.fontFamily || ''"
                    @change="setFontFamily($event.target.value)"
                  >
                    <option v-for="f in FONT_FAMILIES" :key="f.label" :value="f.id">{{ f.label }}</option>
                  </select>
                  <select
                    class="rsel size"
                    title="Font Size"
                    :value="selCell.fontSize || 13"
                    @change="setFontSize($event.target.value)"
                  >
                    <option v-for="s in FONT_SIZES" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
                <div class="hstack">
                  <button class="rb sq" :class="{ on: selCell.bold }" title="Bold" @click="toggleStyle('bold')">
                    <svg viewBox="0 0 24 24">
                      <path d="M8.5 4.5v15M8.5 4.5h4.2a3.3 3.3 0 0 1 0 6.6H8.5M8.5 11.1h5.3a3.7 3.7 0 0 1 0 7.4H8.5" />
                    </svg>
                  </button>
                  <button class="rb sq" :class="{ on: selCell.italic }" title="Italic" @click="toggleStyle('italic')">
                    <svg viewBox="0 0 24 24">
                      <path d="M10.5 4.5h6M7.5 19.5h6M13.2 4.5l-2.4 15" />
                    </svg>
                  </button>
                  <button
                    class="rb sq"
                    :class="{ on: selCell.underline }"
                    title="Underline"
                    @click="toggleStyle('underline')"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M7.5 4.5V11a4.5 4.5 0 0 0 9 0V4.5M6 19.5h12" />
                    </svg>
                  </button>
                  <span class="vsep"></span>
                  <div class="pop-wrap" data-menu>
                    <button class="rb sq withbar" title="Fill Color" @click.stop="toggleMenu('fill')">
                      <svg viewBox="0 0 24 24">
                        <path d="M10 3.5 18.5 12l-8 8a1.9 1.9 0 0 1-2.7 0l-3.6-3.6a1.9 1.9 0 0 1 0-2.7z" />
                        <path d="M6 13.5h12.5" />
                        <path d="M19.5 14.8s1.9 2.2 1.9 3.4a1.9 1.9 0 0 1-3.8 0c0-1.2 1.9-3.4 1.9-3.4z" />
                      </svg>
                      <span class="bar" :style="{ background: selCell.fill || 'transparent' }"></span>
                    </button>
                    <div v-if="openMenu === 'fill'" class="menu glass-strong">
                      <button class="menu-item" @click="setFill('')">No Fill</button>
                      <div class="sw-grid">
                        <button
                          v-for="f in FILLS"
                          :key="f.id"
                          class="sw"
                          :title="f.label"
                          :style="{ background: f.id }"
                          @click="setFill(f.id)"
                        ></button>
                      </div>
                    </div>
                  </div>
                  <div class="pop-wrap" data-menu>
                    <button class="rb sq withbar" title="Font Color" @click.stop="toggleMenu('fontColor')">
                      <svg viewBox="0 0 24 24">
                        <path d="M6.5 16.5 12 5l5.5 11.5" />
                        <path d="M8.7 12.5h6.6" />
                      </svg>
                      <span class="bar" :style="{ background: selCell.color || '#c00000' }"></span>
                    </button>
                    <div v-if="openMenu === 'fontColor'" class="menu glass-strong">
                      <button class="menu-item" @click="setFontColor('')">Automatic</button>
                      <div class="sw-grid">
                        <button
                          v-for="f in FONT_COLORS"
                          :key="f.id"
                          class="sw"
                          :title="f.label"
                          :style="{ background: f.id }"
                          @click="setFontColor(f.id)"
                        ></button>
                      </div>
                    </div>
                  </div>
                  <button class="rb sq" title="Borders" @click="noop">
                    <svg viewBox="0 0 24 24">
                      <rect x="4.5" y="4.5" width="15" height="15" rx="1" />
                      <path d="M9.5 4.5v15M14.5 4.5v15M4.5 9.5h15M4.5 14.5h15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="grp-label">Font</div>
          </div>

          <!-- Alignment -->
          <div class="grp">
            <div class="grp-body">
              <div class="vstack">
                <div class="hstack">
                  <button
                    class="rb sq"
                    :class="{ on: selCell.valign === 'top' }"
                    title="Top Align"
                    @click="setVAlign('top')"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M4.5 5.5h15M6.5 10h11M8.5 14.5h7M10.5 19h3" />
                    </svg>
                  </button>
                  <button
                    class="rb sq"
                    :class="{ on: selCell.valign === 'middle' }"
                    title="Middle Align"
                    @click="setVAlign('middle')"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M8.5 5.5h7M5.5 10h13M4.5 14.5h15M8.5 19h7" />
                    </svg>
                  </button>
                  <button
                    class="rb sq"
                    :class="{ on: selCell.valign === 'bottom' }"
                    title="Bottom Align"
                    @click="setVAlign('bottom')"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M10.5 5.5h3M8.5 10h7M6.5 14.5h11M4.5 19h15" />
                    </svg>
                  </button>
                </div>
                <div class="hstack">
                  <button
                    class="rb sq"
                    :class="{ on: selCell.align === 'left' }"
                    title="Align Left"
                    @click="setAlign('left')"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M4.5 6h15M4.5 10.5h9M4.5 15h15M4.5 19.5h9" />
                    </svg>
                  </button>
                  <button
                    class="rb sq"
                    :class="{ on: selCell.align === 'center' }"
                    title="Center"
                    @click="setAlign('center')"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M4.5 6h15M7.5 10.5h9M4.5 15h15M7.5 19.5h9" />
                    </svg>
                  </button>
                  <button
                    class="rb sq"
                    :class="{ on: selCell.align === 'right' }"
                    title="Align Right"
                    @click="setAlign('right')"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M4.5 6h15M10.5 10.5h9M4.5 15h15M10.5 19.5h9" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="grp-label">Alignment</div>
          </div>

          <!-- Number -->
          <div class="grp">
            <div class="grp-body">
              <div class="vstack">
                <select
                  class="rsel fmt"
                  title="Number Format"
                  :value="selCell.format || 'general'"
                  @change="setFormat($event.target.value)"
                >
                  <option v-for="f in FORMATS" :key="f.id" :value="f.id">{{ f.label }}</option>
                </select>
                <div class="hstack">
                  <button class="rb sq" title="Percent Style" @click="setFormat('percent')">
                    <svg viewBox="0 0 24 24">
                      <circle cx="8" cy="8" r="2.6" />
                      <circle cx="16" cy="16" r="2.6" />
                      <path d="M18.5 5.5l-13 13" />
                    </svg>
                  </button>
                  <button class="rb sq" title="Increase Decimal" @click="changeDecimals(1)">
                    <svg viewBox="0 0 24 24">
                      <circle cx="4.6" cy="15.6" r="1.2" fill="currentColor" stroke="none" />
                      <rect x="7.6" y="10.5" width="4.4" height="9" rx="2.2" />
                      <rect x="14" y="10.5" width="4.4" height="9" rx="2.2" />
                      <path d="M12.5 5H19M16.8 2.8 19 5l-2.2 2.2" />
                    </svg>
                  </button>
                  <button class="rb sq" title="Decrease Decimal" @click="changeDecimals(-1)">
                    <svg viewBox="0 0 24 24">
                      <circle cx="4.6" cy="15.6" r="1.2" fill="currentColor" stroke="none" />
                      <rect x="7.6" y="10.5" width="4.4" height="9" rx="2.2" />
                      <rect x="14" y="10.5" width="4.4" height="9" rx="2.2" />
                      <path d="M12.5 5H6M8.2 2.8 6 5l2.2 2.2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="grp-label">Number</div>
          </div>

          <!-- Styles -->
          <div class="grp deco">
            <div class="grp-body">
              <button class="rb big" title="Cell Styles" @click="noop">
                <svg viewBox="0 0 24 24">
                  <rect x="4" y="4" width="7.2" height="7.2" rx="1" />
                  <rect x="12.8" y="4" width="7.2" height="7.2" rx="1" />
                  <rect x="4" y="12.8" width="7.2" height="7.2" rx="1" />
                  <rect x="12.8" y="12.8" width="7.2" height="7.2" rx="1" />
                  <path d="M6.2 7.6h2.8M15 7.6h2.8M6.2 16.4h2.8M15 16.4h2.8" />
                </svg>
                <span>Cell Styles</span>
              </button>
            </div>
            <div class="grp-label">Styles</div>
          </div>

          <!-- Cells -->
          <div class="grp">
            <div class="grp-body">
              <div class="vstack">
                <div class="pop-wrap" data-menu>
                  <button class="rb row" title="Insert" @click.stop="toggleMenu('insertCells')">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 4.5v6M9 7.5h6" />
                      <path d="M4 14.5h16M4 19h16" />
                    </svg>
                    <span>Insert</span>
                    <svg class="caret" viewBox="0 0 24 24"><path d="M8 10.5l4 4 4-4" /></svg>
                  </button>
                  <div v-if="openMenu === 'insertCells'" class="menu glass-strong list">
                    <button class="menu-item" @click="insertRowAbove">Insert Rows Above</button>
                    <button class="menu-item" @click="insertColLeft">Insert Columns Left</button>
                  </div>
                </div>
                <div class="pop-wrap" data-menu>
                  <button class="rb row" title="Delete" @click.stop="toggleMenu('deleteCells')">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 7.5h6" />
                      <path d="M4 14.5h16M4 19h16" />
                    </svg>
                    <span>Delete</span>
                    <svg class="caret" viewBox="0 0 24 24"><path d="M8 10.5l4 4 4-4" /></svg>
                  </button>
                  <div v-if="openMenu === 'deleteCells'" class="menu glass-strong list">
                    <button class="menu-item" @click="deleteRow">Delete Rows</button>
                    <button class="menu-item" @click="deleteCol">Delete Columns</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="grp-label">Cells</div>
          </div>

          <!-- Editing -->
          <div class="grp">
            <div class="grp-body">
              <button class="rb big" title="AutoSum" @click="autoSum">
                <svg viewBox="0 0 24 24">
                  <path d="M17 5H7.5l6 7-6 7H17" />
                </svg>
                <span>AutoSum</span>
              </button>
              <div class="vstack">
                <button class="rb row" title="Sort &amp; Filter" @click="noop">
                  <svg viewBox="0 0 24 24">
                    <path d="M4.5 6h15l-5.8 6.7v5.1l-3.4 1.7v-6.8z" />
                  </svg>
                  <span>Sort &amp; Filter</span>
                </button>
              </div>
            </div>
            <div class="grp-label">Editing</div>
          </div>
        </template>

        <template v-else-if="activeTab === 'insert'">
          <!-- Cells -->
          <div class="grp">
            <div class="grp-body">
              <button class="rb big" title="Insert Rows Above" @click="insertRowAbove">
                <svg viewBox="0 0 24 24">
                  <path d="M12 4.5v6M9 7.5h6" />
                  <path d="M4 14.5h16M4 19h16" />
                </svg>
                <span>Rows Above</span>
              </button>
              <button class="rb big" title="Insert Columns Left" @click="insertColLeft">
                <svg viewBox="0 0 24 24">
                  <path d="M7.5 9v6M4.5 12h6" />
                  <path d="M14.5 4v16M19 4v16" />
                </svg>
                <span>Columns Left</span>
              </button>
            </div>
            <div class="grp-label">Cells</div>
          </div>
          <!-- Illustrations -->
          <div class="grp deco">
            <div class="grp-body">
              <button class="rb big" title="Charts" @click="noop">
                <svg viewBox="0 0 24 24">
                  <path d="M4 4v16h16" />
                  <rect x="7" y="11.5" width="3" height="5.5" />
                  <rect x="11.5" y="8" width="3" height="9" />
                  <rect x="16" y="13.5" width="3" height="3.5" />
                </svg>
                <span>Charts</span>
              </button>
            </div>
            <div class="grp-label">Illustrations</div>
          </div>
        </template>

        <template v-else-if="activeTab === 'formulas'">
          <!-- Function Library -->
          <div class="grp">
            <div class="grp-body">
              <button class="rb big" title="AutoSum" @click="autoSum">
                <svg viewBox="0 0 24 24">
                  <path d="M17 5H7.5l6 7-6 7H17" />
                </svg>
                <span>AutoSum</span>
              </button>
              <div class="vstack">
                <button class="rb row" title="Insert SUM" @click="insertFn('SUM')"><span class="fn">SUM</span></button>
                <button class="rb row" title="Insert AVERAGE" @click="insertFn('AVG')">
                  <span class="fn">AVERAGE</span>
                </button>
                <button class="rb row" title="Insert COUNT" @click="insertFn('COUNT')">
                  <span class="fn">COUNT</span>
                </button>
              </div>
              <div class="vstack">
                <button class="rb row" title="Insert MIN" @click="insertFn('MIN')"><span class="fn">MIN</span></button>
                <button class="rb row" title="Insert MAX" @click="insertFn('MAX')"><span class="fn">MAX</span></button>
              </div>
            </div>
            <div class="grp-label">Function Library</div>
          </div>
          <!-- Calculation -->
          <div class="grp deco">
            <div class="grp-body">
              <button class="rb big" title="Calculate Now" @click="noop">
                <svg viewBox="0 0 24 24">
                  <rect x="6" y="4" width="12" height="16" rx="1.5" />
                  <path d="M9 8h6" />
                  <path d="M9.2 12h.01M12 12h.01M14.8 12h.01M9.2 15.5h.01M12 15.5h.01M14.8 15.5h.01" />
                </svg>
                <span>Calculate</span>
              </button>
            </div>
            <div class="grp-label">Calculation</div>
          </div>
        </template>
      </div>

      <!-- Formula bar: name box | fx | input -->
      <div class="formula-bar">
        <input
          class="name-box"
          :value="sel"
          spellcheck="false"
          title="Name Box"
          @focus="$event.target.select()"
          @keydown.enter.prevent="jumpTo"
          @keydown.esc.prevent="$event.target.value = sel; $event.target.blur()"
          @blur="$event.target.value = sel"
        />
        <span class="fx">fx</span>
        <input
          v-model="barText"
          class="bar-input"
          spellcheck="false"
          placeholder="Type a value or =formula"
          @keydown.enter.prevent="commitBar"
          @keydown.esc.prevent="barText = cells[sel]?.raw ?? ''"
        />
      </div>

      <!-- Grid -->
      <div ref="gridEl" class="grid" tabindex="0" @keydown="onGridKeydown">
        <table>
          <thead>
            <tr>
              <th class="corner"></th>
              <th
                v-for="col in colLetters"
                :key="col"
                class="col-head"
                :class="{ headsel: selRef.col === colToNum(col) }"
              >
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row">
              <th class="row-head" :class="{ headsel: selRef.row === row }">{{ row }}</th>
              <td
                v-for="col in colLetters"
                :key="col + row"
                :class="{ sel: col + row === sel, num: isNumeric(col + row), err: !!resultOf(col + row).err }"
                :style="cellStyle(col + row)"
                @mousedown="onCellMouseDown(col + row, $event)"
                @dblclick="startEdit(col + row)"
              >
                <input
                  v-if="editing && editing.key === col + row"
                  ref="editEl"
                  v-model="editing.value"
                  class="cell-editor"
                  spellcheck="false"
                  @keydown.stop="onEditKeydown"
                  @blur="commitEdit()"
                />
                <template v-else>{{ display(col + row) }}</template>
                <span v-if="col + row === sel && !editing" class="fill-handle"></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Status bar -->
      <div class="statusbar">
        <span class="ready">Ready</span>
        <span class="flash">{{ flash }}</span>
        <span class="spacer"></span>
        <template v-if="colStats.count > 0">
          <span class="stat">Average: {{ fmtStat(colStats.avg) }}</span>
          <span class="stat">Count: {{ colStats.count }}</span>
          <span class="stat">Sum: {{ fmtStat(colStats.sum) }}</span>
        </template>
        <span class="zoom">100%</span>
      </div>

      <!-- File backstage -->
      <div v-if="activeTab === 'file'" class="backstage">
        <div class="bs-rail">
          <button class="bs-item" @click="bsSave">
            <svg viewBox="0 0 24 24">
              <path d="M5 4.5h10.5L19 8v11.5H5z" />
              <path d="M8.5 4.5V9h6.5V4.5" />
              <path d="M8.5 13.5h7v6h-7z" />
            </svg>
            <span>Save</span>
          </button>
          <button class="bs-item" @click="bsOpen">
            <svg viewBox="0 0 24 24">
              <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
            </svg>
            <span>Open</span>
          </button>
          <button class="bs-item" @click="bsExport">
            <svg viewBox="0 0 24 24">
              <path d="M12 15V4.5M8.2 8.2 12 4.5l3.8 3.7" />
              <path d="M5 12.5v5A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5v-5" />
            </svg>
            <span>Export CSV</span>
          </button>
          <div class="bs-note">Open / Export use /Users/guest/Documents/sheet.csv</div>
        </div>
        <div class="bs-body" @mousedown.self="activeTab = 'home'">
          <div class="bs-hint">
            <svg class="bs-glyph" viewBox="0 0 24 24">
              <rect x="4" y="3.5" width="16" height="17" rx="2" />
              <path d="M9.5 8.5l5 7M14.5 8.5l-5 7" />
            </svg>
            <p class="name">{{ workbookName }}</p>
            <p>Save this workbook, open the last exported CSV, or export it again.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.excel-root {
  background: var(--window-bg);
  color: var(--text);
  font-size: 13px;
}

/* ---- Top bar ---- */
.topbar {
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 12px;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;
}
.tb-side {
  width: 120px;
  display: flex;
  align-items: center;
}
.tb-side.right {
  justify-content: flex-end;
}
.save-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: v-bind(GREEN);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}
.save-btn:hover {
  background: #1a5c38;
}
.save-btn svg {
  width: 16px;
  height: 16px;
}
.tb-title {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}
.wb-title {
  border: none;
  background: transparent;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  padding: 3px 8px;
  border-radius: 6px;
  outline: none;
  max-width: 100%;
}
.wb-title:hover {
  background: var(--hover);
}
.wb-title:focus {
  background: var(--window-bg);
  box-shadow: 0 0 0 2px rgba(33, 115, 70, 0.5);
}

/* ---- Tab row ---- */
.tabrow {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 0 12px;
  background: var(--titlebar-bg);
  flex-shrink: 0;
}
.tab {
  padding: 5px 12px 6px;
  font-size: 12.5px;
  color: var(--text-dim);
  border-bottom: 2px solid transparent;
  cursor: pointer;
}
.tab:hover {
  color: var(--text);
}
.tab.on {
  color: v-bind(GREEN);
  border-bottom-color: v-bind(GREEN);
  font-weight: 600;
}
.tab.file.on {
  color: #fff;
  background: v-bind(GREEN);
  border-radius: 5px 5px 0 0;
}

.work-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
  container-type: inline-size;
}

/* ---- Ribbon ---- */
.ribbon {
  display: flex;
  align-items: stretch;
  padding: 2px 8px 0;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;
  min-height: 76px;
}
.grp {
  display: flex;
  flex-direction: column;
  border-right: 0.5px solid var(--border);
  padding: 0 3px;
}
.grp:last-child {
  border-right: none;
}
.grp-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 4px;
}
.grp-label {
  text-align: center;
  font-size: 10px;
  color: var(--text-dim);
  padding: 1px 0 3px;
}
.rb {
  display: flex;
  align-items: center;
  gap: 5px;
  border-radius: 5px;
  color: var(--text);
  cursor: pointer;
  border: 0.5px solid transparent;
}
.rb:hover {
  background: var(--hover);
}
.rb.on {
  background: rgba(33, 115, 70, 0.16);
  border-color: rgba(33, 115, 70, 0.55);
}
.rb svg {
  width: 17px;
  height: 17px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}
.rb svg.caret {
  width: 9px;
  height: 9px;
  stroke-width: 2.4;
}
.rb.big {
  flex-direction: column;
  gap: 3px;
  padding: 5px 8px;
  font-size: 11px;
  min-width: 54px;
  align-self: stretch;
  justify-content: center;
}
.rb.big svg {
  width: 22px;
  height: 22px;
}
.rb.row {
  padding: 3px 6px;
  font-size: 11.5px;
}
.rb.sq {
  width: 26px;
  height: 24px;
  justify-content: center;
  padding: 0;
  position: relative;
}
.rb.sq.withbar {
  padding-bottom: 4px;
}
.rb .bar {
  position: absolute;
  left: 5px;
  right: 5px;
  bottom: 3px;
  height: 3px;
  border-radius: 1px;
  border: 0.5px solid rgba(0, 0, 0, 0.18);
}
.vstack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
}
.hstack {
  display: flex;
  align-items: center;
  gap: 2px;
}
.vsep {
  width: 0.5px;
  align-self: stretch;
  background: var(--border);
  margin: 2px 3px;
}
.rsel {
  border: 0.5px solid var(--border);
  background: var(--window-bg);
  color: var(--text);
  border-radius: 4px;
  font-size: 11.5px;
  padding: 2px 3px;
}
.rsel.fam {
  width: 118px;
}
.rsel.size {
  width: 48px;
}
.rsel.fmt {
  width: 104px;
}
.fn {
  font-size: 11.5px;
}

/* ---- Ribbon dropdown menus ---- */
.pop-wrap {
  position: relative;
}
.menu {
  position: absolute;
  top: calc(100% + 3px);
  left: 0;
  z-index: 500;
  border-radius: 8px;
  border: 0.5px solid var(--border);
  padding: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  min-width: 120px;
}
.menu.list {
  padding: 4px;
}
.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 5px 10px;
  font-size: 12px;
  color: var(--text);
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
}
.menu-item:hover {
  background: var(--hover);
}
.sw-grid {
  display: grid;
  grid-template-columns: repeat(5, 22px);
  gap: 5px;
  margin-top: 6px;
}
.sw {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 0.5px solid var(--border);
  cursor: pointer;
}
.sw:hover {
  outline: 2px solid v-bind(GREEN);
  outline-offset: 1px;
}

/* ---- Responsive ribbon (container: .work-area inline size) ---- */
@container (max-width: 880px) {
  .ribbon {
    min-height: 60px;
  }
  .grp {
    padding: 0 2px;
  }
  .grp.deco {
    display: none;
  }
  .grp:has(+ .grp.deco:last-child) {
    border-right: none;
  }
  .grp-body {
    gap: 2px;
    padding: 3px 2px;
  }
  .grp-label {
    display: none;
  }
  .rb.big {
    min-width: 46px;
    padding: 5px;
  }
  .rb.row {
    padding: 3px 4px;
  }
}
@container (max-width: 640px) {
  .ribbon {
    flex-wrap: nowrap;
    min-height: 54px;
    overflow-x: auto;
    padding: 2px 6px 0;
  }
  .grp {
    flex: 0 0 auto;
  }
  .grp-body {
    gap: 2px;
  }
  .grp-label {
    display: none;
  }
}

/* ---- Formula bar ---- */
.formula-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-bottom: 0.5px solid var(--border);
  background: var(--window-bg);
  flex-shrink: 0;
}
.name-box {
  width: 58px;
  text-align: center;
  font-weight: 600;
  font-size: 12px;
  border: 0.5px solid var(--border);
  border-radius: 4px;
  padding: 2px 4px;
  background: var(--titlebar-bg);
  color: var(--text);
  outline: none;
}
.name-box:focus {
  box-shadow: 0 0 0 2px rgba(33, 115, 70, 0.5);
}
.fx {
  color: var(--text-dim);
  font-style: italic;
  font-family: Georgia, serif;
  font-size: 13px;
}
.bar-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  padding: 3px 2px;
}

/* ---- Grid (Excel's canvas stays white in both themes) ---- */
.grid {
  flex: 1;
  overflow: auto;
  outline: none;
  user-select: none;
  background: #fff;
}
.grid table {
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}
.grid th,
.grid td {
  border-right: 1px solid #d4d4d4;
  border-bottom: 1px solid #d4d4d4;
  height: 20px;
  padding: 0;
}
.corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 5;
  width: 34px;
  min-width: 34px;
  background: #eef1ef;
  border-right: 1px solid #c6c6c6;
  border-bottom: 1px solid #c6c6c6;
}
.col-head {
  position: sticky;
  top: 0;
  z-index: 4;
  width: 72px;
  min-width: 72px;
  background: #eef1ef;
  color: #444;
  font-weight: 500;
  font-size: 11px;
  text-align: center;
  border-bottom: 1px solid #c6c6c6;
}
.row-head {
  position: sticky;
  left: 0;
  z-index: 3;
  width: 34px;
  min-width: 34px;
  background: #eef1ef;
  color: #444;
  font-weight: 500;
  font-size: 11px;
  text-align: center;
  border-right: 1px solid #c6c6c6;
}
.col-head.headsel,
.row-head.headsel {
  background: v-bind(GREEN);
  color: #fff;
}
.grid td {
  background: #fff;
  color: #1d1d1f;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: cell;
  position: relative;
  font-size: 12px;
  vertical-align: middle;
}
.grid td.num {
  text-align: right;
}
.grid td.err {
  text-align: right;
  color: #c00000;
}
.grid td.sel {
  outline: 2px solid v-bind(GREEN);
  outline-offset: -2px;
}
.fill-handle {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 6px;
  height: 6px;
  background: v-bind(GREEN);
  border: 1px solid #fff;
  z-index: 2;
  cursor: crosshair;
}
.cell-editor {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: none;
  outline: 2px solid v-bind(GREEN);
  outline-offset: -2px;
  font: inherit;
  color: #1d1d1f;
  background: #fff;
  padding: 0 4px;
  z-index: 1;
}

/* ---- Status bar ---- */
.statusbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 3px 12px;
  border-top: 0.5px solid var(--border);
  background: var(--titlebar-bg);
  color: var(--text-dim);
  font-size: 11px;
  flex-shrink: 0;
}
.ready {
  font-weight: 500;
}
.flash {
  color: v-bind(GREEN);
  font-weight: 600;
}
.statusbar .spacer {
  flex: 1;
}
.zoom {
  border-left: 0.5px solid var(--border);
  padding-left: 12px;
}

/* ---- File backstage ---- */
.backstage {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  background: var(--window-bg);
}
.bs-rail {
  width: 200px;
  background: v-bind(GREEN);
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}
.bs-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}
.bs-item:hover {
  background: rgba(255, 255, 255, 0.14);
}
.bs-item svg {
  width: 17px;
  height: 17px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}
.bs-note {
  margin-top: auto;
  color: rgba(255, 255, 255, 0.65);
  font-size: 10.5px;
  padding: 8px 12px;
  line-height: 1.4;
}
.bs-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bs-hint {
  text-align: center;
  color: var(--text-dim);
  font-size: 12px;
  max-width: 320px;
}
.bs-hint .name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 10px 0 6px;
}
.bs-glyph {
  width: 44px;
  height: 44px;
  stroke: v-bind(GREEN);
  fill: none;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
