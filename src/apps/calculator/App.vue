<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// ---- State ---------------------------------------------------------------

const entry = ref('0')          // current value as an editable string
const typing = ref(false)       // true while the user is entering digits
const accumulator = ref(null)   // left operand / running result
const pendingOp = ref(null)     // operator waiting for the right operand
const lastOp = ref(null)        // remembered for repeated "="
const lastOperand = ref(null)
const error = ref(false)
const flash = ref(null)         // id of the button currently flashing
let flashTimer = null

const OPS = {
  '+': (a, b) => a + b,
  '−': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => (b === 0 ? NaN : a / b),
}
const OP_IDS = { div: '÷', mul: '×', sub: '−', add: '+' }
const MAX_DIGITS = 12

// ---- Core logic ----------------------------------------------------------

function resetAll() {
  entry.value = '0'
  typing.value = false
  accumulator.value = null
  pendingOp.value = null
  lastOp.value = null
  lastOperand.value = null
  error.value = false
}

function showError() {
  error.value = true
  typing.value = false
  accumulator.value = null
  pendingOp.value = null
  lastOp.value = null
  lastOperand.value = null
}

function compute(a, op, b) {
  const r = OPS[op](a, b)
  if (!isFinite(r) || isNaN(r)) { showError(); return }
  const rounded = parseFloat(r.toPrecision(12))
  accumulator.value = rounded
  entry.value = String(rounded)
}

function inputDigit(d) {
  if (error.value) resetAll()
  if (!typing.value) {
    entry.value = d
    typing.value = true
    return
  }
  if (entry.value.replace(/[^0-9]/g, '').length >= MAX_DIGITS) return
  if (entry.value === '0') entry.value = d
  else if (entry.value === '-0') entry.value = '-' + d
  else entry.value += d
}

function inputDecimal() {
  if (error.value) resetAll()
  if (!typing.value) {
    entry.value = '0.'
    typing.value = true
  } else if (!entry.value.includes('.')) {
    entry.value += '.'
  }
}

function setOperator(op) {
  if (error.value) return
  if (typing.value) {
    if (pendingOp.value !== null) {
      compute(accumulator.value, pendingOp.value, parseFloat(entry.value))
      if (error.value) return
    } else {
      accumulator.value = parseFloat(entry.value)
    }
    typing.value = false
  }
  pendingOp.value = op
  lastOp.value = null
}

function equals() {
  if (error.value) return
  if (pendingOp.value !== null) {
    // No new entry since the operator: reuse the accumulator as operand.
    const b = typing.value ? parseFloat(entry.value) : accumulator.value
    lastOp.value = pendingOp.value
    lastOperand.value = b
    compute(accumulator.value, pendingOp.value, b)
    pendingOp.value = null
    typing.value = false
  } else if (lastOp.value !== null) {
    // Repeated "=": apply the last operation to the current result.
    compute(parseFloat(entry.value), lastOp.value, lastOperand.value)
    typing.value = false
  }
}

function percent() {
  if (error.value) return
  const v = parseFloat(entry.value)
  let r
  if ((pendingOp.value === '+' || pendingOp.value === '−') && accumulator.value !== null) {
    r = accumulator.value * v / 100 // 100 + 10 % → 110
  } else {
    r = v / 100
  }
  entry.value = String(parseFloat(r.toPrecision(12)))
  typing.value = true
}

function negate() {
  if (error.value || entry.value === '0') return
  entry.value = entry.value.startsWith('-') ? entry.value.slice(1) : '-' + entry.value
  if (!typing.value && pendingOp.value === null) accumulator.value = parseFloat(entry.value)
}

function clearPress() {
  if (typing.value && !error.value) {
    // "C": clear only the current entry, keep the pending calculation.
    entry.value = '0'
    typing.value = false
  } else {
    resetAll()
  }
}

function backspace() {
  if (error.value) { resetAll(); return }
  if (!typing.value) return
  entry.value = entry.value.length > 1 ? entry.value.slice(0, -1) : '0'
  if (entry.value === '0' || entry.value === '-') {
    entry.value = '0'
    typing.value = false
  }
}

// ---- Display -------------------------------------------------------------

function formatEntry(s) {
  if (/[eE]/.test(s) || s === 'NaN' || s.includes('Infinity')) return s
  const neg = s.startsWith('-')
  const parts = (neg ? s.slice(1) : s).split('.')
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (neg ? '-' : '') + grouped + (parts.length > 1 ? '.' + parts[1] : '')
}

const display = computed(() => (error.value ? 'Error' : formatEntry(entry.value)))

