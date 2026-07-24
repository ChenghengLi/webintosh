// mapdata.js — builds the fake city geometry for the Maps app.
// Pure data + helpers, no Vue. The world is 2200 x 1500 "world units",
// rendered by App.vue as absolutely-positioned divs inside a transformed layer.

export const WORLD_W = 2200
export const WORLD_H = 1500

// Deterministic PRNG so the city is identical on every launch.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Street grid (center lines). Streets are drawn 14 units wide around these.
const H_STREETS = [
  { y: 60, name: 'Marina Blvd' }, { y: 180, name: 'Chestnut St' },
  { y: 300, name: 'Union St' }, { y: 420, name: 'Bay St' },
  { y: 540, name: 'Geary Blvd' }, { y: 660, name: 'Market St' },
  { y: 780, name: 'Fulton St' }, { y: 900, name: 'Mission St' },
  { y: 1020, name: 'Howard St' }, { y: 1140, name: 'Harrison St' },
  { y: 1260, name: 'Bryant St' }, { y: 1380, name: 'Cesar Chavez St' },
]
const V_STREETS = [
  { x: 460, name: 'Divisadero St' }, { x: 600, name: 'Scott St' },
  { x: 740, name: 'Van Ness Ave' }, { x: 880, name: 'Polk St' },
  { x: 1020, name: 'Larkin St' }, { x: 1160, name: 'Powell St' },
  { x: 1300, name: 'Montgomery St' }, { x: 1440, name: 'Kearny St' },
  { x: 1580, name: 'Grant Ave' }, { x: 1720, name: 'Stockton St' },
  { x: 1860, name: 'Folsom St' }, { x: 2000, name: 'Potrero Ave' },
  { x: 2140, name: 'Bayshore Blvd' },
]

// Minor streets — thin connectors halfway between the arterials. They carve
// each block into sub-blocks (see buildBuildings) and are drawn 7 units wide.
const MINOR_H = [
  { y: 120, name: 'Lombard St' }, { y: 240, name: 'Greenwich St' },
  { y: 360, name: 'Filbert St' }, { y: 480, name: 'Sacramento St' },
  { y: 600, name: 'California St' }, { y: 720, name: 'Hayes St' },
  { y: 840, name: 'Page St' }, { y: 960, name: '16th St' },
  { y: 1080, name: '18th St' }, { y: 1200, name: '20th St' },
  { y: 1320, name: '24th St' }, { y: 1440, name: 'Silver Ave' },
]
const MINOR_V = [
  { x: 530, name: 'Baker St' }, { x: 670, name: 'Gough St' },
  { x: 810, name: 'Franklin St' }, { x: 950, name: 'Hyde St' },
  { x: 1090, name: 'Leavenworth St' }, { x: 1230, name: 'Mason St' },
  { x: 1370, name: 'Sansome St' }, { x: 1510, name: 'Church St' },
  { x: 1650, name: 'Sanchez St' }, { x: 1790, name: 'Guerrero St' },
  { x: 1930, name: 'Valencia St' }, { x: 2070, name: 'Hampshire St' },
]

const WATER = [
  { x: -40, y: -40, w: 470, h: 1580, r: '0 46% 42% 0 / 0 24% 28% 0' }, // the bay (west edge)
  { x: 1420, y: -190, w: 210, h: 780, r: '40%', rotate: 14 }, // mission creek (north-east)
]
const ISLANDS = [{ x: 258, y: 620, w: 66, h: 44, r: '50%' }]
const PARKS = [
  { x: 460, y: 980, w: 540, h: 270, name: 'Golden Gate Park' },
  { x: 460, y: 60, w: 360, h: 240, name: 'Presidio' },
  { x: 1420, y: 700, w: 150, h: 130, name: 'Dolores Park' },
]
const LAKES = [{ x: 640, y: 1088, w: 150, h: 52, r: '50%' }] // stow lake, inside GGP
const HIGHWAYS = [
  { x: 440, y: 647, w: 1740, h: 26, name: 'US-101' }, // over Market St
  { x: 1287, y: 40, w: 26, h: 1420, name: 'I-280' }, // over Montgomery St
]

// Areas where buildings and street labels must not appear.
const SKIP_RECTS = [
  { x: 0, y: 0, w: 435, h: WORLD_H }, // bay
  { x: 1330, y: 0, w: 400, h: 620 }, // creek (axis-aligned approx of the rotated rect)
  ...PARKS,
  { x: 640, y: 1088, w: 150, h: 52 }, // lake
]

const intersects = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const pointIn = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const skippedPoint = (x, y) => SKIP_RECTS.some((r) => pointIn(x, y, r))

