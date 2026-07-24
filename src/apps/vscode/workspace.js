// Shared workbench state for the VS Code app: workspace root, open tabs,
// recent folders, inline tree editing and localStorage persistence.
// The app is a singleton, so a module-level store is safe.

import { reactive, watch } from 'vue'
import { HOME, exists, getNode, listDir, makeDir, readFile, remove, writeFile } from '@/fs.js'

const LS_KEY = 'macos-web:vscode'

export const ws = reactive({
  workspacePath: HOME, // explorer root folder
  expanded: {}, // path -> true when a tree folder is expanded
  tabs: [], // { path, name, content, saved }
  activePath: '', // path of the active tab ('' = welcome screen)
  recent: [], // last 5 opened folders
  pickerOpen: false, // folder picker modal visibility (not persisted)
})

// Inline tree editing state: mode 'create' (new file/folder under parent) or 'rename'.
export const editing = reactive({ mode: '', path: '', parent: '', type: '', value: '' })

export function joinPath(dir, name) {
  return (dir === '/' ? '' : dir) + '/' + name
}

// ---- Tabs -----------------------------------------------------------------

export function isDirty(tab) {
  return tab.content !== tab.saved
}

export function openFile(path) {
  if (getNode(path)?.type !== 'file') return
  if (!ws.tabs.some((t) => t.path === path)) {
    const content = readFile(path)
    ws.tabs.push({ path, name: path.split('/').pop(), content, saved: content })
  }
  ws.activePath = path
}

export function closeTab(tab) {
  const i = ws.tabs.indexOf(tab)
  if (i === -1) return
  ws.tabs.splice(i, 1)
  if (ws.activePath === tab.path) ws.activePath = ws.tabs[Math.min(i, ws.tabs.length - 1)]?.path || ''
}

export function saveTab(tab) {
  if (tab && writeFile(tab.path, tab.content)) tab.saved = tab.content
}

// ---- Workspace folder -------------------------------------------------------

export function openFolder(path) {
  if (getNode(path)?.type !== 'dir') return
  ws.workspacePath = path
  ws.expanded = { [path]: true }
  ws.recent = [path, ...ws.recent.filter((p) => p !== path)].slice(0, 5)
}

export function closeFolder() {
  ws.workspacePath = HOME
  ws.expanded = { [HOME]: true }
}

// ---- Inline create / rename -------------------------------------------------

export function startCreate(parent, type) {
  editing.mode = 'create'
  editing.path = ''
  editing.parent = parent
  editing.type = type // 'file' | 'dir'
  editing.value = ''
  ws.expanded[parent] = true // make sure the input row is visible
}

export function startRename(row) {
  editing.mode = 'rename'
  editing.path = row.path
  editing.parent = ''
  editing.type = row.type
  editing.value = row.name
}

export function cancelEdit() {
  editing.mode = ''
  editing.path = ''
  editing.parent = ''
  editing.type = ''
  editing.value = ''
}

export function commitEdit() {
  const name = editing.value.trim()
  if (editing.mode === 'rename') {
    if (name) renameEntry(editing.path, name)
  } else if (editing.mode === 'create' && name && !name.includes('/')) {
    const p = joinPath(editing.parent, name)
    if (!exists(p)) {
      if (editing.type === 'dir') makeDir(p)
      else if (writeFile(p, '')) openFile(p)
    }
  }
  cancelEdit()
}

// ---- File operations ----------------------------------------------------------

function copyRecursive(src, dest) {
  const node = getNode(src)
  if (!node || exists(dest)) return false
  if (node.type === 'file') return writeFile(dest, node.content)
  if (!makeDir(dest)) return false
  for (const child of listDir(src) || []) copyRecursive(joinPath(src, child.name), joinPath(dest, child.name))
  return true
}