const displaySize = computed(() => {
  const len = display.value.length
  if (len <= 6) return 56
  if (len <= 9) return 48
  if (len <= 12) return 40
  if (len <= 16) return 32
  return 26
})

// ---- Buttons & input dispatch --------------------------------------------

const buttons = computed(() => [
  { id: 'clear', label: typing.value && !error.value ? 'C' : 'AC', cls: 'util' },
  { id: 'neg', label: '+/−', cls: 'util' },
  { id: 'pct', label: '%', cls: 'util' },
  { id: 'div', label: '÷', cls: 'op' },
  { id: '7', label: '7', cls: 'dig' },
  { id: '8', label: '8', cls: 'dig' },
  { id: '9', label: '9', cls: 'dig' },
  { id: 'mul', label: '×', cls: 'op' },
  { id: '4', label: '4', cls: 'dig' },
  { id: '5', label: '5', cls: 'dig' },
  { id: '6', label: '6', cls: 'dig' },
  { id: 'sub', label: '−', cls: 'op' },
  { id: '1', label: '1', cls: 'dig' },
  { id: '2', label: '2', cls: 'dig' },
  { id: '3', label: '3', cls: 'dig' },
  { id: 'add', label: '+', cls: 'op' },
  { id: '0', label: '0', cls: 'dig', wide: true },
  { id: 'dec', label: '.', cls: 'dig' },
  { id: 'eq', label: '=', cls: 'op' },
])

const actions = {
  clear: clearPress,
  neg: negate,
  pct: percent,
  div: () => setOperator('÷'),
  mul: () => setOperator('×'),
  sub: () => setOperator('−'),
  add: () => setOperator('+'),
  eq: equals,
  dec: inputDecimal,
  '0': () => inputDigit('0'),
  '1': () => inputDigit('1'),
  '2': () => inputDigit('2'),
  '3': () => inputDigit('3'),
  '4': () => inputDigit('4'),
  '5': () => inputDigit('5'),
  '6': () => inputDigit('6'),
  '7': () => inputDigit('7'),
  '8': () => inputDigit('8'),
  '9': () => inputDigit('9'),
}

function opActive(id) {
  return OP_IDS[id] === pendingOp.value && !typing.value && !error.value
}

function trigger(id) {
  flash.value = id
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flash.value = null }, 120)
  actions[id]()
}

// ---- Keyboard support ----------------------------------------------------

const KEYMAP = {
  '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'pct',
  Enter: 'eq', '=': 'eq', Escape: 'clear', '.': 'dec',
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (e.key === 'Backspace') {
    e.preventDefault()
    backspace()
    return
  }
  const id = /^[0-9]$/.test(e.key) ? e.key : KEYMAP[e.key]
  if (!id) return
  e.preventDefault()
  trigger(id)
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearTimeout(flashTimer)
})
</script>

<template>
  <div class="app-root calc">
    <div class="display" :style="{ fontSize: displaySize + 'px' }">{{ display }}</div>
    <div class="pad">
      <button
        v-for="b in buttons"
        :key="b.id"
        class="key"
        :class="[b.cls, { wide: b.wide, lit: b.cls === 'op' && opActive(b.id), flash: flash === b.id }]"
        @click="trigger(b.id)"
      >{{ b.label }}</button>
    </div>
  </div>
</template>

<style scoped>
.calc {
  flex-direction: column;
  background: #323236;
  user-select: none;
  -webkit-user-select: none;
}

.display {
  height: 100px;
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 0 20px 10px;
  color: #fff;
  font-weight: 200;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  transition: font-size 0.1s ease;
}

.pad {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(5, minmax(0, 1fr));
  gap: 9px;
  padding: 10px;
}

.key {
  border: none;
  outline: none;
  min-width: 0;
  min-height: 0;
  border-radius: 999px;
  font-family: inherit;
  font-size: 21px;
  font-weight: 400;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: filter 0.12s ease, background 0.12s ease, color 0.12s ease;
}

.key:hover { filter: brightness(1.12); }
.key:active, .key.flash { filter: brightness(1.45); }

.key.dig { background: #616163; }
.key.util { background: #454547; font-size: 19px; }

.key.op {
  background: #ff9f0a;
  font-size: 25px;
  font-weight: 500;
  padding-bottom: 2px;
}

/* Pending operator: inverted white pill with orange glyph. */
.key.op.lit {
  background: #fff;
  color: #ff9f0a;
}

.key.wide {
  grid-column: span 2;
  justify-content: flex-start;
  padding-left: 26px;
}
</style>
