<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const STORE_KEY = 'macos-web:contacts'

function seedContacts() {
  return [
    { id: 'c-tim', first: 'Tim', last: 'Apple', company: 'Apple Inc.', phone: '(408) 555-0142', email: 'tim@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'November 1, 1960', favorite: true },
    { id: 'c-craig', first: 'Craig', last: 'Hairforce', company: 'Apple Inc.', phone: '(408) 555-0110', email: 'craig@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'June 9, 1969', favorite: true },
    { id: 'c-jony', first: 'Jony', last: 'Ive', company: 'LoveFrom', phone: '(415) 555-0177', email: 'jony@lovefrom.com', address: '1 Design Way, San Francisco, CA 94105', birthday: 'February 27, 1967', favorite: false },
    { id: 'c-phil', first: 'Phil', last: 'Schiller', company: 'Apple Inc.', phone: '(408) 555-0163', email: 'phil@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'June 2, 1960', favorite: false },
    { id: 'c-eddy', first: 'Eddy', last: 'Cue', company: 'Apple Inc.', phone: '(408) 555-0188', email: 'eddy@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'October 23, 1964', favorite: false },
    { id: 'c-angela', first: 'Angela', last: 'Ahrendts', company: 'Burberry (ret.)', phone: '(310) 555-0124', email: 'angela@example.com', address: '24 Grove Lane, Los Angeles, CA 90049', birthday: 'June 12, 1960', favorite: false },
    { id: 'c-jeff', first: 'Jeff', last: 'Williams', company: 'Apple Inc.', phone: '(408) 555-0131', email: 'jeff@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'July 20, 1963', favorite: false },
    { id: 'c-kate', first: 'Kate', last: 'Adams', company: 'Apple Inc.', phone: '(408) 555-0196', email: 'kate@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'April 14, 1964', favorite: false },
    { id: 'c-deirdre', first: 'Deirdre', last: "O'Brien", company: 'Apple Inc.', phone: '(408) 555-0155', email: 'deirdre@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'October 4, 1966', favorite: false },
    { id: 'c-luca', first: 'Luca', last: 'Maestri', company: 'Apple Inc.', phone: '(408) 555-0171', email: 'luca@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'October 14, 1963', favorite: false },
    { id: 'c-johny', first: 'Johny', last: 'Srouji', company: 'Apple Inc.', phone: '(408) 555-0149', email: 'johny@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'March 8, 1964', favorite: false },
    { id: 'c-greg', first: 'Greg', last: 'Joswiak', company: 'Apple Inc.', phone: '(408) 555-0122', email: 'joz@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'August 10, 1964', favorite: false },
    { id: 'c-john', first: 'John', last: 'Ternus', company: 'Apple Inc.', phone: '(408) 555-0137', email: 'john.t@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'May 18, 1975', favorite: false },
    { id: 'c-sabih', first: 'Sabih', last: 'Khan', company: 'Apple Inc.', phone: '(408) 555-0180', email: 'sabih@apple.com', address: 'One Apple Park Way, Cupertino, CA 95014', birthday: 'September 2, 1966', favorite: false },
  ]
}

function loadContacts() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return null
    return data
  } catch {
    return null
  }
}

const contacts = ref(loadContacts() ?? seedContacts())
const query = ref('')
const selectedId = ref(contacts.value[0]?.id ?? null)
const editing = ref(false)
const adding = ref(false)
const draft = ref({})
const newContact = ref({ first: '', last: '', company: '', phone: '', email: '', address: '', birthday: '' })
const newFirstInput = ref(null)

watch(
  contacts,
  (list) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list))
    } catch {}
  },
  { deep: true }
)

const GRADIENTS = [
  'linear-gradient(160deg,#ff9a8b,#ff6a88)',
  'linear-gradient(160deg,#fbc2eb,#a6c1ee)',
  'linear-gradient(160deg,#84fab0,#8fd3f4)',
  'linear-gradient(160deg,#fccb90,#d57eeb)',
  'linear-gradient(160deg,#a1c4fd,#c2e9fb)',
  'linear-gradient(160deg,#fddb92,#d1fdff)',
  'linear-gradient(160deg,#e0c3fc,#8ec5fc)',
  'linear-gradient(160deg,#ffd1a9,#ff8f8f)',
  'linear-gradient(160deg,#89f7fe,#66a6ff)',
  'linear-gradient(160deg,#f6d365,#fda085)',
]

function fullName(c) {
  return `${c.first} ${c.last}`.trim() || 'No Name'
}

function initials(c) {
  const f = (c.first || '').trim()[0] || ''
  const l = (c.last || '').trim()[0] || ''
  return (f + l).toUpperCase() || '?'
}

function avatarGradient(c) {
  const name = fullName(c)
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = contacts.value.slice()
  list.sort((a, b) => fullName(a).localeCompare(fullName(b)))
  if (q) {
    list = list.filter((c) =>
      [c.first, c.last, c.company, c.phone, c.email]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    )
  }
  return list
})

const sections = computed(() => {
  const groups = []
  for (const c of filtered.value) {
    const ch = (fullName(c)[0] || '#').toUpperCase()
    const letter = /[A-Z]/.test(ch) ? ch : '#'
    const last = groups[groups.length - 1]
    if (last && last.letter === letter) last.items.push(c)
    else groups.push({ letter, items: [c] })
  }
  return groups
})

const selected = computed(() => contacts.value.find((c) => c.id === selectedId.value) || null)

function selectContact(c) {
  selectedId.value = c.id
  editing.value = false
}

function startEdit() {
  if (!selected.value) return
  draft.value = { ...selected.value }
  editing.value = true
}

function saveEdit() {
  const i = contacts.value.findIndex((c) => c.id === selectedId.value)
  if (i !== -1) contacts.value[i] = { ...draft.value }
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}

function deleteContact() {
  if (!selected.value) return
  const idx = contacts.value.findIndex((c) => c.id === selectedId.value)
  contacts.value.splice(idx, 1)
  editing.value = false
  const next = filtered.value[idx] || filtered.value[idx - 1] || filtered.value[0]
  selectedId.value = next?.id ?? null
}

function toggleFavorite() {
  if (!selected.value) return
  selected.value.favorite = !selected.value.favorite
}

function openAddForm() {
  newContact.value = { first: '', last: '', company: '', phone: '', email: '', address: '', birthday: '' }
  adding.value = true
  nextTick(() => newFirstInput.value?.focus())
}

function saveNewContact() {
  const n = { ...newContact.value }
  if (!n.first.trim() && !n.last.trim()) return
  const c = {
    id: 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    first: n.first.trim(),
    last: n.last.trim(),
    company: n.company.trim(),
    phone: n.phone.trim(),
    email: n.email.trim(),
    address: n.address.trim(),
    birthday: n.birthday.trim(),
    favorite: false,
  }
  contacts.value.push(c)
  adding.value = false
  selectedId.value = c.id
  editing.value = false
}

const fields = [
  { key: 'phone', label: 'phone', placeholder: '(555) 555-0142' },
  { key: 'email', label: 'email', placeholder: 'name@example.com' },
  { key: 'address', label: 'address', placeholder: 'Street, City, State ZIP' },
  { key: 'birthday', label: 'birthday', placeholder: 'January 1, 1990' },
]
</script>

<template>
  <div class="app-root contacts-root">
    <aside class="sidebar">
      <div class="sidebar-toolbar">
        <div class="search-wrap">
          <svg class="search-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="query" class="search" type="text" placeholder="Search" spellcheck="false" />
        </div>
        <button class="add-btn" title="Add contact" @click="openAddForm">＋</button>
      </div>

      <form v-if="adding" class="add-form" @submit.prevent="saveNewContact">
        <input ref="newFirstInput" v-model="newContact.first" placeholder="First name" />
        <input v-model="newContact.last" placeholder="Last name" />
        <input v-model="newContact.company" placeholder="Company" />
        <input v-model="newContact.phone" placeholder="Phone" />
        <input v-model="newContact.email" placeholder="Email" />
        <input v-model="newContact.address" placeholder="Address" />
        <input v-model="newContact.birthday" placeholder="Birthday" />
        <div class="add-actions">
          <button type="button" class="btn" @click="adding = false">Cancel</button>
          <button type="submit" class="btn primary" :disabled="!newContact.first.trim() && !newContact.last.trim()">Add</button>
        </div>
      </form>

      <div class="list">
        <template v-for="s in sections" :key="s.letter">
          <div class="section-letter">{{ s.letter }}</div>
          <div
            v-for="c in s.items"
            :key="c.id"
            class="row"
            :class="{ selected: c.id === selectedId }"
            @click="selectContact(c)"
          >
            <div class="avatar small" :style="{ background: avatarGradient(c) }">{{ initials(c) }}</div>
            <div class="row-text">
              <div class="row-name">{{ fullName(c) }}</div>
              <div class="row-company">{{ c.company || c.phone || ' ' }}</div>
            </div>
            <span v-if="c.favorite" class="row-star"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
          </div>
        </template>
        <div v-if="!filtered.length" class="empty-list">No Results</div>
      </div>
    </aside>

    <main class="card-pane">
      <template v-if="selected">
        <div class="card">
          <div class="card-head">
            <div class="avatar large" :style="{ background: avatarGradient(selected) }">{{ initials(selected) }}</div>
            <template v-if="!editing">
              <div class="card-name">{{ fullName(selected) }}</div>
              <div v-if="selected.company" class="card-company">{{ selected.company }}</div>
            </template>
            <template v-else>
              <div class="name-edit">
                <input v-model="draft.first" placeholder="First name" />
                <input v-model="draft.last" placeholder="Last name" />
                <input v-model="draft.company" placeholder="Company" />
              </div>
            </template>
          </div>

          <div class="card-fields">
            <div v-for="f in fields" :key="f.key" class="field">
              <div class="field-label">{{ f.label }}</div>
              <div v-if="!editing" class="field-value" :class="{ dim: !selected[f.key] }">
                {{ selected[f.key] || '—' }}
              </div>
              <input v-else v-model="draft[f.key]" class="field-input" :placeholder="f.placeholder" />
            </div>
          </div>

          <div class="card-actions">
            <template v-if="!editing">
              <button class="btn" @click="startEdit">Edit</button>
              <button class="btn danger" @click="deleteContact">Delete</button>
            </template>
            <template v-else>
              <button class="btn" @click="cancelEdit">Cancel</button>
              <button class="btn primary" @click="saveEdit">Save</button>
            </template>
          </div>

          <button class="fav-toggle" :class="{ on: selected.favorite }" @click="toggleFavorite">
            <span class="fav-star"><svg viewBox="0 0 24 24" :fill="selected.favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
            {{ selected.favorite ? 'Remove from Favorites' : 'Add to Favorites' }}
          </button>
        </div>
      </template>
      <div v-else class="no-selection">No Selection</div>
    </main>
  </div>
</template>

<style scoped>
.contacts-root {
  flex-direction: row;
  font-size: 13px;
  color: var(--text);
}

/* ---------- sidebar ---------- */
.sidebar {
  width: 250px;
  min-width: 210px;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
}

.sidebar-toolbar {
  display: flex;
  gap: 6px;
  padding: 10px 10px 6px;
  align-items: center;
}

.search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 7px;
  padding: 3px 7px;
}

.search-glyph {
  width: 11px;
  height: 11px;
  opacity: 0.6;
  flex-shrink: 0;
}

.search {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
}

.add-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 0.5px solid var(--border);
  background: var(--hover);
  color: var(--text);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
.add-btn:hover { background: var(--selection); }

.add-form {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 6px 10px 10px;
  border-bottom: 0.5px solid var(--border);
}

.add-form input {
  border: 0.5px solid var(--border);
  border-radius: 5px;
  padding: 4px 7px;
  font-size: 12px;
  background: var(--window-bg);
  color: var(--text);
  outline: none;
}
.add-form input:focus { border-color: var(--accent); }

.add-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 2px;
}

.list {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 8px;
}

.section-letter {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  padding: 8px 12px 2px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  cursor: default;
  border-radius: 6px;
  margin: 0 6px;
}
.row:hover:not(.selected) { background: var(--hover); }
.row.selected { background: var(--accent); }
.row.selected .row-name,
.row.selected .row-company { color: #fff; }
.row.selected .row-star { color: #fff; }

.row-text { flex: 1; min-width: 0; }
.row-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-company {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-star { color: #ffb340; display: inline-flex; flex-shrink: 0; }
.row-star svg { width: 11px; height: 11px; display: block; }

.empty-list {
  text-align: center;
  color: var(--text-dim);
  padding: 30px 0;
}

/* ---------- avatars ---------- */
.avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.35);
}
.avatar.small { width: 30px; height: 30px; font-size: 11px; }
.avatar.large { width: 96px; height: 96px; font-size: 34px; }

/* ---------- card ---------- */
.card-pane {
  flex: 1;
  background: var(--window-bg);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 40px 24px;
}

.card-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 22px;
}

.card-name {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.card-company {
  font-size: 14px;
  color: var(--text-dim);
}

.name-edit {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 240px;
}
.name-edit input {
  border: 0.5px solid var(--border);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 13px;
  background: var(--window-bg);
  color: var(--text);
  outline: none;
  text-align: center;
}
.name-edit input:focus { border-color: var(--accent); }

.card-fields {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 7px 12px;
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 9px;
}

.field-label {
  width: 64px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-align: right;
}

.field-value { flex: 1; }
.field-value.dim { color: var(--text-dim); }

.field-input {
  flex: 1;
  border: 0.5px solid var(--border);
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 13px;
  background: var(--window-bg);
  color: var(--text);
  outline: none;
}
.field-input:focus { border-color: var(--accent); }

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 22px;
}

.btn {
  border: 0.5px solid var(--border);
  background: var(--hover);
  color: var(--text);
  border-radius: 7px;
  padding: 4px 16px;
  font-size: 13px;
  cursor: pointer;
}
.btn:hover { background: var(--selection); }
.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.btn.danger { color: #ff453a; }
.btn:disabled { opacity: 0.45; cursor: default; }

.fav-toggle {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
}
.fav-toggle:hover { background: var(--hover); }
.fav-toggle.on { color: #ffb340; }
.fav-star { display: inline-flex; }
.fav-star svg { width: 14px; height: 14px; display: block; }

.no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  font-size: 16px;
}
</style>
