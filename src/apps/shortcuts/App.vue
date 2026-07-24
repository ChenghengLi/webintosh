<script setup>
import { ref, reactive, computed } from 'vue'
import { useSystemStore } from '../../stores/system'
import { SHORTCUTS, GALLERY } from './data'
import Glyph from './Glyph.vue'

const system = useSystemStore()

// ---- persisted run counts ----
const RUNS_KEY = 'macos-web:shortcuts:runs'
function loadRuns() {
  try {
    const data = JSON.parse(localStorage.getItem(RUNS_KEY) || '{}')
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}
const runs = reactive(loadRuns())
function persistRuns() {
  localStorage.setItem(RUNS_KEY, JSON.stringify({ ...runs }))
}
const runCount = (id) => runs[id] || 0

// ---- navigation ----
const tab = ref('shortcuts') // 'shortcuts' | 'gallery'
const selected = ref(null) // shortcut in detail view, null = grid
const view = computed(() => (selected.value ? 'detail' : tab.value))

function openShortcut(s) {
  if (running.value) return
  selected.value = s
}
function back() {
  if (running.value) return
  selected.value = null
}
function showTab(t) {
  if (running.value) return
  selected.value = null
  tab.value = t
}

// ---- run engine ----
const running = ref(false)
const stepState = ref([]) // per action: 'pending' | 'active' | 'done'
const lastRan = ref(null) // shortcut id of most recent finished run

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function run(s) {
  if (running.value) return
  running.value = true
  lastRan.value = null
  stepState.value = s.actions.map(() => 'pending')
  for (let i = 0; i < s.actions.length; i++) {
    stepState.value[i] = 'active'
    await delay(600)
    stepState.value[i] = 'done'
    await delay(180)
  }
  let message = s.result
  if (s.execute) {
    try {
      message = s.execute(system)
    } catch {
      message = s.result || 'Finished.'
    }
  }
  runs[s.id] = runCount(s.id) + 1
  persistRuns()
  lastRan.value = s.id
  showBanner(s, message)
  running.value = false
}

// ---- in-app notification banner ----
const banner = ref(null) // { glyph, gradient, title, message }
let bannerTimer = null
function showBanner(s, message) {
  banner.value = { glyph: s.glyph, gradient: s.gradient, title: s.name, message }
  clearTimeout(bannerTimer)
  bannerTimer = setTimeout(() => (banner.value = null), 4200)
}
function galleryTap(item) {
  showBanner(
    { glyph: item.glyph, gradient: item.gradient, name: item.title },
    `“${item.title}” is a Gallery preview on this demo Mac.`,
  )
}
</script>

<template>
  <div class="app-root sc-root">
    <!-- sidebar -->
    <aside class="sidebar">
      <div class="side-title">Shortcuts</div>
      <button
        class="side-row"
        :class="{ active: view === 'shortcuts' || view === 'detail' }"
        @click="showTab('shortcuts')"
      >
        <span class="side-ico"><Glyph name="bolt" /></span> All Shortcuts
      </button>
      <button class="side-row" :class="{ active: view === 'gallery' }" @click="showTab('gallery')">
        <span class="side-ico"><Glyph name="grid" /></span> Gallery
      </button>
      <div class="side-sub">AUTOMATION</div>
      <div class="side-hint">Personal automations are unavailable on this Mac.</div>
    </aside>

    <!-- main -->
    <main class="main">
      <!-- library grid -->
      <template v-if="view === 'shortcuts'">
        <header class="page-head">
          <h1>All Shortcuts</h1>
          <span class="count-pill">{{ SHORTCUTS.length }}</span>
        </header>
        <div class="grid">
          <button
            v-for="s in SHORTCUTS"
            :key="s.id"
            class="tile"
            :style="{ background: s.gradient }"
            @click="openShortcut(s)"
          >
            <span class="tile-glyph"><Glyph :name="s.glyph" /></span>
            <span class="tile-name">{{ s.name }}</span>
            <span class="tile-meta">{{ s.actions.length }} action{{ s.actions.length === 1 ? '' : 's' }}</span>
            <span v-if="runCount(s.id)" class="tile-runs">{{ runCount(s.id) }}×</span>
          </button>
        </div>
      </template>

      <!-- gallery -->
      <template v-else-if="view === 'gallery'">
        <header class="page-head">
          <h1>Gallery</h1>
        </header>
        <p class="gal-sub">Shortcuts from your apps, curated collections and more.</p>
        <div class="gal-grid">
          <button
            v-for="g in GALLERY"
            :key="g.title"
            class="gal-card"
            :style="{ background: g.gradient }"
            @click="galleryTap(g)"
          >
            <span class="gal-glyph"><Glyph :name="g.glyph" /></span>
            <span class="gal-title">{{ g.title }}</span>
            <span class="gal-from">{{ g.from }}</span>
            <span class="gal-add">＋</span>
          </button>
        </div>
      </template>

      <!-- detail / editor -->
      <template v-else>
        <header class="ed-head">
          <button class="back" @click="back">‹ All Shortcuts</button>
          <div class="ed-id">
            <span class="ed-icon" :style="{ background: selected.gradient }"><Glyph :name="selected.glyph" /></span>
            <div class="ed-names">
              <div class="ed-name">{{ selected.name }}</div>
              <div class="ed-meta">
                {{ selected.actions.length }} action{{ selected.actions.length === 1 ? '' : 's' }}
                <template v-if="runCount(selected.id)">
                  · Run {{ runCount(selected.id) }} time{{ runCount(selected.id) === 1 ? '' : 's' }}
                </template>
              </div>
            </div>
          </div>
          <button class="run-btn" :disabled="running" @click="run(selected)">
            <span v-if="!running" class="run-label">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
              Run
            </span>
            <span v-else class="spin-dark"></span>
          </button>
        </header>

        <div class="ed-body">
          <div class="action-list">
            <div
              v-for="(a, i) in selected.actions"
              :key="i"
              class="action-row"
              :class="{ active: running && stepState[i] === 'active' }"
            >
              <span class="a-icon" :style="{ background: a.tint }"><Glyph :name="a.icon" /></span>
              <div class="a-text">
                <div class="a-name">{{ a.name }}</div>
                <div v-if="a.params" class="a-params">{{ a.params }}</div>
              </div>
              <span class="a-status">
                <span v-if="running && stepState[i] === 'active'" class="spin"></span>
                <transition name="pop">
                  <svg
                    v-if="stepState[i] === 'done' && (running || lastRan === selected.id)"
                    class="check"
                    viewBox="0 0 16 16"
                  >
                    <circle cx="8" cy="8" r="8" fill="#30d158" />
                    <path
                      d="M4.4 8.2l2.3 2.3 4.9-4.9"
                      fill="none"
                      stroke="#fff"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </transition>
              </span>
            </div>
          </div>
          <p class="ed-foot">
            When run, this shortcut performs {{ selected.actions.length }} action{{
              selected.actions.length === 1 ? '' : 's'
            }}.
          </p>
        </div>
      </template>

      <!-- in-app notification banner -->
      <transition name="banner">
        <div v-if="banner" class="banner glass-strong" @click="banner = null">
          <span class="b-icon" :style="{ background: banner.gradient }"><Glyph :name="banner.glyph" /></span>
          <div class="b-text">
            <div class="b-title">{{ banner.title }}</div>
            <div class="b-msg">{{ banner.message }}</div>
          </div>
        </div>
      </transition>
    </main>
  </div>
</template>

<style scoped>
.sc-root { flex-direction: row; overflow: hidden; position: relative; }

/* ---- sidebar ---- */
.sidebar {
  width: 210px; flex-shrink: 0; background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border); padding: 14px 10px;
  display: flex; flex-direction: column; gap: 2px;
}
.side-title { font-size: 11px; font-weight: 700; color: var(--text-dim); padding: 0 8px 6px; }
.side-row {
  display: flex; align-items: center; gap: 8px; width: 100%;
  border: none; background: none; font: inherit; font-size: 13px;
  color: var(--text); padding: 5px 8px; border-radius: 6px;
  cursor: pointer; text-align: left;
}
.side-row:hover { background: var(--hover); }
.side-row.active { background: var(--selection); }
.side-ico { width: 18px; display: flex; justify-content: center; font-size: 15px; color: var(--text); }
.side-sub { font-size: 11px; font-weight: 700; color: var(--text-dim); padding: 14px 8px 4px; }
.side-hint { font-size: 11px; color: var(--text-dim); padding: 0 8px; line-height: 1.4; }

