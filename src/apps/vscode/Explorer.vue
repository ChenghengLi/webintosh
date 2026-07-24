<script setup>
import { computed } from 'vue'
import { HOME, fileIcon, listDir } from '@/fs.js'
import { useSystemStore } from '../../stores/system'
import {
  cancelEdit,
  closeFolder,
  commitEdit,
  deleteEntry,
  duplicateEntry,
  editing,
  openFile,
  startCreate,
  startRename,
  ws,
} from './workspace.js'

const system = useSystemStore()

// Focus inline inputs; for files select only the basename (like VS Code).
const vFocus = {
  mounted(el, binding) {
    el.focus()
    if (binding.value) {
      const dot = el.value.lastIndexOf('.')
      el.setSelectionRange(0, dot > 0 ? dot : el.value.length)
    } else {
      el.select()
    }
  },
}

const rootName = computed(() =>
  ws.workspacePath === '/' ? 'ROOT' : (ws.workspacePath.split('/').pop() || '').toUpperCase(),
)

const treeRows = computed(() => {
  const rows = []
  const walk = (dir, depth) => {
    if (editing.mode === 'create' && editing.parent === dir) {
      rows.push({ creating: true, path: '::create::' + dir, depth, type: editing.type })
    }
    for (const item of listDir(dir) || []) {
      const path = (dir === '/' ? '' : dir) + '/' + item.name
      rows.push({ ...item, path, depth })
      if (item.type === 'dir' && ws.expanded[path]) walk(path, depth + 1)
    }
  }
  if (ws.expanded[ws.workspacePath]) walk(ws.workspacePath, 0)
  return rows
})

function onNodeClick(row) {
  if (row.creating) return
  if (row.type === 'dir') ws.expanded[row.path] = !ws.expanded[row.path]
  else openFile(row.path)
}

// ---- Context menus --------------------------------------------------------

function rowMenu(e, row) {
  if (row.creating) return
  if (row.type === 'dir') {
    system.openContextMenu(e.clientX, e.clientY, [
      { label: 'New File', action: () => startCreate(row.path, 'file') },
      { label: 'New Folder', action: () => startCreate(row.path, 'dir') },
      { separator: true },
      { label: 'Rename', action: () => startRename(row) },
      { separator: true },
      { label: 'Delete', action: () => deleteEntry(row.path) },
    ])
  } else {
    system.openContextMenu(e.clientX, e.clientY, [
      { label: 'Open', action: () => openFile(row.path) },
      { separator: true },
      { label: 'Rename', action: () => startRename(row) },
      { label: 'Duplicate', action: () => duplicateEntry(row.path) },
      { separator: true },
      { label: 'Delete', action: () => deleteEntry(row.path) },
    ])
  }
}

function rootMenu(e) {
  system.openContextMenu(e.clientX, e.clientY, [
    { label: 'New File', action: () => startCreate(ws.workspacePath, 'file') },
    { label: 'New Folder', action: () => startCreate(ws.workspacePath, 'dir') },
    { separator: true },
    { label: 'Open Folder…', action: () => (ws.pickerOpen = true) },
    { label: 'Close Folder', disabled: ws.workspacePath === HOME, action: closeFolder },
  ])
}

function emptyMenu(e) {
  system.openContextMenu(e.clientX, e.clientY, [
    { label: 'New File', action: () => startCreate(ws.workspacePath, 'file') },
    { label: 'New Folder', action: () => startCreate(ws.workspacePath, 'dir') },
  ])
}

function headerMenu(e) {
  system.openContextMenu(e.clientX, e.clientY, [
    { label: 'New File', action: () => startCreate(ws.workspacePath, 'file') },
    { label: 'New Folder', action: () => startCreate(ws.workspacePath, 'dir') },
    { separator: true },
    { label: 'Refresh', action: () => (ws.expanded = { ...ws.expanded }) },
    { label: 'Collapse All', action: () => (ws.expanded = { [ws.workspacePath]: true }) },
    { separator: true },
    { label: 'Open Folder…', action: () => (ws.pickerOpen = true) },
    { label: 'Close Folder', disabled: ws.workspacePath === HOME, action: closeFolder },
  ])
}
</script>