function buildBuildings(rnd) {
  const out = []
  for (let i = 0; i < V_STREETS.length - 1; i++) {
    for (let j = 0; j < H_STREETS.length - 1; j++) {
      const x0 = V_STREETS[i].x
      const x1 = V_STREETS[i + 1].x
      const y0 = H_STREETS[j].y
      const y1 = H_STREETS[j + 1].y
      // each block is carved into sub-blocks by the minor streets crossing it
      const mx = MINOR_V.find((s) => s.x > x0 && s.x < x1)?.x
      const my = MINOR_H.find((s) => s.y > y0 && s.y < y1)?.y
      const xSpans = mx ? [[x0 + 9, mx - 5], [mx + 5, x1 - 9]] : [[x0 + 9, x1 - 9]]
      const ySpans = my ? [[y0 + 9, my - 5], [my + 5, y1 - 9]] : [[y0 + 9, y1 - 9]]
      for (const [sx0, sx1] of xSpans) {
        for (const [sy0, sy1] of ySpans) {
          const block = { x: sx0, y: sy0, w: sx1 - sx0, h: sy1 - sy0 }
          if (block.w < 16 || block.h < 16) continue
          if (SKIP_RECTS.some((r) => intersects(block, r))) continue
          const cols = block.w > 90 ? (rnd() < 0.5 ? 2 : 3) : rnd() < 0.6 ? 2 : 1
          const rows = block.h > 70 ? 2 : block.h > 38 && rnd() < 0.5 ? 2 : 1
          const cw = block.w / cols
          const ch = block.h / rows
          for (let c = 0; c < cols; c++) {
            for (let r2 = 0; r2 < rows; r2++) {
              if (rnd() < 0.16) continue
              const ix = 2.5 + rnd() * 5
              const iy = 2.5 + rnd() * 5
              const w = cw - ix * 2 - 2
              const h = ch - iy * 2 - 2
              if (w < 8 || h < 8) continue
              out.push({
                x: Math.round(block.x + c * cw + ix),
                y: Math.round(block.y + r2 * ch + iy),
                w: Math.round(w),
                h: Math.round(h),
                dark: rnd() < 0.25,
              })
            }
          }
        }
      }
    }
  }
  return out
}

function buildLabels() {
  const out = []
  for (const s of H_STREETS) {
    for (const x of [700, 1240, 1980]) {
      if (!skippedPoint(x, s.y)) out.push({ x, y: s.y, text: s.name, kind: 'st-l' })
    }
  }
  for (const s of V_STREETS) {
    if (s.x === 1300) continue // I-280 shields sit here instead
    for (const y of [430, 960]) {
      if (!skippedPoint(s.x, y)) out.push({ x: s.x, y, text: s.name, kind: 'st-l', rotate: -90 })
    }
  }
  // minor streets: smaller type, fewer repeats, rotated along the street
  for (const s of MINOR_H) {
    for (const x of [1000, 1660]) {
      if (!skippedPoint(x, s.y)) out.push({ x, y: s.y, text: s.name, kind: 'st-m' })
    }
  }
  for (const s of MINOR_V) {
    for (const y of [520, 1330]) {
      if (!skippedPoint(s.x, y)) out.push({ x: s.x, y, text: s.name, kind: 'st-m', rotate: -90 })
    }
  }
  for (const p of PARKS) {
    out.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, text: p.name, kind: 'park-l', size: p.w < 200 ? 11 : 13 })
  }
  out.push({ x: 250, y: 92, text: 'Golden Gate Bridge', kind: 'st-l', rotate: 9 })
  out.push({ x: 200, y: 480, text: 'San Francisco Bay', kind: 'water-l', rotate: -90 })
  out.push({ x: 1565, y: 205, text: 'Mission Creek', kind: 'water-l', rotate: 14 })
  out.push({ x: 1120, y: 660, text: 'US-101', kind: 'hw-l' })
  out.push({ x: 2050, y: 660, text: 'US-101', kind: 'hw-l' })
  out.push({ x: 1300, y: 950, text: 'I-280', kind: 'hw-l' })
  out.push({ x: 1300, y: 470, text: 'I-280', kind: 'hw-l' })
  return out
}

function buildTrees(rnd) {
  const out = []
  for (const p of PARKS) {
    const n = Math.round((p.w * p.h) / 11000)
    for (let i = 0; i < n; i++) {
      const x = Math.round(p.x + 18 + rnd() * (p.w - 36))
      const y = Math.round(p.y + 18 + rnd() * (p.h - 36))
      if (LAKES.some((l) => pointIn(x, y, l))) continue
      out.push({ x, y, s: Math.round(10 + rnd() * 5) })
    }
  }
  return out
}

export function nearestH(y) {
  let best = H_STREETS[0]
  for (const s of H_STREETS) if (Math.abs(s.y - y) < Math.abs(best.y - y)) best = s
  return best
}
export function nearestV(x) {
  let best = V_STREETS[0]
  for (const s of V_STREETS) if (Math.abs(s.x - x) < Math.abs(best.x - x)) best = s
  return best
}
// Like nearestH/nearestV but also consider minor streets — used to name
// route segments that run along a minor street. Majors win ties.
export function nearestAnyH(y) {
  let best = H_STREETS[0]
  for (const s of [...H_STREETS, ...MINOR_H]) if (Math.abs(s.y - y) < Math.abs(best.y - y)) best = s
  return best
}
export function nearestAnyV(x) {
  let best = V_STREETS[0]
  for (const s of [...V_STREETS, ...MINOR_V]) if (Math.abs(s.x - x) < Math.abs(best.x - x)) best = s
  return best
}

