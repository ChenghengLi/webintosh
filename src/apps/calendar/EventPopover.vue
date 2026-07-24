<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  state, closePopover, addEvent, updateEvent, deleteEvent, findEvent, draftFromEvent,
  EVENT_CALENDARS, calById, calColor, fmtTime, fmtDate, keyOfDate,
} from './store'

const pop = computed(() => state.popover)
const found = computed(() =>
  pop.value && pop.value.eventId != null ? findEvent(pop.value.eventId) : null
)
const ev = computed(() => found.value?.ev || null)

const titleInput = ref(null)
const calOpen = ref(false)
const draft = ref(null)

watch(
  pop,
  async (p) => {
    calOpen.value = false
    if (!p) {
      draft.value = null
      return
    }
    if (p.mode === 'create') draft.value = { ...p.draft }
    else if (p.mode === 'edit' && found.value)
      draft.value = draftFromEvent(found.value.key, found.value.ev)
    else draft.value = null
    if (p.mode !== 'view') {
      await nextTick()
      titleInput.value?.focus()
    }
  },
  { immediate: true }
)

// if the event vanishes while open (deleted elsewhere), close
watch(found, (f) => {
  if (pop.value && pop.value.mode !== 'create' && !f) closePopover()
})

// keep end after start
watch(
  () => draft.value?.startMin,
  (s) => {
    const d = draft.value
    if (d && !d.allDay && Number.isFinite(s) && d.endMin <= s) d.endMin = Math.min(1440, s + 60)
  }
)

const START_OPTS = Array.from({ length: 96 }, (_, i) => ({ value: i * 15, label: fmtTime(i * 15) }))
const END_OPTS = [...START_OPTS.slice(1), { value: 1440, label: fmtTime(1440) }]

const dateLine = computed(() => (found.value ? fmtDate(found.value.key) : ''))
const timeLine = computed(() => {
  const e = ev.value
  if (!e) return ''
  return e.allDay ? 'all-day' : `${fmtTime(e.startMin)} – ${fmtTime(e.endMin)}`
})

function startEdit() {
  state.popover = { ...pop.value, mode: 'edit' }
}

function save() {
  const d = draft.value
  if (!d) return
  if (!d.title.trim()) {
    titleInput.value?.focus()
    return
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.key)) d.key = keyOfDate(new Date())
  d.title = d.title.trim()
  if (d.allDay) {
    d.startMin = 0
    d.endMin = 0
  } else if (d.endMin <= d.startMin) {
    d.endMin = Math.min(1440, d.startMin + 60)
  }
  if (pop.value.mode === 'create') addEvent(d)
  else updateEvent(found.value.key, ev.value.id, d)
  closePopover()
}

function remove() {
  if (found.value) deleteEvent(found.value.key, ev.value.id)
  closePopover()
}
</script>

