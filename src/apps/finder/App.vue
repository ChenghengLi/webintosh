<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useSystemStore } from '../../stores/system'
import { useWindowsStore } from '../../stores/windows'
import {
  HOME,
  TRASH,
  getNode,
  listDir,
  makeDir,
  move,
  moveToTrash,
  normalizePath,
  remove,
  rename,
  restoreFromTrash,
  emptyTrash,
  trashCount,
  fileIconImg,
} from '../../fs'
import InfoPanel from './InfoPanel.vue'
import QuickLook from './QuickLook.vue'
import {
  copyEntry,
  duplicateName,
  entryInfo,
  kindLabel,
  newFolderName,
  pasteName,
} from './actions'

const props = defineProps({
  path: { type: String, default: HOME },
})

const windows = useWindowsStore()
const system = useSystemStore()

const rootEl = ref(null)
const info = ref(null) // { name, kind, path, size, icon, x, y } | null
const quickLook = ref(null) // full path of the entry shown in the Quick Look panel

function isDir(p) {
  const n = getNode(p)
  return !!n && n.type === 'dir'
}

// --- navigation with back/forward history stack ---
const initial = isDir(props.path) ? normalizePath(props.path) : HOME
const history = ref([initial])
const histIndex = ref(0)
const currentPath = computed(() => history.value[histIndex.value])
const canBack = computed(() => histIndex.value > 0)
const canFwd = computed(() => histIndex.value < history.value.length - 1)
const inTrash = computed(() => currentPath.value === TRASH)

function navigate(path) {
  const p = normalizePath(path)
  if (!isDir(p) || p === currentPath.value) return
  history.value = history.value.slice(0, histIndex.value + 1)
  history.value.push(p)
  histIndex.value++
}
function goBack() {
  if (canBack.value) histIndex.value--
}
function goForward() {
  if (canFwd.value) histIndex.value++
}

// --- view mode (persisted), search, selection ---
const viewMode = ref(localStorage.getItem('macos-web:finder-view') || 'grid')
watch(viewMode, (v) => localStorage.setItem('macos-web:finder-view', v))

const search = ref('')
const selected = ref(null)
watch(currentPath, () => {
  selected.value = null
  search.value = ''
  info.value = null
  quickLook.value = null
  renaming.value = null
})

const allItems = computed(() => listDir(currentPath.value) || [])
const items = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return allItems.value
  return allItems.value.filter((i) => i.name.toLowerCase().includes(q))
})
const folderName = computed(() => currentPath.value.split('/').filter(Boolean).pop() || 'Macintosh HD')

const crumbs = computed(() => {
  const segs = currentPath.value.split('/').filter(Boolean)
  const out = [{ name: 'Macintosh HD', path: '/' }]
  segs.forEach((s, i) => out.push({ name: s, path: '/' + segs.slice(0, i + 1).join('/') }))
  return out
})

const favorites = [
  { name: 'AirDrop', glyph: 'airdrop', decorative: true },
  { name: 'Recents', glyph: 'clock', path: HOME },
  { name: 'Desktop', img: '/icons/folder-desktop.png', path: HOME + '/Desktop' },
  { name: 'Documents', img: '/icons/folder-documents.png', path: HOME + '/Documents' },
  { name: 'Downloads', img: '/icons/folder-downloads.png', path: HOME + '/Downloads' },
  { name: 'Pictures', img: '/icons/folder-pictures.png', path: HOME + '/Pictures' },
]
const icloud = [
  { name: 'iCloud Drive', glyph: 'cloud', decorative: true },
  { name: 'Shared', glyph: 'users', decorative: true },
]

// toolbar title: use the favorite's label when the current path matches one
const locationName = computed(() => {
  const fav = favorites.find((f) => !f.decorative && f.path === currentPath.value)
  return fav ? fav.name : folderName.value
})

function kindOf(item) {
  return kindLabel(item.name, item.type)
}

function fullPath(name) {
  return normalizePath(name, currentPath.value)
}

function open(item) {
  const p = fullPath(item.name)
  if (item.type === 'dir') navigate(p)
  else windows.openApp('vscode', { props: { openPath: p } })
}

// --- context menus (shell-rendered) & file actions ---
function clearSelection() {
  selected.value = null
  info.value = null
}

// --- inline rename (one at a time) ---
const renaming = ref(null) // name of the entry being renamed in the current folder
const renameValue = ref('')

function startRename(item) {
  selected.value = item.name
  renaming.value = item.name
  renameValue.value = item.name
  nextTick(() => {
    const el = rootEl.value?.querySelector('.rename-input')
    if (el) {
      el.focus()
      el.select()
    }
  })
}

