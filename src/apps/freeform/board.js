// Board data helpers: palette constants, starter board, localStorage persistence.

const KEY = 'macos-web:freeform'

export const STICKY_COLORS = ['#ffe68a', '#ffc6d9', '#c8f0c2', '#c7e3ff', '#e6d4ff', '#ffd8b3']
export const SHAPE_COLORS = ['#ff9f8a', '#ffd166', '#8ce99a', '#74c0fc', '#b197fc', '#f783ac']
export const EMOJIS = ['😀', '🎉', '💡', '🚀', '❤️', '⭐', '🌵', '🍕', '🐱', '🎨', '📌', '✅']

export const uid = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export function seedItems() {
  return [
    { id: 'seed-title', type: 'text', x: -280, y: -200, w: 340, h: 52, text: '💡 Brainstorm', fontSize: 34, bold: true },
    { id: 'seed-s1', type: 'sticky', x: -280, y: -110, w: 170, h: 170, color: STICKY_COLORS[0], text: 'Welcome!\nDrag me around the board.' },
    { id: 'seed-s2', type: 'sticky', x: -70, y: -90, w: 170, h: 170, color: STICKY_COLORS[3], text: 'Pick a tool from the bar above,\nthen click the canvas.' },
    { id: 'seed-shape', type: 'shape', shape: 'rect', x: 150, y: -130, w: 160, h: 110, color: SHAPE_COLORS[2] },
    { id: 'seed-emoji', type: 'image', x: 190, y: 10, w: 90, h: 90, emoji: '🚀' },
    { id: 'seed-conn', type: 'connector', fromId: 'seed-s2', toId: 'seed-shape' },
  ]
}

export function loadBoard() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.items)) return null
    return data
  } catch {
    return null
  }
}

export function saveBoard({ name, items, pan, zoom }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, items, pan, zoom }))
  } catch {
    /* storage full or unavailable — ignore */
  }
}
