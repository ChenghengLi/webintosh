// Catalog data for the Spotify clone: playlists, tracks, genres, home sections.
// Playlist/track covers are real images (picsum.photos, seeded) layered over
// the gradients, which stay as the offline/error fallback.

export const playlists = [
  {
    id: 'liked',
    name: 'Liked Songs',
    desc: 'The songs you liked, all in one place.',
    gradient: 'linear-gradient(135deg,#450af5,#c4efd9)',
    coverEmoji: '💜',
    cover: 'https://picsum.photos/seed/sp-liked/300/300',
    trackIds: ['t1', 't5', 't9', 't12', 't16', 't20', 't24', 't28'],
  },
  {
    id: 'chill',
    name: 'Chill Vibes',
    desc: 'Kick back to the best new and recent chill hits.',
    gradient: 'linear-gradient(135deg,#0d73ec,#8e9eab)',
    coverEmoji: '🌊',
    cover: 'https://picsum.photos/seed/sp-chill/300/300',
    trackIds: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'],
  },
  {
    id: 'focus',
    name: 'Focus Flow',
    desc: 'Instrumental beats to keep you in the zone.',
    gradient: 'linear-gradient(135deg,#8d67ab,#4b3858)',
    coverEmoji: '🧠',
    cover: 'https://picsum.photos/seed/sp-focus/300/300',
    trackIds: ['t9', 't10', 't11', 't12', 't13', 't14', 't15', 't16'],
  },
  {
    id: 'tophits',
    name: 'Top Hits',
    desc: 'The biggest songs on the planet right now.',
    gradient: 'linear-gradient(135deg,#e8115b,#f2a154)',
    coverEmoji: '🔥',
    cover: 'https://picsum.photos/seed/sp-tophits/300/300',
    trackIds: ['t17', 't18', 't19', 't20', 't21', 't22', 't23', 't24'],
  },
  {
    id: 'dailymix',
    name: 'Daily Mix 01',
    desc: 'Drift Meridian, Solstice and more.',
    gradient: 'linear-gradient(135deg,#ba5d07,#e6d3a3)',
    coverEmoji: '☀️',
    cover: 'https://picsum.photos/seed/sp-dailymix/300/300',
    trackIds: ['t25', 't26', 't27', 't28', 't29', 't30'],
  },
  {
    id: 'night',
    name: 'Late Night Drive',
    desc: 'Synth-soaked tracks for empty highways.',
    gradient: 'linear-gradient(135deg,#477d95,#0f2027)',
    coverEmoji: '🌃',
    cover: 'https://picsum.photos/seed/sp-night/300/300',
    trackIds: ['t31', 't32', 't33', 't34', 't35', 't36'],
  },
]

