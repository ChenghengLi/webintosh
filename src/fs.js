import { reactive } from 'vue'

// In-memory reactive virtual file system shared by Finder, Terminal and VS Code.

function dir(children = {}) {
  return { type: 'dir', children }
}
function file(content = '') {
  return { type: 'file', content }
}

export const HOME = '/Users/guest'

const tree = reactive(
  dir({
    Applications: dir({}),
    System: dir({ Library: dir({}) }),
    bin: dir({}),
    '.Trash': dir({}),
    Users: dir({
      guest: dir({
        Desktop: dir({
          'Welcome.txt': file(
            'Welcome to macOS Web!\n\nThis desktop is a Vue.js recreation of macOS Tahoe.\nDouble-click apps in the Dock, press Cmd+Space for Spotlight,\nand open Terminal to explore this virtual file system.\n',
          ),
        }),
        Documents: dir({
          'Notes.md': file(
            '# Ideas\n\n- Build a web desktop\n- Add Liquid Glass effects\n- Ship it\n',
          ),
          'Recipes.txt': file(
            'Pasta al Pomodoro\n\n1. Boil pasta\n2. Simmer tomatoes with garlic\n3. Combine and serve\n',
          ),
          'Budget.txt': file('Rent     $1200\nFood      $400\nFun       $150\n',
          ),
          Projects: dir({
            'hello.js': file("console.log('hello from macOS Web')\n"),
            'style.css': file('body {\n  background: #111;\n}\n'),
          }),
        }),
        Downloads: dir({
          'macos-web.zip': file('(simulated archive)'),
        }),
        Pictures: dir({}),
        Music: dir({}),
      }),
    }),
  }),
)

export function normalizePath(path, cwd = HOME) {
  if (!path) return cwd
  let parts
  if (path.startsWith('/')) {
    parts = []
  } else {
    parts = cwd.split('/').filter(Boolean)
  }
  for (const seg of path.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') parts.pop()
    else parts.push(seg)
  }
  return '/' + parts.join('/')
}

export function getNode(path) {
  const p = normalizePath(path, '/')
  if (p === '/') return tree
  let node = tree
  for (const seg of p.split('/').filter(Boolean)) {
    if (!node || node.type !== 'dir' || !node.children[seg]) return null
    node = node.children[seg]
  }
  return node
}

export function exists(path) {
  return getNode(path) !== null
}

export function listDir(path) {
  const node = getNode(path)
  if (!node || node.type !== 'dir') return null
  return Object.keys(node.children)
    .sort((a, b) => {
      const na = node.children[a]
      const nb = node.children[b]
      if (na.type !== nb.type) return na.type === 'dir' ? -1 : 1
      return a.localeCompare(b)
    })
    .map((name) => ({ name, type: node.children[name].type }))
}

export function readFile(path) {
  const node = getNode(path)
  return node && node.type === 'file' ? node.content : null
}

export function writeFile(path, content) {
  const p = normalizePath(path, '/')
  const idx = p.lastIndexOf('/')
  const parentPath = p.slice(0, idx) || '/'
  const name = p.slice(idx + 1)
  const parent = getNode(parentPath)
  if (!parent || parent.type !== 'dir' || !name) return false
  const existing = parent.children[name]
  if (existing && existing.type !== 'file') return false
  if (existing) existing.content = content
  else parent.children[name] = file(content)
  return true
}

export function makeDir(path) {
  const p = normalizePath(path, '/')
  const idx = p.lastIndexOf('/')
  const parent = getNode(p.slice(0, idx) || '/')
  const name = p.slice(idx + 1)
  if (!parent || parent.type !== 'dir' || !name || parent.children[name]) return false
  parent.children[name] = dir()
  return true
}

export function remove(path) {
  const p = normalizePath(path, '/')
  const idx = p.lastIndexOf('/')
  const parent = getNode(p.slice(0, idx) || '/')
  const name = p.slice(idx + 1)
  if (!parent || parent.type !== 'dir' || !parent.children[name]) return false
  delete parent.children[name]
  return true
}

export const TRASH = '/.Trash'

// Move a file or dir (with its whole subtree) to another directory.
export function move(srcPath, destDirPath) {
  const src = normalizePath(srcPath, '/')
  const dest = normalizePath(destDirPath, '/')
  const destDir = getNode(dest)
  if (!destDir || destDir.type !== 'dir') return false
  if (src === '/' || dest === src || dest.startsWith(src + '/')) return false
  const idx = src.lastIndexOf('/')
  const parent = getNode(src.slice(0, idx) || '/')
  const name = src.slice(idx + 1)
  const node = parent && parent.children[name]
  if (!node) return false
  let newName = name
  let i = 2
  while (destDir.children[newName]) newName = `${name} ${i++}`
  destDir.children[newName] = node
  delete parent.children[name]
  return true
}

export function moveToTrash(path) {
  return move(path, TRASH)
}

// Rename a file or dir in place (same parent). Returns false on collision/invalid.
export function rename(path, newName) {
  const p = normalizePath(path, '/')
  const idx = p.lastIndexOf('/')
  const parent = getNode(p.slice(0, idx) || '/')
  const old = p.slice(idx + 1)
  if (!parent || parent.type !== 'dir' || !parent.children[old]) return false
  if (!newName || newName === old) return false
  if (newName.includes('/') || parent.children[newName]) return false
  parent.children[newName] = parent.children[old]
  delete parent.children[old]
  return true
}

export function restoreFromTrash(path) {
  return move(path, '/Users/guest/Documents')
}

export function emptyTrash() {
  const trash = getNode(TRASH)
  if (trash && trash.type === 'dir') trash.children = {}
}

export function trashCount() {
  const trash = getNode(TRASH)
  return trash && trash.type === 'dir' ? Object.keys(trash.children).length : 0
}

export function fileIcon(name, type) {
  if (type === 'dir') return '📁'
  const ext = name.split('.').pop().toLowerCase()
  const map = {
    txt: '📄',
    md: '📝',
    js: '📜',
    css: '🎨',
    zip: '🗜️',
    png: '🖼️',
    jpg: '🖼️',
    mp3: '🎵',
  }
  return map[ext] || '📄'
}

// Real macOS icons (extracted from CoreTypes) for image-based UIs (Finder grid/list).
export function fileIconImg(name, type) {
  return type === 'dir' ? '/icons/folder.png' : '/icons/document.png'
}
