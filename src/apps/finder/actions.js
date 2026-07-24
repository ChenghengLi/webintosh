// Filesystem helpers backing Finder's context-menu actions
// (duplicate, paste, new folder, get info).
import { getNode, listDir, readFile, writeFile, makeDir, normalizePath, fileIconImg } from '../../fs'

// First name produced by make(i) that does not exist yet inside dirPath.
function freeName(dirPath, make) {
  for (let i = 1; ; i++) {
    const name = make(i)
    if (!getNode(normalizePath(name, dirPath))) return name
  }
}

// 'foo' → 'foo copy' → 'foo copy 2' → …
export function duplicateName(dirPath, name) {
  return freeName(dirPath, (i) => (i === 1 ? `${name} copy` : `${name} copy ${i}`))
}

// 'foo' → 'foo 2' → 'foo 3' → … (paste name collision)
export function pasteName(dirPath, name) {
  return freeName(dirPath, (i) => (i === 1 ? name : `${name} ${i}`))
}

// 'untitled folder' → 'untitled folder 2' → …
export function newFolderName(dirPath) {
  return freeName(dirPath, (i) => (i === 1 ? 'untitled folder' : `untitled folder ${i}`))
}

// Shallow copy: files duplicate their content; directories are recreated with
// only their direct children files (nested folders are not copied).
export function copyEntry(srcPath, destDir, destName) {
  const node = getNode(srcPath)
  if (!node) return false
  const destPath = normalizePath(destName, destDir)
  if (node.type === 'file') return writeFile(destPath, readFile(srcPath) ?? '')
  if (!makeDir(destPath)) return false
  for (const child of listDir(srcPath) || []) {
    if (child.type !== 'file') continue
    const childSrc = normalizePath(child.name, srcPath)
    writeFile(normalizePath(child.name, destPath), readFile(childSrc) ?? '')
  }
  return true
}

export function kindLabel(name, type) {
  if (type === 'dir') return 'Folder'
  const ext = name.includes('.') ? name.split('.').pop().toUpperCase() : ''
  return ext ? ext + ' File' : 'File'
}

// Display-ready record for the Get Info panel.
export function entryInfo(path) {
  const node = getNode(path)
  if (!node) return null
  const name = path.split('/').filter(Boolean).pop() || 'Macintosh HD'
  let size
  if (node.type === 'dir') {
    const n = (listDir(path) || []).length
    size = `${n} ${n === 1 ? 'item' : 'items'}`
  } else {
    size = `${(readFile(path) ?? '').length} bytes`
  }
  return { name, kind: kindLabel(name, node.type), path, size, icon: fileIconImg(name, node.type) }
}