// Each track gets a small two-tone gradient used as its cover art.
export const tracks = {
  t1:  { title: 'Slow Tide',        artist: 'Drift Meridian',  album: 'Coastal Lines',   duration: 214, color: '#2e86ab' },
  t2:  { title: 'Mellow Sun',       artist: 'Solstice',        album: 'Golden Hour',     duration: 187, color: '#f6bd60' },
  t3:  { title: 'Paper Planes',     artist: 'The Aurora Club', album: 'Folded Sky',      duration: 243, color: '#84a59d' },
  t4:  { title: 'Cinnamon',         artist: 'June Harbor',     album: 'Warm Static',     duration: 198, color: '#b08968' },
  t5:  { title: 'Low Light',        artist: 'Vela',            album: 'Low Light',       duration: 226, color: '#5e548e' },
  t6:  { title: 'Breezeblocks',     artist: 'Cassette Coast',  album: 'Rewind',          duration: 205, color: '#457b9d' },
  t7:  { title: 'Half Moon',        artist: 'Drift Meridian',  album: 'Coastal Lines',   duration: 174, color: '#6d6875' },
  t8:  { title: 'Stay Soft',        artist: 'June Harbor',     album: 'Warm Static',     duration: 232, color: '#e5989b' },
  t9:  { title: 'Deep Current',     artist: 'Mono No Aware',   album: 'Still Water',     duration: 301, color: '#3a506b' },
  t10: { title: 'Glasshouse',       artist: 'Field Lines',     album: 'Geometry',        duration: 268, color: '#588157' },
  t11: { title: 'White Noise Waltz',artist: 'Aeris',           album: 'Frequency',       duration: 245, color: '#8d99ae' },
  t12: { title: 'Ink & Ash',        artist: 'Mono No Aware',   album: 'Still Water',     duration: 289, color: '#414833' },
  t13: { title: 'Metronome Heart',  artist: 'Field Lines',     album: 'Geometry',        duration: 223, color: '#6f1d1b' },
  t14: { title: 'Soft Focus',       artist: 'Aeris',           album: 'Frequency',       duration: 256, color: '#432818' },
  t15: { title: 'Satellite Drift',  artist: 'Orbit Kids',      album: 'Zero G',          duration: 277, color: '#1d3557' },
  t16: { title: 'Dawn Chorus',      artist: 'Field Lines',     album: 'Geometry',        duration: 199, color: '#7f5539' },
  t17: { title: 'Neon Confetti',    artist: 'PRISM',           album: 'Neon Confetti',   duration: 183, color: '#e63946' },
  t18: { title: 'Runaway Star',     artist: 'Camila Vox',      album: 'Runaway Star',    duration: 207, color: '#ff6d00' },
  t19: { title: 'Gold Rush',        artist: 'The Velvet Static',album: 'Midnight Radio', duration: 224, color: '#ffb703' },
  t20: { title: 'Afterglow',        artist: 'Nova Twin',       album: 'Afterglow',       duration: 196, color: '#c77dff' },
  t21: { title: 'Chemical Bloom',   artist: 'PRISM',           album: 'Neon Confetti',   duration: 215, color: '#ff4d6d' },
  t22: { title: 'Elastic Heartline',artist: 'Camila Vox',      album: 'Runaway Star',    duration: 189, color: '#f72585' },
  t23: { title: 'Sunroof',          artist: 'Summertones',     album: 'Sunroof',         duration: 172, color: '#ffd60a' },
  t24: { title: 'Velvet Thunder',   artist: 'The Velvet Static',album: 'Midnight Radio', duration: 238, color: '#9d4edd' },
  t25: { title: 'Morning Ritual',   artist: 'Drift Meridian',  album: 'Coastal Lines',   duration: 211, color: '#90be6d' },
  t26: { title: 'Blue Static',      artist: 'Cassette Coast',  album: 'Rewind',          duration: 194, color: '#277da1' },
  t27: { title: 'Analog Summer',    artist: 'Solstice',        album: 'Golden Hour',     duration: 229, color: '#f9c74f' },
  t28: { title: 'Fernweh',          artist: 'Vela',            album: 'Low Light',       duration: 247, color: '#43aa8b' },
  t29: { title: 'Paper Moon',       artist: 'The Aurora Club', album: 'Folded Sky',      duration: 203, color: '#577590' },
  t30: { title: 'Honeycomb',        artist: 'Summertones',     album: 'Sunroof',         duration: 181, color: '#f3722c' },
  t31: { title: 'Midnight Freeway', artist: 'Night Circuit',   album: 'Chrome City',     duration: 252, color: '#240046' },
  t32: { title: 'Tail Lights',      artist: 'Retrowave Union', album: 'Grid Runner',     duration: 231, color: '#5a189a' },
  t33: { title: 'VHS Rain',         artist: 'Night Circuit',   album: 'Chrome City',     duration: 219, color: '#3c096c' },
  t34: { title: 'Palm Shadows',     artist: 'Casa Mirage',     album: 'Neon Coast',      duration: 204, color: '#7b2cbf' },
  t35: { title: 'Overdrive',        artist: 'Retrowave Union', album: 'Grid Runner',     duration: 266, color: '#9d0208' },
  t36: { title: 'Last Exit',        artist: 'Casa Mirage',     album: 'Neon Coast',      duration: 243, color: '#10002b' },
}

// Attach a real audio stream to every catalog track: deterministic SoundHelix
// assignment across the 36 tracks — track index → N = (index % 17) + 1,
// spreading songs 11..17 then wrapping to 1..10. Also give each track a seeded
// cover image (the two-tone gradient stays as its fallback).
Object.keys(tracks).forEach((id, i) => {
  tracks[id].src = `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(i % 17) + 1}.mp3`
  tracks[id].cover = `https://picsum.photos/seed/sp-${id}/52/52`
})

export const genres = [
  { name: 'Pop',     color: '#e13300' },
  { name: 'Rock',    color: '#8d67ab' },
  { name: 'Jazz',    color: '#ba5d07' },
  { name: 'Hip-Hop', color: '#477d95' },
  { name: 'Focus',   color: '#503750' },
  { name: 'Sleep',   color: '#0d73ec' },
]

export const madeForYou = [
  { name: 'Daily Mix 01', desc: 'Drift Meridian, Solstice and more', color: '#ba5d07', playlistId: 'dailymix' },
  { name: 'Daily Mix 02', desc: 'PRISM, Nova Twin and more', color: '#e8115b', playlistId: 'tophits' },
  { name: 'Discover Weekly', desc: 'Your weekly mixtape of fresh music', color: '#1e3264', playlistId: 'night' },
  { name: 'Release Radar', desc: 'New music from artists you follow', color: '#0d73ec', playlistId: 'chill' },
  { name: 'On Repeat', desc: 'Songs you can’t get enough of', color: '#8d67ab', playlistId: 'liked' },
  { name: 'Repeat Rewind', desc: 'Tracks you loved and forgot', color: '#477d95', playlistId: 'focus' },
]

export const recentCards = [
  { name: 'Chill Vibes', desc: 'Playlist', color: '#0d73ec', playlistId: 'chill' },
  { name: 'Afterglow', desc: 'Nova Twin', color: '#c77dff', playlistId: 'tophits' },
  { name: 'Focus Flow', desc: 'Playlist', color: '#8d67ab', playlistId: 'focus' },
  { name: 'Chrome City', desc: 'Night Circuit', color: '#240046', playlistId: 'night' },
  { name: 'Liked Songs', desc: 'Playlist', color: '#503750', playlistId: 'liked' },
  { name: 'Golden Hour', desc: 'Solstice', color: '#f6bd60', playlistId: 'dailymix' },
]

export function getPlaylistTracks(playlist) {
  return playlist.trackIds.map((id) => ({ id, ...tracks[id] }))
}

export function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
