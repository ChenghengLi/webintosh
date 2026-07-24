// Simulated catalog for the Music app. Durations are in seconds.
// Covers are real images (picsum.photos, seeded per album) layered over the
// CSS gradient + emoji, which stays as the offline/error fallback.

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const A = (title, artist, emoji, bg, year, tracks) => ({
  title,
  artist,
  emoji,
  bg,
  year,
  cover: `https://picsum.photos/seed/album-${slug(title)}/500/500`,
  tracks: tracks.map(([name, dur]) => ({ name, dur })),
})

export const ALBUMS = [
  A('Midnight Skies', 'Aurora Lane', '🌌', 'linear-gradient(150deg,#2b5876,#4e4376)', 2024, [
    ['Starfall', 214], ['Night Drive', 186], ['Lunar Tide', 243], ['City Lights', 178],
    ['Constellation', 205], ['Dark Matter', 232], ['Aurora', 197], ['Afterglow', 221],
  ]),
  A('Solar Flare', 'Neon Coast', '☀️', 'linear-gradient(150deg,#ff9966,#ff5e62)', 2025, [
    ['Sunburst', 172], ['Heatwave', 199], ['Mirage', 226], ['Corona', 188],
    ['Solar Wind', 211], ['Golden Rays', 175], ['Flare Up', 208], ['Daybreak', 194], ['Horizon', 236],
  ]),
  A('Golden Hour', 'Meadow & Pine', '🌅', 'linear-gradient(150deg,#f6d365,#fda085)', 2023, [
    ['Amber', 201], ['Fields of Gold', 234], ['Warm Breeze', 167], ['Hazy', 219],
    ['Sundown', 183], ['Ember Light', 242], ['Harvest', 196], ['Twilight', 224],
  ]),
  A('Deep Currents', 'Marina Blue', '🌊', 'linear-gradient(150deg,#00c6ff,#0072ff)', 2024, [
    ['Undertow', 228], ['Saltwater', 179], ['Blue Hour', 246], ['Drift', 192],
    ['Tidal', 217], ['Abyss', 254], ['Foam', 161], ['Lighthouse', 203],
  ]),
  A('Neon Nights', 'Vector Ghost', '🌃', 'linear-gradient(150deg,#7b2ff7,#f107a3)', 2025, [
    ['Grid Runner', 184], ['Vapor', 202], ['Midnight Mall', 231], ['Chrome', 176],
    ['Laser Rain', 209], ['Synthwave Sunset', 247], ['Ghost Signal', 198], ['Afterhours', 222],
  ]),
  A('Wildflower', 'June Harbor', '🌸', 'linear-gradient(150deg,#fbc2eb,#a6c1ee)', 2022, [
    ['Petal', 187], ['Meadow Song', 213], ['First Bloom', 174], ['Golden Stem', 226],
    ['Bees & Honey', 195], ['Soft Rain', 239], ['June', 181], ['Evergreen', 208],
  ]),
  A('Gravity', 'The Orbits', '🪐', 'linear-gradient(150deg,#355c7d,#6c5b7b)', 2023, [
    ['Escape Velocity', 237], ['Satellite', 191], ['Zero-G', 218], ['Event Horizon', 249],
    ['Moonshot', 173], ['Perihelion', 204], ['Stardust', 229], ['Reentry', 215], ['Orbit', 186],
  ]),
  A('Paper Planes', 'Kite Club', '✈️', 'linear-gradient(150deg,#89f7fe,#66a6ff)', 2024, [
    ['Takeoff', 168], ['Tailwind', 193], ['Cloud Nine', 221], ['Layover', 184],
    ['Jetstream', 206], ['Window Seat', 232], ['Landing Lights', 199], ['Homeward', 241],
  ]),
  A('Ember', 'Ash & Oak', '🔥', 'linear-gradient(150deg,#f83600,#f9d423)', 2021, [
    ['Spark', 177], ['Kindling', 202], ['Wildfire', 235], ['Smoke Signals', 189],
    ['Coals', 224], ['Campfire', 211], ['Ashes', 246], ['Slow Burn', 198],
  ]),
  A('Crystal Rain', 'Lumen', '💎', 'linear-gradient(150deg,#a8edea,#fed6e3)', 2025, [
    ['Prism', 207], ['Glasswing', 182], ['Droplets', 233], ['Refraction', 196],
    ['Opal', 218], ['Shimmer', 171], ['Clearwater', 227], ['Halo', 204], ['Lumina', 239],
  ]),
]

// A playable reference into the catalog: { a: albumIndex, t: trackIndex }
export const resolveRef = (r) => ({ album: ALBUMS[r.a], track: ALBUMS[r.a].tracks[r.t] })

const P = (id, name, emoji, bg, desc, refs) => ({
  id, name, emoji, bg, desc, cover: `https://picsum.photos/seed/pl-${id}/96/96`, refs: refs.map(([a, t]) => ({ a, t })),
})

export const PLAYLISTS = [
  P('favorites', 'Favorites Mix', '⭐', 'linear-gradient(150deg,#fa2d48,#ff8a5c)',
    'The songs you love most, updated weekly.',
    [[0, 0], [1, 4], [2, 1], [3, 4], [4, 6], [5, 2], [6, 7], [7, 2], [8, 6], [9, 0]]),
  P('chill', 'Chill', '🌙', 'linear-gradient(150deg,#536976,#292e49)',
    'Wind down with mellow, late-night tracks.',
    [[3, 2], [0, 2], [5, 5], [2, 2], [6, 3], [9, 6], [5, 3], [0, 7], [3, 3], [9, 4]]),
  P('workout', 'Workout', '💪', 'linear-gradient(150deg,#cb2d3e,#ef473a)',
    'High-energy tracks to power your session.',
    [[1, 7], [4, 0], [6, 0], [8, 2], [1, 3], [4, 4], [7, 4], [6, 4], [8, 1], [1, 8]]),
]

export const STATIONS = [
  { name: 'Music 1', emoji: '🍎', bg: 'linear-gradient(150deg,#fa2d48,#a61e32)', desc: 'The worldwide home of music.' },
  { name: 'Hits', emoji: '🎉', bg: 'linear-gradient(150deg,#ff9966,#ff5e62)', desc: 'Songs you know and love, all day.' },
  { name: 'Chill', emoji: '🌿', bg: 'linear-gradient(150deg,#43cea2,#185a9d)', desc: 'Lay back and unwind.' },
  { name: 'Electronic', emoji: '⚡', bg: 'linear-gradient(150deg,#7b2ff7,#f107a3)', desc: 'Beats, bass and synths around the clock.' },
]