export function buildWorld() {
  const rnd = mulberry32(20260717)
  return {
    W: WORLD_W,
    H: WORLD_H,
    streetsH: H_STREETS,
    streetsV: V_STREETS,
    minorH: MINOR_H,
    minorV: MINOR_V,
    water: WATER,
    islands: ISLANDS,
    parks: PARKS,
    lakes: LAKES,
    highways: HIGHWAYS,
    buildings: buildBuildings(rnd),
    labels: buildLabels(),
    trees: buildTrees(rnd),
  }
}

// `icon` values are keys into MapIcon.vue (colored pin + white glyph).
export const MY_LOCATION = { icon: 'pin', name: 'My Location', sub: 'Current location', x: 1010, y: 905 }

export const FAVORITES = [
  { icon: 'home', name: 'Home', sub: '123 Main St', x: 950, y: 850 },
  { icon: 'work', name: 'Work', sub: '1 Market St', x: 1230, y: 590 },
  { icon: 'coffee', name: 'Coffee', sub: 'Blue Bottle Coffee', x: 1080, y: 740 },
]

export const LANDMARKS = [
  { icon: 'park', name: 'Golden Gate Park', sub: 'Park', x: 730, y: 1115 },
  { icon: 'forest', name: 'Presidio', sub: 'Park', x: 640, y: 180 },
  { icon: 'park', name: 'Dolores Park', sub: 'Park', x: 1495, y: 765 },
  { icon: 'ferry', name: 'Ferry Building', sub: 'Ferry Terminal', x: 2050, y: 330 },
  { icon: 'wharf', name: 'Pier 39', sub: 'Wharf', x: 1980, y: 140 },
  { icon: 'cityhall', name: 'City Hall', sub: 'Government', x: 1030, y: 560 },
  { icon: 'shopping', name: 'Union Square', sub: 'Shopping', x: 1330, y: 470 },
  { icon: 'tower', name: 'Coit Tower', sub: 'Landmark', x: 1740, y: 210 },
  { icon: 'skyscraper', name: 'Salesforce Tower', sub: 'Landmark', x: 1620, y: 870 },
  { icon: 'houses', name: 'Painted Ladies', sub: 'Landmark', x: 640, y: 752 },
  { icon: 'stadium', name: 'Oracle Park', sub: 'Stadium', x: 1360, y: 690 },
  { icon: 'stadium', name: 'Chase Center', sub: 'Arena', x: 1560, y: 712 },
  { icon: 'bridge', name: 'Golden Gate Bridge', sub: 'Bridge', x: 430, y: 120 },
  { icon: 'museum', name: 'Palace of Fine Arts', sub: 'Landmark', x: 880, y: 100 },
  { icon: 'peak', name: 'Twin Peaks', sub: 'Scenic View', x: 1080, y: 1120 },
  { icon: 'mission', name: 'Mission Dolores', sub: 'Historic Site', x: 1600, y: 880 },
]

// Bridge spans drawn across the water (deck + two tower ticks).
export const BRIDGES = [{ x1: 30, y1: 72, x2: 470, y2: 146, name: 'Golden Gate Bridge' }]

// Transit overlay (shown in Transit mode): colored lines that follow the
// street grid, with station dots and names. `side: 'right'` puts the station
// label to the right of the dot (used for stations on vertical segments).
export const TRANSIT_LINES = [
  {
    id: 'bart',
    name: 'BART',
    color: '#0a84ff',
    points: [
      { x: 2180, y: 660 },
      { x: 880, y: 660 },
    ],
    stations: [
      { x: 2080, y: 660, name: 'Embarcadero' },
      { x: 1440, y: 660, name: 'Montgomery' },
      { x: 1160, y: 660, name: 'Powell' },
      { x: 920, y: 660, name: 'Civic Center' },
    ],
  },
  {
    id: 'muni',
    name: 'Muni Metro',
    color: '#ff3b30',
    points: [
      { x: 460, y: 900 },
      { x: 1230, y: 900 },
      { x: 1230, y: 140 },
    ],
    stations: [
      { x: 600, y: 900, name: '24th St' },
      { x: 880, y: 900, name: '16th St' },
      { x: 1020, y: 900, name: 'Van Ness' },
      { x: 1230, y: 660, name: 'Market St', side: 'right' },
      { x: 1230, y: 470, name: 'Union Square', side: 'right' },
      { x: 1230, y: 140, name: "Fisherman's Wharf", side: 'right' },
    ],
  },
]