function commitRename() {
  const oldName = renaming.value
  if (!oldName) return // already cancelled (blur after Esc)
  renaming.value = null
  const newName = renameValue.value.trim()
  if (!newName || newName === oldName) return
  // fs.rename returns false on collision/invalid — the old name then stays.
  if (rename(fullPath(oldName), newName)) selected.value = newName
}

function cancelRename() {
  renaming.value = null
}

function showInfo(path, event) {
  const data = entryInfo(path)
  if (!data) return
  const rect = rootEl.value?.getBoundingClientRect() || { left: 0, top: 0, width: 600, height: 400 }
  const x = Math.max(8, Math.min(event.clientX - rect.left, rect.width - 270))
  const y = Math.max(8, Math.min(event.clientY - rect.top, rect.height - 190))
  info.value = { ...data, x, y }
}

function copyItem(item) {
  system.fileClipboard = { path: fullPath(item.name), name: item.name, type: item.type, cut: false }
}

function duplicateItem(item) {
  const name = duplicateName(currentPath.value, item.name)
  copyEntry(fullPath(item.name), currentPath.value, name)
}

function forgetItem(item, p) {
  if (selected.value === item.name) selected.value = null
  if (info.value?.path === p) info.value = null
}

function trashItem(item) {
  const p = fullPath(item.name)
  if (!moveToTrash(p)) return
  forgetItem(item, p)
}

function putBack(item) {
  const p = fullPath(item.name)
  if (!restoreFromTrash(p)) return
  forgetItem(item, p)
}

function deleteImmediately(item) {
  const p = fullPath(item.name)
  if (!remove(p)) return
  forgetItem(item, p)
}

function newFolder() {
  makeDir(normalizePath(newFolderName(currentPath.value), currentPath.value))
}

function pasteClipboard() {
  const clip = system.fileClipboard
  if (!clip || !getNode(clip.path)) return
  copyEntry(clip.path, currentPath.value, pasteName(currentPath.value, clip.name))
}

// --- drag & drop: move entries onto folder rows or sidebar folders ---
const dragName = ref(null) // name of the entry being dragged (in current folder)
const dropTarget = ref(null) // path of the currently highlighted drop target

// A drop is valid only into a real dir that is not the dragged entry itself,
// not inside it, and not the folder it already lives in (move() re-checks too).
function canDropInto(destDirPath) {
  if (!dragName.value) return false
  const src = fullPath(dragName.value)
  const dest = normalizePath(destDirPath)
  if (!isDir(dest)) return false
  if (dest === src || dest.startsWith(src + '/')) return false
  const parent = src.slice(0, src.lastIndexOf('/')) || '/'
  if (parent === dest) return false
  return true
}

function dragStart(event, item) {
  dragName.value = item.name
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', fullPath(item.name))
}

function dragEnd() {
  dragName.value = null
  dropTarget.value = null
}

function dragOverTarget(event, dest) {
  if (!canDropInto(dest)) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dropTarget.value = normalizePath(dest)
}

function dragLeaveTarget(dest) {
  if (dropTarget.value === normalizePath(dest)) dropTarget.value = null
}

function dropOnTarget(event, dest) {
  event.preventDefault()
  if (canDropInto(dest)) move(fullPath(dragName.value), dest)
  dragEnd()
}

// Grid/list rows accept drops only when the row is a folder.
function rowDragOver(event, item) {
  if (item.type === 'dir') dragOverTarget(event, fullPath(item.name))
}
function rowDragLeave(item) {
  if (item.type === 'dir') dragLeaveTarget(fullPath(item.name))
}
function rowDrop(event, item) {
  if (item.type === 'dir') dropOnTarget(event, fullPath(item.name))
  else dragEnd()
}

// Sidebar drop targets: only real folder favorites (they carry an `img` icon).
function sideDragOver(event, f) {
  if (f.img && f.path) dragOverTarget(event, f.path)
}
function sideDragLeave(f) {
  if (f.img && f.path) dragLeaveTarget(f.path)
}
function sideDrop(event, f) {
  if (f.img && f.path) dropOnTarget(event, f.path)
}

