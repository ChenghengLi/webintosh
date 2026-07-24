// Shared contact data + formatting helpers for the FaceTime app.

export const CONTACTS = [
  { id: 'syd', name: 'Syd Chen', bg: 'linear-gradient(160deg,#ffc45e,#ff8a3d)' },
  { id: 'kai', name: 'Kai Rivera', bg: 'linear-gradient(160deg,#7ee2a8,#1fae59)' },
  { id: 'maya', name: 'Maya Patel', bg: 'linear-gradient(160deg,#c4a5ff,#7a5af5)' },
  { id: 'leo', name: 'Leo Park', bg: 'linear-gradient(160deg,#ffa1c9,#f25f8c)' },
  { id: 'ava', name: 'Ava Brooks', bg: 'linear-gradient(160deg,#8ed2ff,#2f7ef7)' },
  { id: 'noah', name: 'Noah Kim', bg: 'linear-gradient(160deg,#7fe6d2,#14b8a0)' },
]

export const SELF = {
  id: 'you',
  name: 'You',
  bg: 'linear-gradient(160deg,#5b6472,#2c3240)',
}

const FALLBACK = {
  id: 'unknown',
  name: 'Unknown',
  bg: 'linear-gradient(160deg,#9aa0a6,#5f6368)',
}

// "Syd Chen" → "SC", "You" → "Y" — rendered white on the contact's gradient circle.
export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function contactById(id) {
  return CONTACTS.find((c) => c.id === id) || FALLBACK
}

// "4:02 PM" today, "Yesterday", or "7/12/26"
export function formatClock(ts) {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    const h = d.getHours() % 12 || 12
    return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
  }
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
}

// seconds → "m:ss" or "h:mm:ss"
export function formatDuration(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