/* ---- main ---- */
.main {
  flex: 1; overflow-y: auto; padding: 20px 24px 32px;
  background: var(--window-bg); position: relative;
}
.page-head { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.page-head h1 { font-size: 22px; font-weight: 700; margin: 0; color: var(--text); }
.count-pill {
  font-size: 12px; font-weight: 600; color: var(--text-dim);
  background: var(--hover); border-radius: 10px; padding: 1px 8px;
}

/* ---- library grid ---- */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.tile {
  position: relative; border: none; border-radius: 12px; height: 96px;
  padding: 10px 12px; display: flex; flex-direction: column; align-items: flex-start;
  cursor: pointer; font: inherit; color: #fff; text-align: left;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.18), 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.12s ease, filter 0.12s ease;
}
.tile:hover { transform: scale(1.03); filter: brightness(1.06); }
.tile:active { transform: scale(0.98); }
.tile-glyph {
  font-size: 24px; line-height: 1; margin-bottom: auto; color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}
.tile-name { font-size: 13px; font-weight: 600; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); }
.tile-meta { font-size: 11px; opacity: 0.75; }
.tile-runs {
  position: absolute; top: 8px; right: 8px; font-size: 10px; font-weight: 700;
  background: rgba(0, 0, 0, 0.25); border-radius: 8px; padding: 1px 6px;
}