// "file.txt" -> "file copy.txt", "file copy 2.txt", ... (dirs: no extension split)
function uniqueCopyPath(path) {
  const name = path.split('/').pop()
  const parent = path.slice(0, path.length - name.length - 1) || '/'
  const isDir = getNode(path)?.type === 'dir'
  const dot = isDir ? -1 : name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let i = 1
  let candidate
  do {
    candidate = joinPath(parent, `${base} copy${i > 1 ? ' ' + i : ''}${ext}`)
    i++
  } while (exists(candidate))
  return candidate
}

export function duplicateEntry(path) {
  copyRecursive(path, uniqueCopyPath(path))
}

// Keep open tabs, the active tab and expanded keys in sync when a path moves.
function onPathMoved(oldP, newP) {
  for (const t of ws.tabs) {
    if (t.path === oldP) {
      t.path = newP
      t.name = newP.split('/').pop()
    } else if (t.path.startsWith(oldP + '/')) {
      t.path = newP + t.path.slice(oldP.length)
    }
  }
  if (ws.activePath === oldP) ws.activePath = newP
  else if (ws.activePath.startsWith(oldP + '/')) ws.activePath = newP + ws.activePath.slice(oldP.length)
  const moved = {}
  for (const k of Object.keys(ws.expanded)) {
    if (k === oldP || k.startsWith(oldP + '/')) {
      moved[newP + k.slice(oldP.length)] = ws.expanded[k]
      delete ws.expanded[k]
    }
  }
  Object.assign(ws.expanded, moved)
}

export function renameEntry(path, newName) {
  newName = (newName || '').trim()
  const oldName = path.split('/').pop()
  if (!newName || newName === oldName) return true
  if (newName.includes('/')) return false
  const parent = path.slice(0, path.length - oldName.length - 1) || '/'
  const np = joinPath(parent, newName)
  if (exists(np)) return false
  if (!copyRecursive(path, np)) return false
  remove(path)
  onPathMoved(path, np)
  return true
}

export function deleteEntry(path) {
  if (!remove(path)) return
  for (let i = ws.tabs.length - 1; i >= 0; i--) {
    const p = ws.tabs[i].path
    if (p === path || p.startsWith(path + '/')) closeTab(ws.tabs[i])
  }
  for (const k of Object.keys(ws.expanded)) {
    if (k === path || k.startsWith(path + '/')) delete ws.expanded[k]
  }
  if (editing.path && (editing.path === path || editing.path.startsWith(path + '/'))) cancelEdit()
}

// ---- Persistence --------------------------------------------------------------

let restored = false

export function restore() {
  if (restored) return
  restored = true
  try {
    const data = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if (data) {
      if (data.workspacePath && getNode(data.workspacePath)?.type === 'dir') ws.workspacePath = data.workspacePath
      if (data.expanded && typeof data.expanded === 'object') ws.expanded = data.expanded
      for (const t of data.tabs || []) {
        if (t && typeof t.path === 'string' && getNode(t.path)?.type === 'file') {
          ws.tabs.push({
            path: t.path,
            name: t.path.split('/').pop(),
            content: typeof t.content === 'string' ? t.content : '',
            saved: typeof t.saved === 'string' ? t.saved : '',
          })
        }
      }
      if (ws.tabs.some((t) => t.path === data.activePath)) ws.activePath = data.activePath
      ws.recent = (Array.isArray(data.recent) ? data.recent : [])
        .filter((p) => getNode(p)?.type === 'dir')
        .slice(0, 5)
    }
  } catch {
    // corrupt stored state — start clean
  }
  if (!Object.keys(ws.expanded).length) ws.expanded = { [ws.workspacePath]: true }
  if (!ws.activePath && ws.tabs.length) ws.activePath = ws.tabs[0].path
}

watch(
  () => [ws.tabs, ws.activePath, ws.workspacePath, ws.expanded, ws.recent],
  () => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          workspacePath: ws.workspacePath,
          expanded: ws.expanded,
          tabs: ws.tabs,
          activePath: ws.activePath,
          recent: ws.recent,
        }),
      )
    } catch {
      // storage full — ignore
    }
  },
  { deep: true },
)