<template>
  <div
    v-if="pop"
    class="pop glass-strong"
    :style="{ left: pop.x + 'px', top: pop.y + 'px', maxHeight: (pop.maxH || 480) + 'px' }"
  >
    <!-- view mode -->
    <template v-if="pop.mode === 'view' && ev">
      <div class="vp-cal-row">
        <span class="vp-dot" :style="{ background: calColor(ev.calendar) }" />
        <span class="vp-cal">{{ calById(ev.calendar).name }}</span>
      </div>
      <div class="vp-title">{{ ev.title }}</div>
      <div class="vp-line">{{ dateLine }}</div>
      <div class="vp-line dim">{{ timeLine }}</div>
      <div v-if="ev.location" class="vp-line loc">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 11s-4-3.6-4-6.4A4 4 0 0 1 6 1a4 4 0 0 1 4 3.6C10 7.4 6 11 6 11z" />
          <circle cx="6" cy="4.6" r="1.4" />
        </svg>
        {{ ev.location }}
      </div>
      <div v-if="ev.notes" class="vp-notes">{{ ev.notes }}</div>
      <div class="vp-actions">
        <button class="btn danger" @click="remove">Delete</button>
        <button class="btn primary" @click="startEdit">Edit</button>
      </div>
    </template>

    <!-- create / edit mode -->
    <template v-else-if="draft">
      <input
        ref="titleInput"
        v-model="draft.title"
        class="fp-title"
        type="text"
        placeholder="New Event"
        maxlength="80"
        @keydown.enter="save"
        @keydown.esc="closePopover"
      />
      <div class="fp-row">
        <label class="fp-label">Date</label>
        <input v-model="draft.key" class="fp-input" type="date" />
      </div>
      <div v-if="!draft.allDay" class="fp-row">
        <label class="fp-label">Time</label>
        <select v-model.number="draft.startMin" class="fp-input fp-time">
          <option v-for="o in START_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <span class="fp-dash">–</span>
        <select v-model.number="draft.endMin" class="fp-input fp-time">
          <option v-for="o in END_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div class="fp-row">
        <label class="fp-check">
          <input v-model="draft.allDay" type="checkbox" />
          all-day
        </label>
      </div>
      <div class="fp-row">
        <label class="fp-label">Calendar</label>
        <div class="cal-picker">
          <button class="cal-current fp-input" @click="calOpen = !calOpen">
            <span class="vp-dot" :style="{ background: calColor(draft.calendar) }" />
            <span class="cal-current-name">{{ calById(draft.calendar).name }}</span>
            <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 1l4 4 4-4" />
            </svg>
          </button>
          <div v-if="calOpen" class="cal-menu glass-strong">
            <button
              v-for="c in EVENT_CALENDARS"
              :key="c.id"
              class="cal-opt"
              @click="draft.calendar = c.id; calOpen = false"
            >
              <span class="vp-dot" :style="{ background: c.color }" />
              {{ c.name }}
            </button>
          </div>
        </div>
      </div>
      <div class="fp-row">
        <input v-model="draft.location" class="fp-input" type="text" placeholder="Location" maxlength="80" />
      </div>
      <div class="fp-row">
        <textarea v-model="draft.notes" class="fp-input fp-notes" placeholder="Notes" rows="2"></textarea>
      </div>
      <div class="fp-actions">
        <button v-if="pop.mode === 'edit'" class="btn" @click="closePopover">Cancel</button>
        <button class="btn primary" :disabled="!draft.title.trim()" @click="save">
          {{ pop.mode === 'create' ? 'Add' : 'Save' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pop {
  position: absolute;
  z-index: 90;
  width: 296px;
  overflow-y: auto;
  border: 0.5px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.28);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12.5px;
}

/* view mode */
.vp-cal-row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.vp-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.vp-cal {
  color: var(--text-dim);
  font-size: 11.5px;
}
.vp-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
  word-break: break-word;
}
.vp-line { line-height: 1.35; }
.vp-line.dim { color: var(--text-dim); }
.vp-line.loc {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-dim);
}
.vp-line.loc svg { width: 11px; height: 11px; flex-shrink: 0; }
.vp-notes {
  color: var(--text-dim);
  white-space: pre-wrap;
  word-break: break-word;
  border-top: 0.5px solid var(--border);
  padding-top: 8px;
}
.vp-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;
}

/* form */
.fp-title {
  border: none;
  border-bottom: 0.5px solid var(--border);
  background: transparent;
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
  padding: 2px 0 7px;
  outline: none;
}
.fp-row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.fp-label {
  width: 58px;
  flex-shrink: 0;
  color: var(--text-dim);
  font-size: 12px;
}
.fp-input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 4px 8px;
  border: 0.5px solid var(--border);
  border-radius: 6px;
  background: var(--window-bg);
  color: var(--text);
  font-size: 12px;
  outline: none;
  font-family: inherit;
}
.fp-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
}
.fp-time { flex: 1; }
.fp-dash { color: var(--text-dim); }
.fp-check {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 65px;
  font-size: 12px;
  cursor: pointer;
}
.fp-check input { accent-color: var(--accent); }
.fp-notes {
  resize: none;
  line-height: 1.35;
}

/* calendar picker */
.cal-picker {
  position: relative;
  flex: 1;
  min-width: 0;
}
.cal-current {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  cursor: pointer;
}
.cal-current-name { flex: 1; text-align: left; }
.cal-current svg {
  width: 8px;
  height: 5px;
  color: var(--text-dim);
  flex-shrink: 0;
}
.cal-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  border: 0.5px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.22);
  padding: 4px;
  z-index: 10;
}
.cal-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.cal-opt:hover { background: var(--hover); }

/* buttons */
.fp-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn {
  padding: 4px 14px;
  border: 0.5px solid var(--border);
  border-radius: 7px;
  background: var(--window-bg);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.btn:hover { background: var(--hover); }
.btn.primary {
  background: var(--accent);
  border-color: transparent;
  color: #fff;
}
.btn.primary:hover { filter: brightness(1.08); }
.btn.primary:disabled { opacity: 0.45; cursor: default; }
.btn.danger { color: #ff3b30; }
</style>