function itemMenu(event, item) {
  selected.value = item.name
  const p = fullPath(item.name)
  const menu = inTrash.value
    ? [
        { label: 'Open', action: () => open(item) },
        { label: 'Get Info', action: () => showInfo(p, event) },
        { separator: true },
        { label: 'Put Back', action: () => putBack(item) },
        { label: 'Delete Immediately…', action: () => deleteImmediately(item) },
      ]
    : [
        { label: 'Open', action: () => open(item) },
        { label: 'Quick Look', action: () => (quickLook.value = p) },
        { label: 'Get Info', action: () => showInfo(p, event) },
        { separator: true },
        { label: 'Rename', action: () => startRename(item) },
        { label: 'Copy', action: () => copyItem(item) },
        { label: 'Duplicate', action: () => duplicateItem(item) },
        { label: 'Move to Trash', action: () => trashItem(item) },
        ...(item.type === 'dir'
          ? [
              { separator: true },
              { label: 'New Terminal at Folder', action: () => windows.openApp('terminal', { props: { path: p } }) },
            ]
          : []),
      ]
  system.openContextMenu(event.clientX, event.clientY, menu)
}

function backgroundMenu(event) {
  const menu = inTrash.value
    ? [
        { label: 'Empty Trash…', disabled: trashCount() === 0, action: emptyTrash },
        { separator: true },
        { label: 'Get Info', action: () => showInfo(currentPath.value, event) },
      ]
    : [
        { label: 'New Folder', action: newFolder },
        { label: 'Paste', disabled: !system.fileClipboard, action: pasteClipboard },
        { separator: true },
        {
          label: 'New Terminal at Folder',
          action: () => windows.openApp('terminal', { props: { path: currentPath.value } }),
        },
        { separator: true },
        { label: 'Get Info', action: () => showInfo(currentPath.value, event) },
      ]
  system.openContextMenu(event.clientX, event.clientY, menu)
}
</script>