/* ---- gallery ---- */
.gal-sub { margin: -8px 0 16px; font-size: 12px; color: var(--text-dim); }
.gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.gal-card {
  position: relative; border: none; border-radius: 12px; height: 74px; padding: 10px 12px;
  display: grid; grid-template-columns: 34px 1fr auto; grid-template-rows: 1fr 1fr;
  align-items: center; column-gap: 10px; cursor: pointer; font: inherit;
  color: #fff; text-align: left;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.18), 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.12s ease, filter 0.12s ease;
}
.gal-card:hover { transform: scale(1.02); filter: brightness(1.06); }
.gal-glyph { grid-row: 1 / 3; font-size: 26px; color: #fff; display: flex; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2)); }
.gal-title {
  font-size: 13px; font-weight: 600; align-self: end;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}
.gal-from { font-size: 11px; opacity: 0.75; align-self: start; }
.gal-add {
  grid-row: 1 / 3; width: 22px; height: 22px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.28); display: flex; align-items: center;
  justify-content: center; font-size: 14px; font-weight: 700;
}

/* ---- detail / editor ---- */
.ed-head { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.back {
  border: none; background: none; font: inherit; font-size: 13px;
  color: var(--accent); cursor: pointer; padding: 4px 0; flex-shrink: 0;
}
.back:hover { text-decoration: underline; }
.ed-id { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.ed-icon {
  width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center;
  justify-content: center; font-size: 24px; flex-shrink: 0; color: #fff;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.18);
}
.ed-name { font-size: 16px; font-weight: 700; color: var(--text); }
.ed-meta { font-size: 12px; color: var(--text-dim); }
.run-btn {
  border: none; font: inherit; font-size: 13px; font-weight: 600; color: #fff;
  background: var(--accent); border-radius: 8px; padding: 6px 18px; cursor: pointer;
  min-width: 86px; display: flex; align-items: center; justify-content: center; gap: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.run-btn:hover:not(:disabled) { filter: brightness(1.1); }
.run-btn:disabled { opacity: 0.7; cursor: default; }
.run-label { display: flex; align-items: center; gap: 5px; }
.run-label svg { width: 11px; height: 11px; }

.ed-body { max-width: 560px; margin: 0 auto; }
.action-list { display: flex; flex-direction: column; gap: 8px; }
.action-row {
  display: flex; align-items: center; gap: 10px;
  background: var(--titlebar-bg); border: 0.5px solid var(--border);
  border-radius: 10px; padding: 10px 12px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.action-row.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
}
.a-icon {
  width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; font-size: 16px; flex-shrink: 0; color: #fff;
}
.a-text { flex: 1; min-width: 0; }
.a-name { font-size: 13px; font-weight: 600; color: var(--text); }
.a-params {
  font-size: 12px; color: var(--text-dim);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.a-status {
  width: 18px; height: 18px; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0;
}
.check { width: 16px; height: 16px; }
.ed-foot { margin-top: 14px; font-size: 11px; color: var(--text-dim); text-align: center; }

/* ---- spinner ---- */
.spin,
.spin-dark {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--text-dim) 35%, transparent);
  border-top-color: var(--text-dim); animation: rot 0.7s linear infinite;
}
.spin-dark { border-color: rgba(255, 255, 255, 0.35); border-top-color: #fff; }
@keyframes rot { to { transform: rotate(360deg); } }

/* ---- banner ---- */
.banner {
  position: absolute; top: 12px; right: 12px; z-index: 10;
  display: flex; align-items: center; gap: 10px; max-width: 320px;
  padding: 10px 14px; border-radius: 14px; border: 0.5px solid var(--border);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.25); cursor: pointer;
}
.b-icon {
  width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; font-size: 17px; flex-shrink: 0; color: #fff;
}
.b-title { font-size: 13px; font-weight: 700; color: var(--text); }
.b-msg { font-size: 12px; color: var(--text-dim); line-height: 1.35; }
.banner-enter-active,
.banner-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.banner-enter-from,
.banner-leave-to { opacity: 0; transform: translateY(-10px); }
.pop-enter-active { transition: transform 0.18s ease; }
.pop-enter-from { transform: scale(0.4); }
</style>
