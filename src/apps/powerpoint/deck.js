// Deck data model: themes, layouts, placeholder geometry, seed deck, persistence.

const KEY = 'macos-web:powerpoint'

export const uid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// Design-tab themes, applied as the slide background (color/gradient).
export const THEMES = [
  { id: 'white', name: 'Office White', bg: '#ffffff', text: '#262626', dim: '#8a8585' },
  { id: 'black', name: 'Office Black', bg: '#000000', text: '#f2f2f2', dim: '#8f8f8f' },
  { id: 'ion', name: 'Ion', bg: 'linear-gradient(135deg,#0e2a47 0%,#1c5d99 55%,#37a2c9 100%)', text: '#ffffff', dim: '#a9cbe4' },
  { id: 'facet', name: 'Facet', bg: 'linear-gradient(135deg,#0f3d27 0%,#1f7a4d 60%,#4fc08d 100%)', text: '#ffffff', dim: '#b5e0c8' },
  { id: 'organic', name: 'Organic', bg: 'linear-gradient(135deg,#46351f 0%,#8a6d4b 55%,#cbb289 100%)', text: '#fff8ea', dim: '#e0cfab' },
  { id: 'gallery', name: 'Gallery', bg: 'linear-gradient(135deg,#26262b 0%,#4b3a4f 60%,#7c4b5e 100%)', text: '#f4ecf3', dim: '#c3aebd' },
]

export const LAYOUTS = [
  { id: 'title', name: 'Title Slide' },
  { id: 'titleContent', name: 'Title and Content' },
  { id: 'twoContent', name: 'Two Content' },
  { id: 'blank', name: 'Blank' },
]

// Placeholder boxes per layout, in the 960x540 slide design space.
export const PLACEHOLDERS = {
  title: {
    title: { left: 60, top: 160, width: 840, height: 104, size: 44, bold: true, center: true },
    body: { left: 100, top: 288, width: 760, height: 76, size: 22, center: true },
  },
  titleContent: {
    title: { left: 40, top: 26, width: 880, height: 74, size: 32, bold: true },
    body: { left: 40, top: 116, width: 880, height: 388, size: 20 },
  },
  twoContent: {
    title: { left: 40, top: 26, width: 880, height: 74, size: 32, bold: true },
    bodyLeft: { left: 40, top: 116, width: 428, height: 388, size: 18 },
    bodyRight: { left: 492, top: 116, width: 428, height: 388, size: 18 },
  },
  blank: {},
}

export const PH_LABEL = {
  title: 'Click to add title',
  body: 'Click to add text',
  bodyLeft: 'Click to add text',
  bodyRight: 'Click to add text',
}

export const FILL_COLORS = ['#d24726', '#ed7d31', '#ffc000', '#70ad47', '#4472c4', '#5b9bd5', '#7030a0', '#c00000', '#262626', '#ffffff']

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 72]

export const EMOJIS = ['😀', '😎', '🎉', '💡', '🚀', '🔥', '❤️', '⭐', '🎯', '🍍', '💻', '✅']

export function newSlide(layout = 'titleContent') {
  return { id: uid(), layout, title: '', body: '', bodyLeft: '', bodyRight: '', titleSize: 0, bodySize: 0, shapes: [] }
}

export function seedDeck() {
  const s1 = {
    ...newSlide('title'),
    title: 'macOS Web — A Vue.js Story',
    body: 'A full desktop, rebuilt in the browser',
  }
  const s2 = {
    ...newSlide('titleContent'),
    title: 'Built with Vue 3',
    body: '⚡ Vite — instant dev server and HMR\n🍍 Pinia — shared state stores\n🧩 37 apps, self-registering via glob import',
    shapes: [{ id: uid(), type: 'rect', x: 736, y: 60, w: 184, h: 10, fill: '#d24726' }],
  }
  const s3 = {
    ...newSlide('twoContent'),
    title: 'Try it yourself',
    bodyLeft: 'Open Launchpad and pick an app\nDrag, minimize and fullscreen windows',
    bodyRight: 'Right-click the desktop for wallpaper\nSwitch spaces with Ctrl + ← / →',
    shapes: [{ id: uid(), type: 'emoji', x: 425, y: 390, w: 110, h: 110, emoji: '🚀' }],
  }
  return { name: 'macOS Web — A Vue.js Story', theme: 'white', slides: [s1, s2, s3] }
}

export function loadDeck() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.slides) || !data.slides.length) return null
    for (const s of data.slides) {
      if (!s || !PLACEHOLDERS[s.layout]) return null
      if (!Array.isArray(s.shapes)) s.shapes = []
    }
    if (!THEMES.some((t) => t.id === data.theme)) data.theme = 'white'
    return data
  } catch {
    return null
  }
}

export function saveDeck(deck) {
  try {
    localStorage.setItem(KEY, JSON.stringify(deck))
  } catch {
    /* storage full or unavailable — ignore */
  }
}
