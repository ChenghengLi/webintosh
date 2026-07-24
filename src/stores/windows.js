import { defineStore } from 'pinia'
import { apps } from '../apps'

let cascade = 0

// macOS-style window tiling geometry (work area below the menu bar, above the dock)
export function tileRectFor(pos, vw, vh) {
  const top = 34
  const bottom = 86
  const m = 6
  const W = vw - m * 2
  const H = vh - top - bottom - m
  const hw = Math.round(W / 2) - 3
  const hh = Math.round(H / 2) - 3
  const map = {
    fill: { x: m, y: top, width: W, height: H },
    left: { x: m, y: top, width: hw, height: H },
    right: { x: vw - hw - m, y: top, width: hw, height: H },
    top: { x: m, y: top, width: W, height: hh },
    bottom: { x: m, y: top + H - hh, width: W, height: hh },
    tl: { x: m, y: top, width: hw, height: hh },
    tr: { x: vw - hw - m, y: top, width: hw, height: hh },
    bl: { x: m, y: top + H - hh, width: hw, height: hh },
    br: { x: vw - hw - m, y: top + H - hh, width: hw, height: hh },
  }
  return map[pos] || map.fill
}

export const useWindowsStore = defineStore('windows', {
  state: () => ({
    windows: [],
    nextId: 1,
    nextZ: 100,
    spaces: [1],
    activeSpace: 1,
    spaceDir: 0,
    tilePreview: null, // tiling position previewed while edge-dragging a window
  }),
  getters: {
    activeWindow(s) {
      return s.windows
        .filter((w) => !w.minimized && w.space === s.activeSpace)
        .sort((a, b) => b.z - a.z)[0] || null
    },
    spaceWindows(s) {
      return s.windows.filter((w) => w.space === s.activeSpace)
    },
    activeAppId() {
      return this.activeWindow?.appId || 'finder'
    },
    openAppIds(s) {
      return [...new Set(s.windows.map((w) => w.appId))]
    },
    fullscreenActive(s) {
      return s.windows.some((w) => w.fullscreen && w.space === s.activeSpace && !w.minimized)
    },
  },
  actions: {
    openApp(appId, { title, props } = {}) {
      const meta = apps[appId]
      if (!meta) return null
      const existing = this.windows.find((w) => w.appId === appId)
      if (existing && meta.singleton !== false) {
        existing.minimized = false
        this.focusWindow(existing.id)
        return existing
      }
      const size = meta.defaultSize || { width: 900, height: 600 }
      const vw = window.innerWidth
      const vh = window.innerHeight
      cascade = (cascade + 1) % 8
      const width = Math.min(size.width, vw - 40)
      const height = Math.min(size.height, vh - 120)
      const win = {
        id: this.nextId++,
        appId,
        title: title || meta.name,
        props: props || {},
        x: Math.max(12, Math.round((vw - width) / 2 + cascade * 26 - 90)),
        y: Math.max(40, Math.round((vh - height) / 2 - 30 + cascade * 18)),
        width,
        height,
        z: this.nextZ++,
        minimized: false,
        maximized: false,
        fullscreen: false,
        prevRect: null,
        space: this.activeSpace,
      }
      this.windows.push(win)
      return win
    },
    addSpace() {
      const id = this.spaces.length ? Math.max(...this.spaces) + 1 : 1
      this.spaces.push(id)
      return id
    },
    removeSpace(id) {
      if (this.spaces.length <= 1) return
      this.windows = this.windows.filter((w) => w.space !== id)
      this.spaces = this.spaces.filter((s) => s !== id)
      if (this.activeSpace === id) this.activeSpace = this.spaces[this.spaces.length - 1]
    },
    switchSpace(id) {
      if (this.spaces.includes(id)) this.activeSpace = id
    },
    nextSpace(dir) {
      const i = this.spaces.indexOf(this.activeSpace)
      const n = (i + dir + this.spaces.length) % this.spaces.length
      if (this.spaces[n] === this.activeSpace) return
      this.spaceDir = dir
      this.activeSpace = this.spaces[n]
    },
    closeWindow(id) {
      const w = this.windows.find((w) => w.id === id)
      if (!w || w.closing) return
      w.closing = true
      setTimeout(() => {
        this.windows = this.windows.filter((x) => x.id !== id)
      }, 170)
    },
    quitApp(appId) {
      this.windows = this.windows.filter((w) => w.appId !== appId)
    },
    focusWindow(id) {
      const w = this.windows.find((w) => w.id === id)
      if (!w) return
      w.minimized = false
      if (w.space !== this.activeSpace) this.activeSpace = w.space
      w.z = this.nextZ++
    },
    minimizeWindow(id) {
      const w = this.windows.find((w) => w.id === id)
      if (w) w.minimized = true
    },
    toggleMaximize(id) {
      const w = this.windows.find((w) => w.id === id)
      if (!w) return
      if (w.fullscreen) return this.toggleFullScreen(id)
      const vw = window.innerWidth
      const vh = window.innerHeight
      w.animRect = true
      if (w.maximized) {
        Object.assign(w, w.prevRect)
        w.maximized = false
        w.prevRect = null
      } else {
        w.prevRect = { x: w.x, y: w.y, width: w.width, height: w.height }
        Object.assign(w, { x: 8, y: 34, width: vw - 16, height: vh - 110, maximized: true })
      }
      setTimeout(() => (w.animRect = false), 300)
    },
    toggleFullScreen(id) {
      const w = this.windows.find((w) => w.id === id)
      if (!w) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      w.animRect = true
      if (w.fullscreen) {
        Object.assign(w, w.prevRect)
        w.fullscreen = false
        w.prevRect = null
      } else {
        w.prevRect = { x: w.x, y: w.y, width: w.width, height: w.height, maximized: w.maximized }
        w.maximized = false
        Object.assign(w, { x: 0, y: 0, width: vw, height: vh, fullscreen: true })
      }
      setTimeout(() => (w.animRect = false), 300)
    },
    tileWindow(id, pos) {
      const w = this.windows.find((w) => w.id === id)
      if (!w) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      w.animRect = true
      if (!w.prevRect && !w.fullscreen && !w.maximized)
        w.prevRect = { x: w.x, y: w.y, width: w.width, height: w.height }
      w.maximized = false
      w.fullscreen = false
      Object.assign(w, tileRectFor(pos, vw, vh))
      setTimeout(() => (w.animRect = false), 300)
    },
    arrangeWindows(mode) {
      const active = this.activeWindow
      if (!active) return
      const others = this.windows
        .filter((w) => w.space === this.activeSpace && !w.minimized && w.id !== active.id)
        .sort((a, b) => b.z - a.z)
      const ordered = [active, ...others]
      if (mode === 'left-right') {
        this.tileWindow(ordered[0].id, 'left')
        if (ordered[1]) this.tileWindow(ordered[1].id, 'right')
      } else if (mode === 'right-left') {
        this.tileWindow(ordered[0].id, 'right')
        if (ordered[1]) this.tileWindow(ordered[1].id, 'left')
      } else if (mode === 'quarters') {
        const spots = ['tl', 'tr', 'bl', 'br']
        ordered.slice(0, 4).forEach((w, i) => this.tileWindow(w.id, spots[i]))
      }
    },
    updateRect(id, rect) {
      const w = this.windows.find((w) => w.id === id)
      if (w) Object.assign(w, rect)
    },
    closeAll() {
      this.windows = []
    },
  },
})
