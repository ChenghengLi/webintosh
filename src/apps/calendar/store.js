// Shared calendar state: calendars, persisted events, view/cursor, popover, CRUD helpers.
import { reactive, computed } from 'vue'

export const LS_KEY = 'macos-web:calendar-events'

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
export const WEEKDAY_LETTERS = ['S','M','T','W','T','F','S']

export const CALENDARS = [
  { id: 'home', name: 'Home', color: '#30d158', group: 'iCloud' },
  { id: 'work', name: 'Work', color: '#0a84ff', group: 'iCloud' },
  { id: 'birthdays', name: 'Birthdays', color: '#8e8e93', group: 'iCloud' },
  { id: 'reminders', name: 'Reminders', color: '#ff9f0a', group: 'Other', decorative: true },
]
export const EVENT_CALENDARS = CALENDARS.filter((c) => !c.decorative)
export const calById = (id) => CALENDARS.find((c) => c.id === id) || CALENDARS[0]
export const calColor = (id) => calById(id).color

export const pad = (n) => String(n).padStart(2, '0')
export const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
export const keyOfDate = (dt) => keyOf(dt.getFullYear(), dt.getMonth(), dt.getDate())
export const parseKey = (key) => {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y || 1970, (m || 1) - 1, d || 1)
}

const boot = new Date()
export const todayKey = keyOfDate(boot)

// ISO-8601 week number (the week belongs to the year of its Thursday)
export function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date - yearStart) / 864e5 + 1) / 7)
}

// Day/Week time grid: 6:00–22:00
export const GRID_START = 6 * 60
export const GRID_END = 22 * 60
export const HOUR_H = 48
export const GRID_H = ((GRID_END - GRID_START) / 60) * HOUR_H

export function fmtTime(min) {
  const h24 = Math.floor(min / 60) % 24
  const m = ((min % 60) + 60) % 60
  const ap = h24 < 12 ? 'AM' : 'PM'
  return `${h24 % 12 || 12}:${pad(m)} ${ap}`
}
export function fmtDate(key, opts) {
  return parseKey(key).toLocaleDateString(
    'en-US',
    opts || { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  )
}

// 6 rows × 7 columns, starting the Sunday on/before the 1st; each row carries its ISO week number
export function monthWeeks(y, m) {
  const first = new Date(y, m, 1)
  const start = new Date(y, m, 1 - first.getDay())
  const rows = []
  for (let r = 0; r < 6; r++) {
    const cells = []
    for (let c = 0; c < 7; c++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + r * 7 + c)
      const key = keyOfDate(d)
      cells.push({ key, day: d.getDate(), inMonth: d.getMonth() === m, isToday: key === todayKey })
    }
    const rowStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + r * 7)
    rows.push({ weekNo: isoWeek(rowStart), cells })
  }
  return rows
}

export function weekStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
}

// ---- events (persisted) ----
const LEGACY_CAL = { blue: 'work', green: 'home', orange: 'home' }

function normalizeEvent(ev) {
  if (!ev || typeof ev.title !== 'string') return null
  const startMin = Number.isFinite(ev.startMin) ? ev.startMin : (Number(ev.hour) || 9) * 60
  const endMin = Number.isFinite(ev.endMin) && ev.endMin > startMin ? ev.endMin : startMin + 60
  return {
    id: ev.id ?? Date.now() + Math.floor(Math.random() * 1e6),
    title: ev.title,
    startMin,
    endMin,
    allDay: !!ev.allDay,
    calendar: EVENT_CALENDARS.some((c) => c.id === ev.calendar)
      ? ev.calendar
      : LEGACY_CAL[ev.color] || 'home',
    location: ev.location || '',
    notes: ev.notes || '',
  }
}