<template>
  <div class="explorer">
    <div class="side-header">
      <span class="side-title">EXPLORER</span>
      <span class="side-ws" :title="ws.workspacePath">{{ rootName }}</span>
      <span class="spacer"></span>
      <button class="icon-btn" title="Open Folder…" @click="ws.pickerOpen = true">
        <svg viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 3.5a1 1 0 0 1 1-1H6l1.5 1.5h6a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8.5zm1 8h11V5.5H7L5.5 4h-3v7.5z" />
        </svg>
      </button>
      <button class="icon-btn" title="Views and More Actions…" @click="headerMenu">⋯</button>
    </div>
    <div class="side-body" @contextmenu.prevent.self="emptyMenu">
      <div
        class="root-row"
        @click="ws.expanded[ws.workspacePath] = !ws.expanded[ws.workspacePath]"
        @contextmenu.prevent.stop="rootMenu"
      >
        <span class="chevron" :class="{ open: ws.expanded[ws.workspacePath] }">▸</span>
        <span class="root-name">{{ rootName }}</span>
      </div>
      <div
        v-for="row in treeRows"
        :key="row.path"
        class="tree-row"
        :class="{ selected: !row.creating && row.path === ws.activePath }"
        :style="{ paddingLeft: 18 + row.depth * 12 + 'px' }"
        @click="onNodeClick(row)"
        @contextmenu.prevent.stop="rowMenu($event, row)"
      >
        <template v-if="row.creating">
          <span class="tree-icon">{{ editing.type === 'dir' ? '📁' : '📄' }}</span>
          <input
            v-model="editing.value"
            v-focus="editing.type === 'file'"
            class="tree-input"
            spellcheck="false"
            placeholder="name"
            @keydown.enter.prevent="commitEdit"
            @keydown.esc="cancelEdit"
            @blur="commitEdit"
            @click.stop
          />
        </template>
        <template v-else>
          <span v-if="row.type === 'dir'" class="chevron" :class="{ open: ws.expanded[row.path] }">▸</span>
          <span v-else class="tree-icon">{{ fileIcon(row.name, row.type) }}</span>
          <input
            v-if="editing.mode === 'rename' && editing.path === row.path"
            v-model="editing.value"
            v-focus="row.type === 'file'"
            class="tree-input"
            spellcheck="false"
            @keydown.enter.prevent="commitEdit"
            @keydown.esc="cancelEdit"
            @blur="commitEdit"
            @click.stop
            @contextmenu.stop
          />
          <span v-else class="tree-label">{{ row.name }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.explorer { display: flex; flex-direction: column; height: 100%; }
.side-header {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 12px 6px 20px; font-size: 11px; letter-spacing: 0.5px; color: #bbbbbb;
}
.side-title { flex-shrink: 0; }
.side-ws {
  color: #858585; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}
.side-header .spacer { flex: 1; }
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; color: #858585; cursor: pointer;
  padding: 2px 4px; border-radius: 4px; font-size: 13px; line-height: 1;
}
.icon-btn:hover { background: #3c3c3c; color: #ffffff; }
.icon-btn svg { width: 15px; height: 15px; }

.side-body { flex: 1; overflow-y: auto; padding-bottom: 8px; }
.root-row {
  display: flex; align-items: center; gap: 4px; padding: 4px 8px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.5px; cursor: pointer; color: #d4d4d4;
}
.chevron { display: inline-block; width: 14px; font-size: 10px; color: #cccccc; transition: transform 0.1s; flex-shrink: 0; }
.chevron.open { transform: rotate(90deg); }
.tree-row {
  display: flex; align-items: center; gap: 5px; height: 24px; padding-right: 8px;
  cursor: pointer; white-space: nowrap; color: #d4d4d4;
}
.tree-row:hover { background: #2a2d2e; }
.tree-row.selected { background: #37373d; }
.tree-icon { width: 14px; font-size: 12px; text-align: center; flex-shrink: 0; }
.tree-label { overflow: hidden; text-overflow: ellipsis; }
.tree-input {
  flex: 1; min-width: 0; background: #3c3c3c; border: 1px solid #007fd4;
  color: #d4d4d4; font-size: 13px; font-family: inherit;
  padding: 1px 4px; border-radius: 2px; outline: none;
}
.tree-input::placeholder { color: #858585; }
</style>