<template>
  <div class="app-root" ref="rootEl">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="nav-btns">
        <button class="nav-btn" :disabled="!canBack" title="Back" @click="goBack">‹</button>
        <button class="nav-btn" :disabled="!canFwd" title="Forward" @click="goForward">›</button>
      </div>
      <div class="title">
        <img class="title-icon" src="/icons/folder.png" alt="" draggable="false" />
        <span class="title-name">{{ locationName }}</span>
      </div>
      <div class="toolbar-right">
        <div class="seg">
          <button
            class="seg-btn"
            :class="{ active: viewMode === 'grid' }"
            title="Icon view"
            @click="viewMode = 'grid'"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <rect x="1" y="1" width="5" height="5" rx="1.2" />
              <rect x="8" y="1" width="5" height="5" rx="1.2" />
              <rect x="1" y="8" width="5" height="5" rx="1.2" />
              <rect x="8" y="8" width="5" height="5" rx="1.2" />
            </svg>
          </button>
          <button
            class="seg-btn"
            :class="{ active: viewMode === 'list' }"
            title="List view"
            @click="viewMode = 'list'"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <rect x="1" y="2" width="12" height="2" rx="1" />
              <rect x="1" y="6" width="12" height="2" rx="1" />
              <rect x="1" y="10" width="12" height="2" rx="1" />
            </svg>
          </button>
        </div>
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" class="search-input" type="text" placeholder="Search" spellcheck="false" />
        </div>
      </div>
    </div>

    <div class="finder-body">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="side-section">
          <div class="side-header">Favorites</div>
          <div
            v-for="f in favorites"
            :key="f.name"
            class="side-item"
            :class="{
              active: f.path === currentPath,
              decorative: f.decorative,
              'drop-target': dropTarget === f.path,
            }"
            @click="f.decorative ? null : navigate(f.path)"
            @dragover="sideDragOver($event, f)"
            @dragleave="sideDragLeave(f)"
            @drop="sideDrop($event, f)"
          >
            <span class="side-icon">
              <img v-if="f.img" class="side-icon-img" :src="f.img" :alt="f.name" draggable="false" />
              <svg
                v-else-if="f.glyph === 'airdrop'"
                class="side-icon-svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <circle cx="12" cy="19.5" r="1.6" fill="currentColor" stroke="none" />
                <path d="M7.7 16.5a5 5 0 0 1 8.6 0" />
                <path d="M4.6 14.75a8.5 8.5 0 0 1 14.8 0" />
                <path d="M1.6 13a12 12 0 0 1 20.8 0" />
              </svg>
              <svg
                v-else-if="f.glyph === 'clock'"
                class="side-icon-svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" />
              </svg>
              <template v-else>{{ f.icon }}</template>
            </span>
            <span class="side-name">{{ f.name }}</span>
          </div>
        </div>
        <div class="side-section">
          <div class="side-header">iCloud</div>
          <div v-for="f in icloud" :key="f.name" class="side-item decorative">
            <span class="side-icon">
              <img v-if="f.img" class="side-icon-img" :src="f.img" :alt="f.name" draggable="false" />
              <svg
                v-else-if="f.glyph === 'cloud'"
                class="side-icon-svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              </svg>
              <svg
                v-else-if="f.glyph === 'users'"
                class="side-icon-svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <template v-else>{{ f.icon }}</template>
            </span>
            <span class="side-name">{{ f.name }}</span>
          </div>
        </div>
      </aside>

      <!-- Content -->
      <div class="main">
        <div
          class="content"
          @click.self="clearSelection"
          @contextmenu.prevent="backgroundMenu($event)"
        >
          <template v-if="items.length">
            <!-- Icon (grid) view -->
            <div v-if="viewMode === 'grid'" class="grid" @click.self="clearSelection">
              <div
                v-for="item in items"
                :key="item.name"
                class="cell"
                :class="{ selected: selected === item.name, 'drop-target': dropTarget === fullPath(item.name) }"
                draggable="true"
                @click.stop="selected = item.name"
                @dblclick.stop="open(item)"
                @contextmenu.prevent.stop="itemMenu($event, item)"
                @dragstart="dragStart($event, item)"
                @dragend="dragEnd"
                @dragover="rowDragOver($event, item)"
                @dragleave="rowDragLeave(item)"
                @drop="rowDrop($event, item)"
              >
                <img
                  class="cell-icon"
                  :src="fileIconImg(item.name, item.type)"
                  :alt="item.name"
                  draggable="false"
                />
                <input
                  v-if="renaming === item.name"
                  v-model="renameValue"
                  class="rename-input cell-rename"
                  type="text"
                  spellcheck="false"
                  @keydown.enter.prevent="commitRename"
                  @keydown.esc.prevent.stop="cancelRename"
                  @blur="commitRename"
                  @click.stop
                  @dblclick.stop
                  @contextmenu.stop
                />
                <div v-else class="cell-name">{{ item.name }}</div>
              </div>
            </div>

            <!-- List view -->
            <table v-else class="list">
              <thead>
                <tr>
                  <th>Name</th>
                  <th class="kind-col">Kind</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in items"
                  :key="item.name"
                  :class="{ selected: selected === item.name, 'drop-target': dropTarget === fullPath(item.name) }"
                  draggable="true"
                  @click.stop="selected = item.name"
                  @dblclick.stop="open(item)"
                  @contextmenu.prevent.stop="itemMenu($event, item)"
                  @dragstart="dragStart($event, item)"
                  @dragend="dragEnd"
                  @dragover="rowDragOver($event, item)"
                  @dragleave="rowDragLeave(item)"
                  @drop="rowDrop($event, item)"
                >
                  <td>
                    <img
                      class="row-icon"
                      :src="fileIconImg(item.name, item.type)"
                      :alt="item.name"
                      draggable="false"
                    />
                    <input
                      v-if="renaming === item.name"
                      v-model="renameValue"
                      class="rename-input row-rename"
                      type="text"
                      spellcheck="false"
                      @keydown.enter.prevent="commitRename"
                      @keydown.esc.prevent.stop="cancelRename"
                      @blur="commitRename"
                      @click.stop
                      @dblclick.stop
                      @contextmenu.stop
                    />
                    <span v-else class="row-name">{{ item.name }}</span>
                  </td>
                  <td class="kind-col">{{ kindOf(item) }}</td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- Empty states -->
          <div v-else class="empty">
            <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
            <div class="empty-text">
              {{ search ? `No results for “${search}”` : 'This folder is empty' }}
            </div>
          </div>
        </div>

        <!-- Path bar / status bar -->
        <div class="statusbar">
          <div class="crumbs">
            <template v-for="(c, i) in crumbs" :key="c.path">
              <span v-if="i > 0" class="crumb-sep">›</span>
              <button
                class="crumb"
                :class="{ current: i === crumbs.length - 1 }"
                @click="navigate(c.path)"
              >
                {{ c.name }}
              </button>
            </template>
          </div>
          <div class="count">{{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}</div>
        </div>
      </div>
    </div>

    <!-- Floating Get Info panel -->
    <InfoPanel v-if="info" :info="info" @close="info = null" />

    <!-- Floating Quick Look panel -->
    <QuickLook v-if="quickLook" :path="quickLook" @close="quickLook = null" />
  </div>
</template>

<style scoped>
.app-root {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--window-bg);
  color: var(--text);
  font-size: 13px;
  user-select: none;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 14px;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
  flex-shrink: 0;
}
.nav-btns {
  display: flex;
  gap: 2px;
}
.nav-btn {
  width: 26px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-btn:hover:not(:disabled) { background: var(--hover); }
.nav-btn:disabled {
  color: var(--text-dim);
  opacity: 0.45;
  cursor: default;
}
.title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  min-width: 0;
}
.title-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}
.title-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.seg {
  display: flex;
  background: var(--hover);
  border-radius: 7px;
  padding: 2px;
  gap: 1px;
}
.seg-btn {
  border: none;
  background: transparent;
  color: var(--text-dim);
  border-radius: 5px;
  width: 30px;
  height: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.seg-btn svg { fill: currentColor; }
.seg-btn.active {
  background: var(--window-bg);
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}
.search-box {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 7px;
  padding: 0 8px;
  height: 26px;
  width: 180px;
}
.search-icon {
  width: 11px;
  height: 11px;
  opacity: 0.6;
  flex-shrink: 0;
}
.search-input {
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 12.5px;
  width: 100%;
  font-family: inherit;
}
.search-input::placeholder { color: var(--text-dim); }

/* Body */
.finder-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.sidebar {
  width: 190px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
  padding: 10px 8px;
  overflow-y: auto;
}
.side-section { margin-bottom: 18px; }
.side-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  padding: 0 8px 4px;
}
.side-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.side-item:hover:not(.decorative) { background: var(--hover); }
.side-item.active { background: var(--selection); }
.side-item.decorative {
  cursor: default;
  opacity: 0.55;
}
.side-item.drop-target {
  background: var(--selection);
  box-shadow: 0 0 0 2px var(--accent);
}
.side-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.side-icon-svg {
  display: block;
  color: var(--text-dim);
}
.side-icon-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  pointer-events: none;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* Grid view */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 6px;
  padding: 14px;
  align-content: start;
  min-height: 100%;
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px 6px;
  border-radius: 8px;
  cursor: default;
}
.cell.selected { background: var(--selection); }
.cell.drop-target {
  background: var(--selection);
  box-shadow: 0 0 0 2px var(--accent);
}
.cell-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  pointer-events: none;
}
.cell-name {
  font-size: 12px;
  text-align: center;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  pointer-events: none;
}

