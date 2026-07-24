<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import StatusBar from './StatusBar.vue'
import {
  createProcesses,
  tickProcesses,
  createSysStats,
  tickSysStats,
  fmtCpuTime,
  fmtMem,
  CAT_COLORS,
  procIcon,
} from './processes.js'

const TABS = ['CPU', 'Memory', 'Energy', 'Disk', 'Network']
const HISTORY_MAX = 100

const COLUMNS = [
  { key: 'name', label: 'Process Name', num: false },
  { key: 'cpu', label: '% CPU', num: true },
  { key: 'cpuTime', label: 'CPU Time', num: true },
  { key: 'threads', label: 'Threads', num: true },
  { key: 'mem', label: 'Memory', num: true },
]

const tab = ref('CPU')
const query = ref('')
const sortKey = ref('cpu')
const sortDir = ref(-1) // 1 = asc, -1 = desc
const selected = ref(null)

const processes = ref(createProcesses())
const sys = ref(createSysStats(processes.value))
const history = ref([])

let timer = null
onMounted(() => {
  timer = setInterval(() => {
    tickProcesses(processes.value)
    tickSysStats(sys.value, processes.value)
    history.value.push({ u: sys.value.user, s: sys.value.system })
    if (history.value.length > HISTORY_MAX) history.value.shift()
  }, 1000)
})
onUnmounted(() => clearInterval(timer))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return processes.value
  return processes.value.filter((p) => p.name.toLowerCase().includes(q))
})

const sorted = computed(() => {
  const arr = filtered.value.slice()
  const k = sortKey.value
  const d = sortDir.value
  arr.sort((a, b) =>
    k === 'name' ? d * a.name.localeCompare(b.name) : d * (a[k] - b[k])
  )
  return arr
})

function sortBy(key) {
  if (sortKey.value === key) {
    sortDir.value = -sortDir.value
  } else {
    sortKey.value = key
    sortDir.value = key === 'name' ? 1 : -1
  }
}
</script>

<template>
  <div class="app-root am">
    <!-- toolbar -->
    <div class="toolbar">
      <button
        class="quit"
        :class="{ armed: selected }"
        title="Quit Process"
        aria-label="Quit Process"
      >
        <svg viewBox="0 0 10 10" width="9" height="9">
          <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </button>

      <div class="segmented">
        <button
          v-for="t in TABS"
          :key="t"
          class="seg"
          :class="{ active: tab === t }"
          @click="tab = t"
        >{{ t }}</button>
      </div>

      <div class="spacer"></div>

      <div class="search">
        <span class="mag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M17.5 11a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />
            <path d="M20.5 20.5 16 16" />
          </svg>
        </span>
        <input v-model="query" type="text" placeholder="Search" spellcheck="false" />
        <button v-if="query" class="clear" @click="query = ''">✕</button>
      </div>
    </div>

    <!-- process table -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th
              v-for="c in COLUMNS"
              :key="c.key"
              :class="{ num: c.num, sorted: sortKey === c.key }"
              @click="sortBy(c.key)"
            >
              <span class="th-inner">
                {{ c.label }}
                <span v-if="sortKey === c.key" class="arrow">{{ sortDir === 1 ? '▲' : '▼' }}</span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="sorted.length === 0">
            <td colspan="5" class="empty">No matching processes</td>
          </tr>
          <tr
            v-for="p in sorted"
            :key="p.name"
            :class="{ selected: selected === p.name, hot: p.cpu >= 25 }"
            @click="selected = p.name"
          >
            <td class="name">
              <span class="picon" :style="{ color: CAT_COLORS[p.cat] }">
                <img v-if="procIcon(p.name)" class="picon-img" :src="procIcon(p.name)" :alt="p.name" draggable="false" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5z" />
                  <path d="M3.5 8.6h17" />
                  <path d="M6 6.6h.01" />
                </svg>
              </span>
              {{ p.name }}
            </td>
            <td class="num">{{ p.cpu.toFixed(1) }}</td>
            <td class="num">{{ fmtCpuTime(p.cpuTime) }}</td>
            <td class="num">{{ p.threads }}</td>
            <td class="num">{{ fmtMem(p.mem) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <StatusBar :tab="tab" :sys="sys" :history="history" />
  </div>
</template>

<style scoped>
.am {
  background: var(--window-bg);
}

/* ---- toolbar ---- */
.toolbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
}
.quit {
  flex: none;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #b2b2b9, #83838a);
  clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
  filter: drop-shadow(0 0 0.5px rgba(0, 0, 0, 0.4));
  opacity: 0.45;
  transition: opacity 0.15s, transform 0.1s;
}
.quit.armed { opacity: 1; }
.quit:active { transform: scale(0.92); }

.segmented {
  display: flex;
  border: 0.5px solid var(--border);
  border-radius: 7px;
  overflow: hidden;
}
.seg {
  padding: 3px 14px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.seg + .seg { border-left: 0.5px solid var(--border); }
.seg.active { background: var(--selection); }

.spacer { flex: 1; }

.search {
  flex: none;
  display: flex;
  align-items: center;
  gap: 5px;
  width: 190px;
  padding: 3px 8px;
  border: 0.5px solid var(--border);
  border-radius: 7px;
  background: var(--window-bg);
}
.search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--selection);
}
.mag { display: flex; opacity: 0.6; color: var(--text); }
.mag svg { width: 11px; height: 11px; }
.search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: var(--text);
}
.search input::placeholder { color: var(--text-dim); }
.clear {
  flex: none;
  font-size: 9px;
  color: var(--text-dim);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--hover);
  display: grid;
  place-items: center;
}

/* ---- table ---- */
.table-wrap {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--window-bg);
  border-bottom: 0.5px solid var(--border);
  border-right: 0.5px solid var(--border);
  padding: 4px 10px;
  text-align: left;
  font-weight: 600;
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}
thead th:last-child { border-right: none; }
thead th:hover { color: var(--text); background: var(--hover); }
thead th.sorted { color: var(--text); }
thead th.num { text-align: right; }
.th-inner {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
th.num .th-inner { flex-direction: row-reverse; }
.arrow { font-size: 8px; }

tbody td {
  padding: 3px 10px;
  white-space: nowrap;
  border-bottom: 0.5px solid var(--border);
  font-variant-numeric: tabular-nums;
}
tbody tr { cursor: default; }
tbody tr:hover { background: var(--hover); }
tbody tr.selected { background: var(--selection); }
td.num { text-align: right; }
td.name {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 500;
}
.picon {
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.picon svg {
  width: 15px;
  height: 15px;
}
.picon-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  display: block;
}
tr.hot td:nth-of-type(2) { color: #ff3b30; font-weight: 600; }
.empty {
  text-align: center;
  color: var(--text-dim);
  padding: 28px 0 !important;
}
</style>