function seedEvents() {
  const t = new Date()
  const at = (offset) => keyOfDate(new Date(t.getFullYear(), t.getMonth(), t.getDate() + offset))
  const dow = t.getDay()
  const mon = 1 - (dow === 0 ? 7 : dow) // offset to this week's Monday
  let n = 0
  const mk = (title, sh, sm, eh, em, calendar, extra = {}) => ({
    id: Date.now() + n++,
    title,
    startMin: sh * 60 + sm,
    endMin: eh * 60 + em,
    allDay: false,
    calendar,
    location: '',
    notes: '',
    ...extra,
  })
  const map = {}
  const put = (key, ev) => (map[key] ||= []).push(ev)
  // original seeds
  put(at(0), mk('WWDC recap', 10, 0, 11, 0, 'work'))
  put(at(3), mk('Dinner with Sam', 19, 0, 20, 30, 'home'))
  // timed events this week so Week view has content (incl. an overlapping pair)
  put(at(mon), mk('Team standup', 9, 30, 10, 0, 'work'))
  put(at(mon + 1), mk('1:1 with Sarah', 11, 0, 11, 30, 'work'))
  put(at(mon + 1), mk('Dentist appointment', 11, 15, 12, 0, 'home'))
  put(at(mon + 2), mk('Design review', 14, 0, 15, 30, 'work'))
  put(at(mon + 3), mk('Gym', 7, 0, 8, 0, 'home'))
  put(at(mon + 4), mk('Lunch with Maya', 12, 30, 13, 30, 'home'))
  put(at(mon + 5), mk("Dad's birthday", 0, 0, 0, 0, 'birthdays', { allDay: true }))
  return map
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const map = {}
        for (const [key, list] of Object.entries(parsed)) {
          if (!Array.isArray(list)) continue
          const evs = list.map(normalizeEvent).filter(Boolean)
          if (evs.length) map[key] = evs
        }
        localStorage.setItem(LS_KEY, JSON.stringify(map))
        return map
      }
    }
  } catch (e) { /* fall through to seed */ }
  const seeded = seedEvents()
  try { localStorage.setItem(LS_KEY, JSON.stringify(seeded)) } catch (e) { /* ignore */ }
  return seeded
}

export const state = reactive({
  view: 'Month', // 'Day' | 'Week' | 'Month' | 'Year'
  cursor: { y: boot.getFullYear(), m: boot.getMonth(), d: boot.getDate() },
  events: loadEvents(),
  visible: { home: true, work: true, birthdays: true, reminders: true },
  popover: null, // { mode: 'create'|'view'|'edit', x, y, maxH, key?, eventId?, draft? }
})

export function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state.events))
  } catch (e) { /* storage full — ignore */ }
}

export const cursorDate = computed(() => new Date(state.cursor.y, state.cursor.m, state.cursor.d))
export const cursorKey = computed(() => keyOf(state.cursor.y, state.cursor.m, state.cursor.d))

export function setCursor(y, m, d) {
  state.cursor = { y, m, d }
}
export function setCursorDate(dt) {
  setCursor(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

export function shiftCursor(dir) {
  const { y, m, d } = state.cursor
  let dt
  if (state.view === 'Day') dt = new Date(y, m, d + dir)
  else if (state.view === 'Week') dt = new Date(y, m, d + dir * 7)
  else if (state.view === 'Year') dt = new Date(y + dir, m, d)
  else dt = new Date(y, m + dir, 1)
  setCursorDate(dt)
}
export function goToday() {
  setCursorDate(new Date())
}

// ---- event queries & CRUD ----
export function eventsOn(key) {
  return (state.events[key] || []).filter((ev) => state.visible[ev.calendar])
}

export function findEvent(id) {
  for (const [key, list] of Object.entries(state.events)) {
    const ev = list.find((e) => e.id === id)
    if (ev) return { key, ev }
  }
  return null
}

export function addEvent(draft) {
  const ev = { ...draft, id: Date.now() + Math.floor(Math.random() * 1e6) }
  state.events[draft.key] = [...(state.events[draft.key] || []), ev]
  persist()
  return ev
}

export function updateEvent(origKey, id, draft) {
  const next = { ...state.events }
  const rest = (next[origKey] || []).filter((e) => e.id !== id)
  if (rest.length) next[origKey] = rest
  else delete next[origKey]
  next[draft.key] = [...(next[draft.key] || []), { ...draft, id }]
  state.events = next
  persist()
}

export function deleteEvent(key, id) {
  const next = { ...state.events }
  const rest = (next[key] || []).filter((e) => e.id !== id)
  if (rest.length) next[key] = rest
  else delete next[key]
  state.events = next
  persist()
}

export function moveEventTime(key, id, newStartMin) {
  const ev = (state.events[key] || []).find((e) => e.id === id)
  if (!ev) return
  const dur = ev.endMin - ev.startMin
  ev.startMin = newStartMin
  ev.endMin = newStartMin + dur
  persist()
}

// ---- popover ----
export function closePopover() {
  state.popover = null
}

export function makeDraft(key, startMin = 12 * 60, allDay = false) {
  return {
    key,
    title: '',
    startMin,
    endMin: startMin + 60,
    allDay,
    calendar: 'home',
    location: '',
    notes: '',
  }
}

export function draftFromEvent(key, ev) {
  return {
    key,
    title: ev.title,
    startMin: ev.startMin,
    endMin: ev.endMin,
    allDay: ev.allDay,
    calendar: ev.calendar,
    location: ev.location || '',
    notes: ev.notes || '',
  }
}