/* List view */
.list {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.list th {
  position: sticky;
  top: 0;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  padding: 5px 12px;
  background: var(--window-bg);
  border-bottom: 0.5px solid var(--border);
  z-index: 1;
}
.list td {
  padding: 5px 12px;
  border-bottom: 0.5px solid var(--border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
}
.list tbody tr {
  cursor: default;
}
.list tbody tr:hover:not(.selected) { background: var(--hover); }
.list tbody tr.selected { background: var(--selection); }
.list tbody tr.drop-target td {
  background: var(--selection);
  box-shadow:
    inset 0 2px 0 var(--accent),
    inset 0 -2px 0 var(--accent);
}
.kind-col {
  width: 140px;
  color: var(--text-dim);
}
.row-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  margin-right: 7px;
  vertical-align: -3px;
  pointer-events: none;
}
.row-name {
  pointer-events: none;
}

/* Inline rename */
.rename-input {
  font-family: inherit;
  color: var(--text);
  background: var(--window-bg);
  border: 1px solid var(--accent);
  border-radius: 4px;
  outline: none;
  margin: 0;
}
.cell-rename {
  width: 100%;
  font-size: 12px;
  text-align: center;
  padding: 1px 4px;
}
.row-rename {
  font-size: 13px;
  padding: 0 3px;
  width: 70%;
}

/* Empty state */
.empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-dim);
}
.empty-icon {
  opacity: 0.5;
}
.empty-icon svg {
  width: 42px;
  height: 42px;
  display: block;
}

/* Status bar */
.statusbar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 12px;
  border-top: 0.5px solid var(--border);
  background: var(--titlebar-bg);
  flex-shrink: 0;
  font-size: 12px;
}
.crumbs {
  display: flex;
  align-items: center;
  gap: 2px;
  overflow: hidden;
  white-space: nowrap;
}
.crumb {
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-size: 12px;
  font-family: inherit;
  padding: 2px 5px;
  border-radius: 5px;
  cursor: pointer;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.crumb:hover {
  background: var(--hover);
  color: var(--text);
}
.crumb.current {
  color: var(--text);
  font-weight: 600;
}
.crumb-sep {
  color: var(--text-dim);
  opacity: 0.6;
}
.count {
  margin-left: auto;
  color: var(--text-dim);
  flex-shrink: 0;
}
</style>
