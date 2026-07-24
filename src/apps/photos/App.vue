<script setup>
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'

// ---------- Photo library ----------
// Real photos from picsum.photos (fixed seeds → deterministic library). The CSS
// gradients stay behind each <img> as the loading / offline fallback.
const PALETTES = [
  'linear-gradient(160deg,#ff9a9e,#fecfef)',
  'linear-gradient(160deg,#a18cd1,#fbc2eb)',
  'linear-gradient(160deg,#84fab0,#8fd3f4)',
  'linear-gradient(160deg,#ffecd2,#fcb69f)',
  'linear-gradient(160deg,#667eea,#764ba2)',
  'linear-gradient(160deg,#fddb92,#d1fdff)',
  'linear-gradient(160deg,#f77062,#fe5196)',
  'linear-gradient(160deg,#43cea2,#185a9d)',
  'linear-gradient(160deg,#fa709a,#fee140)',
  'linear-gradient(160deg,#30cfd0,#330867)',
  'linear-gradient(160deg,#c471f5,#fa71cd)',
  'linear-gradient(160deg,#0ba360,#3cba92)',
  'linear-gradient(160deg,#f6d365,#fda085)',
  'linear-gradient(160deg,#5ee7df,#b490ca)',
  'linear-gradient(160deg,#e0c3fc,#8ec5fc)',
]
// Fixed nature-themed seeds keep every photo (and its persisted favorites) stable.
const SEEDS = [
  'lake-1', 'forest-7', 'mountain-12', 'coast-3', 'valley-9',
  'meadow-14', 'river-5', 'desert-8', 'aurora-2', 'sunset-11',
  'lake-4', 'forest-2', 'mountain-6', 'coast-8', 'valley-3',
  'meadow-5', 'river-11', 'desert-4', 'aurora-9', 'sunset-7',
  'lake-13', 'forest-10', 'mountain-2', 'coast-6', 'valley-12',
  'meadow-8', 'river-3', 'desert-11', 'aurora-6', 'sunset-4',
]
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LOCATIONS = ['Big Sur', 'Kyoto', 'San Francisco', 'Oslo', 'Lisbon', 'Banff']

// Deterministic pseudo-random so the library is stable between launches.
function rand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const basePhotos = Array.from({ length: 30 }, (_, i) => {
  const year = 2023 + Math.floor(rand(i + 1) * 3) // 2023–2025
  const month = Math.floor(rand(i + 40) * 12)
  const day = 1 + Math.floor(rand(i + 80) * 28)
  const screenshot = i % 10 === 7 // a few "screenshots"
  return {
    id: i + 1,
    seed: SEEDS[i],
    gradient: PALETTES[Math.floor(rand(i + 7) * PALETTES.length)],
    date: new Date(year, month, day, 9 + Math.floor(rand(i + 3) * 10), Math.floor(rand(i + 5) * 60)),
    screenshot,
    location: LOCATIONS[Math.floor(rand(i + 31) * LOCATIONS.length)],
  }
})

// Bundled sample videos (album posters are gradients; real <video> in detail).
const VIDEOS = [
  { id: 'v1', title: 'Big Buck Bunny', src: 'https://media.w3.org/2010/05/bunny/trailer.mp4', duration: '0:33', gradient: PALETTES[7], date: new Date(2024, 5, 12), location: 'San Francisco' },
  { id: 'v2', title: 'Sintel', src: 'https://media.w3.org/2010/05/sintel/trailer.mp4', duration: '0:52', gradient: PALETTES[8], date: new Date(2023, 10, 3), location: 'Oslo' },
  { id: 'v3', title: 'Movie 300', src: 'https://media.w3.org/2010/05/video/movie_300.mp4', duration: '0:30', gradient: PALETTES[9], date: new Date(2025, 2, 21), location: 'Big Sur' },
]

// Decorative People album — portrait faces from picsum (stable seeds).
const PEOPLE = [
  { name: 'Emma', seed: 'portrait-1' },
  { name: 'Liam', seed: 'portrait-2' },
  { name: 'Sofia', seed: 'portrait-3' },
  { name: 'Noah', seed: 'portrait-4' },
  { name: 'Mia', seed: 'portrait-5' },
  { name: 'Ethan', seed: 'portrait-6' },
]

// Square tiles for the grids, a larger 14:9 frame for the detail view.
const gridUrl = (p) => `https://picsum.photos/seed/${p.seed}/500/500`
const detailUrl = (p) => `https://picsum.photos/seed/${p.seed}/1400/900`
const personUrl = (p) => `https://picsum.photos/seed/${p.seed}/200/200`

// A failed load (offline) hides the <img> so the gradient fallback shows through.
function onImgError(e) {
  e.target.classList.add('img-failed')
}

// ---------- State ----------
const favorites = ref(new Set(JSON.parse(localStorage.getItem('macos-web:photos-favorites') || '[]')))
const deletedIds = ref(new Set(JSON.parse(localStorage.getItem('macos-web:photos-deleted') || '[]')))
const captions = ref(JSON.parse(localStorage.getItem('macos-web:photos-captions') || '{}'))
const added = ref(JSON.parse(localStorage.getItem('macos-web:photos-added') || '[]'))
const section = ref('photos') // sidebar selection
const mode = ref('all') // years | months | all
const detailId = ref(null)
const detailVideo = ref(null)
const infoOpen = ref(false)
const search = ref('')
const activePerson = ref(null) // index into PEOPLE

const photos = computed(() => [
  ...basePhotos,
  ...added.value.map((a) => ({
    ...a,
    date: new Date(a.date),
    screenshot: false,
    gradient: PALETTES[a.gradientIdx % PALETTES.length],
  })),
])

const byDateDesc = (a, b) => b.date - a.date
const allSorted = computed(() => photos.value.filter((p) => !deletedIds.value.has(p.id)).sort(byDateDesc))
const favoritePhotos = computed(() => allSorted.value.filter((p) => favorites.value.has(p.id)))
const screenshotPhotos = computed(() => allSorted.value.filter((p) => p.screenshot))
const deletedPhotos = computed(() => photos.value.filter((p) => deletedIds.value.has(p.id)).sort(byDateDesc))

const GRID_SECTIONS = ['photos', 'recents', 'favorites', 'favAlbum', 'screenshots']
const isGridSection = computed(() => GRID_SECTIONS.includes(section.value))

const visiblePhotos = computed(() => {
  let list
  if (section.value === 'favorites' || section.value === 'favAlbum') list = favoritePhotos.value
  else if (section.value === 'screenshots') list = screenshotPhotos.value
  else list = allSorted.value
  const q = search.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((p) => searchText(p).includes(q))
})

function searchText(p) {
  return `${p.location} ${fmtDate(p.date)} ${MONTH_NAMES[p.date.getMonth()]} ${p.date.getFullYear()}`.toLowerCase()
}

const detailPhoto = computed(() => photos.value.find((p) => p.id === detailId.value) || null)
watch(detailPhoto, () => { infoOpen.value = false })

const title = computed(() => {
  if (detailPhoto.value) return fmtDate(detailPhoto.value.date)
  if (detailVideo.value) return detailVideo.value.title
  return {
    photos: 'Photos', memories: 'Memories', favorites: 'Favorites', people: 'People',
    recents: 'Recents', favAlbum: 'Favorites', screenshots: 'Screenshots',
    videos: 'Videos', deleted: 'Recently Deleted', project: 'My Project',
  }[section.value]
})

const memories = computed(() => {
  // Group photos into month-based "memories".
  const groups = {}
  for (const p of allSorted.value) {
    const key = `${p.date.getFullYear()}-${p.date.getMonth()}`
    if (!groups[key]) groups[key] = { label: `${MONTH_NAMES[p.date.getMonth()]} ${p.date.getFullYear()}`, items: [] }
    groups[key].items.push(p)
  }
  return Object.values(groups).filter((g) => g.items.length >= 2).slice(0, 4)
})

// Live sidebar counts.
const counts = computed(() => ({
  photos: allSorted.value.length,
  memories: memories.value.length,
  favorites: favoritePhotos.value.length,
  people: PEOPLE.length,
  recents: allSorted.value.length,
  screenshots: screenshotPhotos.value.length,
  videos: VIDEOS.length,
  deleted: deletedPhotos.value.length,
}))

// Decorative per-person subset of the library (stable: based on sorted order).
const personPhotos = computed(() => {
  if (activePerson.value == null) return []
  return allSorted.value.filter((_, i) => i % 3 === activePerson.value % 3)
})

// Fake-but-stable EXIF values derived from the photo id.
function exifOf(p) {
  const iso = [50, 64, 100, 125, 200, 400, 800][Math.floor(rand(p.id + 500) * 7)]
  const speed = [30, 60, 125, 250, 500, 1000][Math.floor(rand(p.id + 600) * 6)]
  const size = (1.6 + rand(p.id + 700) * 1.6).toFixed(1)
  return { iso, exposure: `1/${speed} s`, size: `${size} MB` }
}
const detailExif = computed(() => (detailPhoto.value ? exifOf(detailPhoto.value) : null))

// ---------- Actions ----------
function toggleFavorite(id) {
  const next = new Set(favorites.value)
  next.has(id) ? next.delete(id) : next.add(id)
  favorites.value = next
  localStorage.setItem('macos-web:photos-favorites', JSON.stringify([...next]))
}

function deletePhoto(id) {
  const next = new Set(deletedIds.value)
  next.add(id)
  deletedIds.value = next
  localStorage.setItem('macos-web:photos-deleted', JSON.stringify([...next]))
  detailId.value = null
}

function deleteAllDeleted() {
  deletedIds.value = new Set()
  localStorage.setItem('macos-web:photos-deleted', '[]')
}

function setCaption(id, text) {
  captions.value = { ...captions.value, [id]: text }
  localStorage.setItem('macos-web:photos-captions', JSON.stringify(captions.value))
}

// "+" toolbar button: append a new random-seed photo (persisted).
function addPhoto() {
  const nextId = Math.max(...photos.value.map((p) => p.id)) + 1
  const p = {
    id: nextId,
    seed: 'shot-' + Math.random().toString(36).slice(2, 9),
    date: new Date(
      2023 + Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 12),
      1 + Math.floor(Math.random() * 28),
      9 + Math.floor(Math.random() * 10),
      Math.floor(Math.random() * 60),
    ).toISOString(),
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
    gradientIdx: Math.floor(Math.random() * PALETTES.length),
  }
  added.value = [...added.value, p]
  localStorage.setItem('macos-web:photos-added', JSON.stringify(added.value))
}

function selectSection(s) {
  section.value = s
  detailId.value = null
  detailVideo.value = null
  activePerson.value = null
  infoOpen.value = false
  search.value = ''
}

// ---------- Video player ----------
const videoEl = ref(null)
const videoPlaying = ref(false)
const videoTime = ref(0)
const videoDuration = ref(0)
const videoError = ref(false)

watch(detailVideo, () => {
  videoPlaying.value = false
  videoTime.value = 0
  videoDuration.value = 0
  videoError.value = false
})

function toggleVideo() {
  const v = videoEl.value
  if (!v || videoError.value) return
  v.paused ? v.play() : v.pause()
}
function onVideoTime() {
  videoTime.value = videoEl.value ? videoEl.value.currentTime : 0
}
function onVideoMeta() {
  videoDuration.value = videoEl.value ? videoEl.value.duration : 0
}
function seek(e) {
  const v = videoEl.value
  if (!v || !videoDuration.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  v.currentTime = ratio * videoDuration.value
}

// ---------- Formatting ----------
function fmtDate(d) {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}
function fmtTime(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function fmtClock(s) {
  if (!Number.isFinite(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
</script>

<template>
  <div class="app-root photos-root">
    <!-- Sidebar -->
    <aside class="sidebar glass-strong">
      <div class="side-label">Library</div>
      <button class="side-item" :class="{ active: section === 'photos' }" @click="selectSection('photos')">
        <Icon name="photo" :size="15" class="side-icon" /> Photos
        <span class="count">{{ counts.photos }}</span>
      </button>
      <button class="side-item" :class="{ active: section === 'memories' }" @click="selectSection('memories')">
        <Icon name="sparkles" :size="15" class="side-icon" /> Memories
        <span class="count">{{ counts.memories }}</span>
      </button>
      <button class="side-item" :class="{ active: section === 'favorites' }" @click="selectSection('favorites')">
        <Icon name="heart" :size="15" class="side-icon" /> Favorites
        <span class="count">{{ counts.favorites }}</span>
      </button>
      <button class="side-item" :class="{ active: section === 'people' }" @click="selectSection('people')">
        <Icon name="person" :size="15" class="side-icon" /> People
        <span class="count">{{ counts.people }}</span>
      </button>

      <div class="side-label">Albums</div>
      <button class="side-item" :class="{ active: section === 'recents' }" @click="selectSection('recents')">
        <Icon name="clock" :size="15" class="side-icon" /> Recents
        <span class="count">{{ counts.recents }}</span>
      </button>
      <button class="side-item" :class="{ active: section === 'favAlbum' }" @click="selectSection('favAlbum')">
        <Icon name="heart" :size="15" class="side-icon" /> Favorites
        <span class="count">{{ counts.favorites }}</span>
      </button>
      <button class="side-item" :class="{ active: section === 'screenshots' }" @click="selectSection('screenshots')">
        <Icon name="viewfinder" :size="15" class="side-icon" /> Screenshots
        <span class="count">{{ counts.screenshots }}</span>
      </button>
      <button class="side-item" :class="{ active: section === 'videos' }" @click="selectSection('videos')">
        <Icon name="video" :size="15" class="side-icon" /> Videos
        <span class="count">{{ counts.videos }}</span>
      </button>
      <button class="side-item" :class="{ active: section === 'deleted' }" @click="selectSection('deleted')">
        <Icon name="trash" :size="15" class="side-icon" /> Recently Deleted
        <span class="count">{{ counts.deleted }}</span>
      </button>

      <div class="side-label">Projects</div>
      <button class="side-item" :class="{ active: section === 'project' }" @click="selectSection('project')">
        <Icon name="folder" :size="15" class="side-icon" /> My Project
        <span class="count">1</span>
      </button>
    </aside>

    <!-- Main -->
    <div class="main">
      <header class="toolbar glass">
        <span class="toolbar-title">{{ title }}</span>
        <div v-if="isGridSection" class="segmented toolbar-center">
          <button v-for="m in ['years', 'months', 'all']" :key="m" :class="{ on: mode === m }" @click="mode = m">
            {{ m === 'all' ? 'All Photos' : m[0].toUpperCase() + m.slice(1) }}
          </button>
        </div>
        <div class="toolbar-right">
          <div class="search-box">
            <Icon name="search" :size="11" />
            <input v-model="search" class="search-input" type="text" placeholder="Search" spellcheck="false" />
          </div>
          <button class="t-btn" title="Add Photo" @click="addPhoto">
            <Icon name="plus" :size="14" />
          </button>
        </div>
      </header>

      <!-- Photo grid (Library / Albums grid sections) -->
      <div v-if="isGridSection" class="scroll grid-scroll">
        <div v-if="visiblePhotos.length" class="grid" :class="mode">
          <button v-for="p in visiblePhotos" :key="p.id" class="tile" @click="detailId = p.id">
            <span class="thumb" :style="{ background: p.gradient }">
              <img class="photo-img" :src="gridUrl(p)" :alt="p.location" loading="lazy" @error="onImgError" />
              <span v-if="p.screenshot" class="shot">Screenshot</span>
            </span>
            <span v-if="favorites.has(p.id)" class="badge"><Icon name="heart-fill" :size="11" /></span>
          </button>
        </div>
        <div v-else class="empty">
          <div class="empty-icon"><Icon :name="section === 'screenshots' ? 'viewfinder' : 'heart'" :size="40" /></div>
          <div>{{ search ? `No Results for “${search}”` : section === 'screenshots' ? 'No Screenshots' : 'No Favorites Yet' }}</div>
          <div v-if="!search && section !== 'screenshots'" class="dim">Tap the heart on a photo to add it here.</div>
        </div>
      </div>

      <!-- Memories -->
      <div v-else-if="section === 'memories'" class="scroll">
        <div v-if="memories.length" class="memory-list">
          <button v-for="m in memories" :key="m.label" class="memory-card" @click="detailId = m.items[0].id">
            <span class="memory-hero" :style="{ background: m.items[0].gradient }">
              <img class="memory-img" :src="gridUrl(m.items[0])" :alt="m.label" loading="lazy" @error="onImgError" />
            </span>
            <span class="memory-meta">
              <span class="memory-title">{{ m.label }}</span>
              <span class="dim">{{ m.items.length }} photos</span>
            </span>
          </button>
        </div>
        <div v-else class="empty">
          <div class="empty-icon"><Icon name="sparkles" :size="40" /></div>
          <div>No Memories Yet</div>
          <div class="dim">Memories are created from your library.</div>
        </div>
      </div>

      <!-- People -->
      <div v-else-if="section === 'people'" class="scroll">
        <template v-if="activePerson == null">
          <div class="people-grid">
            <button v-for="(person, i) in PEOPLE" :key="person.seed" class="person" @click="activePerson = i">
              <span class="person-circle" :style="{ background: PALETTES[i % PALETTES.length] }">
                <img class="person-img" :src="personUrl(person)" :alt="person.name" loading="lazy" @error="onImgError" />
              </span>
              <span class="person-name">{{ person.name }}</span>
            </button>
          </div>
        </template>
        <template v-else>
          <div class="people-subhead">
            <button class="back-link" @click="activePerson = null">
              <Icon name="chevron-left" :size="13" /> People
            </button>
            <span class="people-subtitle">{{ PEOPLE[activePerson].name }}</span>
            <span class="dim">{{ personPhotos.length }} photos</span>
          </div>
          <div class="grid all">
            <button v-for="p in personPhotos" :key="p.id" class="tile" @click="detailId = p.id">
              <span class="thumb" :style="{ background: p.gradient }">
                <img class="photo-img" :src="gridUrl(p)" :alt="p.location" loading="lazy" @error="onImgError" />
                <span v-if="p.screenshot" class="shot">Screenshot</span>
              </span>
              <span v-if="favorites.has(p.id)" class="badge"><Icon name="heart-fill" :size="11" /></span>
            </button>
          </div>
        </template>
      </div>

      <!-- Videos -->
      <div v-else-if="section === 'videos'" class="scroll">
        <div class="video-grid">
          <button v-for="v in VIDEOS" :key="v.id" class="video-tile" @click="detailVideo = v">
            <span class="video-thumb" :style="{ background: v.gradient }">
              <span class="play-badge"><Icon name="play" :size="12" /></span>
              <span class="duration">{{ v.duration }}</span>
            </span>
            <span class="video-meta">
              <span class="video-title">{{ v.title }}</span>
              <span class="dim">{{ fmtDate(v.date) }} · {{ v.location }}</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Recently Deleted (read-only) -->
      <div v-else-if="section === 'deleted'" class="scroll grid-scroll deleted-view">
        <div class="deleted-bar">
          <span class="dim">
            {{ counts.deleted }} {{ counts.deleted === 1 ? 'Item' : 'Items' }} · Items here are read-only
          </span>
          <button class="delete-all-btn" :disabled="!counts.deleted" @click="deleteAllDeleted">Delete All</button>
        </div>
        <div v-if="deletedPhotos.length" class="grid all">
          <div v-for="p in deletedPhotos" :key="p.id" class="tile readonly">
            <span class="thumb" :style="{ background: p.gradient }">
              <img class="photo-img" :src="gridUrl(p)" :alt="p.location" loading="lazy" @error="onImgError" />
              <span v-if="p.screenshot" class="shot">Screenshot</span>
            </span>
          </div>
        </div>
        <div v-else class="empty">
          <div class="empty-icon"><Icon name="trash" :size="40" /></div>
          <div>Nothing to Recover</div>
          <div class="dim">Photos you delete will appear here.</div>
        </div>
      </div>

      <!-- My Project (decorative) -->
      <div v-else-if="section === 'project'" class="scroll">
        <div class="project-wrap">
          <div class="project-card">
            <div class="project-cover" :style="{ background: basePhotos[4].gradient }">
              <img class="photo-img" :src="gridUrl(basePhotos[4])" alt="My Project" loading="lazy" @error="onImgError" />
            </div>
            <div class="project-meta">
              <div class="project-title">My Project</div>
              <div class="dim">Photo Book · 20 pages</div>
            </div>
          </div>
          <div class="dim project-note">Projects are decorative in this demo.</div>
        </div>
      </div>

      <!-- Photo detail overlay -->
      <transition name="fade">
        <div v-if="detailPhoto" class="detail" @click.self="detailId = null">
          <div class="detail-bar">
            <button class="d-btn" @click="detailId = null"><Icon name="chevron-left" :size="14" /> Back</button>
            <div class="d-actions">
              <button
                class="d-btn icon-btn"
                :class="{ loved: favorites.has(detailPhoto.id) }"
                title="Favorite"
                @click="toggleFavorite(detailPhoto.id)"
              >
                <Icon :name="favorites.has(detailPhoto.id) ? 'heart-fill' : 'heart'" :size="15" />
              </button>
              <button class="d-btn icon-btn" :class="{ on: infoOpen }" title="Info" @click="infoOpen = !infoOpen">
                <Icon name="info" :size="15" />
              </button>
              <button class="d-btn icon-btn" title="Delete" @click="deletePhoto(detailPhoto.id)">
                <Icon name="trash" :size="15" />
              </button>
            </div>
          </div>
          <div class="detail-body">
            <div class="detail-stage">
              <div class="detail-photo" :style="{ background: detailPhoto.gradient }">
                <img class="detail-img" :src="detailUrl(detailPhoto)" :alt="detailPhoto.location" loading="lazy" @error="onImgError" />
              </div>
            </div>
            <transition name="slide">
              <aside v-if="infoOpen && detailExif" class="info-panel">
                <div class="info-title">Info</div>
                <div class="info-photo" :style="{ background: detailPhoto.gradient }">
                  <img class="photo-img" :src="gridUrl(detailPhoto)" :alt="detailPhoto.location" loading="lazy" @error="onImgError" />
                </div>
                <input
                  class="caption-input"
                  type="text"
                  placeholder="Add a Caption"
                  :value="captions[detailPhoto.id] || ''"
                  spellcheck="false"
                  @input="setCaption(detailPhoto.id, $event.target.value)"
                />
                <div class="info-rows">
                  <div class="irow"><span class="ikey">Date</span><span>{{ fmtDate(detailPhoto.date) }} · {{ fmtTime(detailPhoto.date) }}</span></div>
                  <div class="irow"><span class="ikey">Camera</span><span>iPhone 16 Pro</span></div>
                  <div class="irow"><span class="ikey">Lens</span><span>24mm ƒ/1.78</span></div>
                  <div class="irow"><span class="ikey">ISO</span><span>ISO {{ detailExif.iso }} · {{ detailExif.exposure }}</span></div>
                  <div class="irow"><span class="ikey">Dimensions</span><span>4032 × 3024</span></div>
                  <div class="irow"><span class="ikey">Size</span><span>{{ detailExif.size }}</span></div>
                  <div class="irow"><span class="ikey">Location</span><span>{{ detailPhoto.location }}</span></div>
                </div>
              </aside>
            </transition>
          </div>
          <div class="detail-info">
            <div class="info-date">{{ fmtDate(detailPhoto.date) }} · {{ fmtTime(detailPhoto.date) }}</div>
            <div class="dim">{{ detailPhoto.location }} — Shot on iPhone 16 Pro</div>
            <div class="dim">4032 × 3024 · HEIF · {{ detailExif ? detailExif.size : '' }}</div>
          </div>
        </div>
      </transition>

      <!-- Video detail overlay -->
      <transition name="fade">
        <div v-if="detailVideo" class="detail">
          <div class="detail-bar">
            <button class="d-btn" @click="detailVideo = null"><Icon name="chevron-left" :size="14" /> Videos</button>
            <span class="d-title">{{ detailVideo.title }}</span>
            <span class="d-actions-spacer"></span>
          </div>
          <div class="detail-stage">
            <div class="video-frame" :style="{ background: detailVideo.gradient }">
              <video
                v-show="!videoError"
                ref="videoEl"
                class="video-el"
                :src="detailVideo.src"
                playsinline
                preload="metadata"
                @click="toggleVideo"
                @timeupdate="onVideoTime"
                @loadedmetadata="onVideoMeta"
                @play="videoPlaying = true"
                @pause="videoPlaying = false"
                @ended="videoPlaying = false"
                @error="videoError = true"
              ></video>
              <div v-if="videoError" class="video-error">
                <Icon name="warning" :size="36" />
                <div class="ve-title">Unavailable Offline</div>
                <div class="ve-dim">This video can't be played without a network connection.</div>
              </div>
            </div>
          </div>
          <div v-if="!videoError" class="video-bar">
            <button class="vc-btn" :title="videoPlaying ? 'Pause' : 'Play'" @click="toggleVideo">
              <Icon :name="videoPlaying ? 'pause' : 'play'" :size="14" />
            </button>
            <span class="vc-time">{{ fmtClock(videoTime) }}</span>
            <div class="vc-track" @click="seek">
              <div class="vc-fill" :style="{ width: (videoDuration ? (videoTime / videoDuration) * 100 : 0) + '%' }"></div>
            </div>
            <span class="vc-time">{{ fmtClock(videoDuration) }}</span>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.photos-root {
  flex-direction: row;
  background: var(--window-bg);
  color: var(--text);
  overflow: hidden;
  position: relative;
}

/* ---------- Sidebar ---------- */
.sidebar {
  width: 210px;
  flex-shrink: 0;
  padding: 12px 8px;
  border-right: 0.5px solid var(--border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.side-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  padding: 10px 10px 4px;
}
.side-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 13px;
  text-align: left;
  color: var(--text);
}
.side-item:hover { background: var(--hover); }
.side-item.active { background: var(--selection); }
.side-icon { color: var(--accent); }
.count { margin-left: auto; font-size: 11px; color: var(--text-dim); }

/* ---------- Main / toolbar ---------- */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}
.toolbar {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 0.5px solid var(--border);
  gap: 12px;
  position: relative;
}
.toolbar-title { font-size: 15px; font-weight: 700; }
.toolbar-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.segmented {
  display: flex;
  background: var(--hover);
  border-radius: 8px;
  padding: 2px;
}
.segmented button {
  padding: 3px 14px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-dim);
}
.segmented button.on {
  background: var(--window-bg);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}
.toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--hover);
  border-radius: 7px;
  padding: 0 8px;
  height: 26px;
  width: 170px;
  color: var(--text-dim);
}
.search-input {
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 12.5px;
  width: 100%;
  font-family: inherit;
}
.search-input::placeholder { color: var(--text-dim); }
.t-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: var(--text);
  background: var(--hover);
}
.t-btn:hover { background: var(--selection); }

/* ---------- Grid (edge-to-edge, 2px gutters) ---------- */
.scroll { flex: 1; overflow-y: auto; padding: 16px; }
.grid-scroll { padding: 0; }
.grid { display: grid; gap: 2px; }
.grid.years { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
.grid.months { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
.grid.all { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); }

.tile {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}
.grid.years .tile { border-radius: 12px; }
.grid.months .tile { border-radius: 8px; }
.thumb {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s ease;
}
.grid.years .tile:hover .thumb,
.grid.months .tile:hover .thumb { transform: scale(1.05); }
.tile.readonly { cursor: default; }
.photo-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.img-failed { display: none; }
.shot {
  position: relative; /* keep the label above the photo */
  font-size: 10px;
  color: rgba(0, 0, 0, 0.55);
  background: rgba(255, 255, 255, 0.55);
  padding: 2px 6px;
  border-radius: 5px;
}
.badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  display: flex;
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
  pointer-events: none;
}
.grid.all .badge { left: 4px; bottom: 4px; }

/* ---------- Empty states ---------- */
.empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 600;
}
.empty-icon { margin-bottom: 6px; color: var(--text-dim); }
.dim { color: var(--text-dim); font-weight: 400; }

/* ---------- Memories ---------- */
.memory-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.memory-card {
  border-radius: 14px;
  overflow: hidden;
  border: 0.5px solid var(--border);
  background: var(--sidebar-bg);
  text-align: left;
  display: flex;
  flex-direction: column;
  color: var(--text);
}
.memory-hero {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s ease;
}
.memory-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.memory-card:hover .memory-hero { transform: scale(1.03); }
.memory-meta { padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.memory-title { font-weight: 700; font-size: 14px; }

/* ---------- People ---------- */
.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 26px 18px;
  padding: 14px 8px;
}
.person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text);
}
.person-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  border: 0.5px solid var(--border);
  transition: transform 0.2s ease;
}
.person:hover .person-circle { transform: scale(1.04); }
.person-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.person-name { font-size: 13px; font-weight: 600; }
.people-subhead {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 2px 14px;
}
.back-link {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--accent);
  font-size: 13px;
}
.people-subtitle { font-size: 15px; font-weight: 700; }
.people-subhead .dim { font-size: 12px; }

/* ---------- Videos ---------- */
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}
.video-tile {
  display: flex;
  flex-direction: column;
  text-align: left;
  border-radius: 12px;
  overflow: hidden;
  border: 0.5px solid var(--border);
  background: var(--sidebar-bg);
  color: var(--text);
}
.video-thumb {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  transition: transform 0.25s ease;
}
.video-tile:hover .video-thumb { transform: scale(1.02); }
.play-badge {
  position: absolute;
  left: 10px;
  bottom: 10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.duration {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
  padding: 1px 6px;
  border-radius: 5px;
}
.video-meta { padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 2px; }
.video-title { font-size: 13px; font-weight: 600; }
.video-meta .dim { font-size: 12px; }

/* ---------- Recently Deleted ---------- */
.deleted-view { display: flex; flex-direction: column; }
.deleted-view .empty { flex: 1; height: auto; }
.deleted-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 0.5px solid var(--border);
  font-size: 12px;
}
.delete-all-btn {
  color: #ff453a;
  font-size: 12.5px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 7px;
  background: var(--hover);
}
.delete-all-btn:hover:not(:disabled) { background: var(--selection); }
.delete-all-btn:disabled { opacity: 0.4; }

/* ---------- My Project (decorative) ---------- */
.project-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding-top: 34px;
}
.project-card {
  width: 320px;
  border-radius: 14px;
  overflow: hidden;
  border: 0.5px solid var(--border);
  background: var(--sidebar-bg);
}
.project-cover { position: relative; height: 180px; }
.project-meta { padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
.project-title { font-weight: 700; font-size: 14px; }
.project-note { font-size: 12px; }

/* ---------- Detail (shared photo / video overlay) ---------- */
.detail {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: rgba(12, 12, 16, 0.82);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  color: #f5f5f7;
}
.detail-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
}
.d-title { font-size: 14px; font-weight: 700; }
.d-actions { display: flex; gap: 8px; }
.d-actions-spacer { width: 1px; }
.d-btn {
  color: #f5f5f7;
  font-size: 13.5px;
  padding: 5px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  gap: 4px;
}
.d-btn:hover { background: rgba(255, 255, 255, 0.22); }
.icon-btn { width: 30px; height: 28px; padding: 0; justify-content: center; }
.icon-btn.loved { color: #ff375f; }
.icon-btn.on { background: rgba(255, 255, 255, 0.32); }
.detail-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.detail-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 8px 40px;
}
.detail-photo {
  max-width: 100%;
  max-height: 100%;
  width: min(62vh, 640px);
  aspect-ratio: 14 / 9;
  border-radius: 12px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.detail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  display: block;
}
.detail-info {
  text-align: center;
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.info-date { font-size: 15px; font-weight: 700; }
.detail-info .dim { color: rgba(255, 255, 255, 0.6); font-size: 12px; }

/* ---------- Info inspector ---------- */
.info-panel {
  width: 260px;
  flex-shrink: 0;
  margin: 0 12px 12px 0;
  border-radius: 14px;
  background: rgba(30, 30, 36, 0.72);
  border: 0.5px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.info-title { font-size: 13px; font-weight: 700; }
.info-photo {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
}
.caption-input {
  background: rgba(255, 255, 255, 0.1);
  border: 0.5px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  color: #f5f5f7;
  font-size: 12.5px;
  padding: 6px 9px;
  outline: none;
  font-family: inherit;
  width: 100%;
}
.caption-input:focus { border-color: rgba(255, 255, 255, 0.4); }
.caption-input::placeholder { color: rgba(255, 255, 255, 0.45); }
.info-rows { display: flex; flex-direction: column; }
.irow {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-top: 0.5px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
}
.irow .ikey { color: rgba(255, 255, 255, 0.55); flex-shrink: 0; }
.irow span:last-child { text-align: right; }

/* ---------- Video player ---------- */
.video-frame {
  width: min(680px, 100%);
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
  background: #000;
}
.video-el {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: #000;
  cursor: pointer;
}
.video-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #f5f5f7;
}
.ve-title { font-weight: 700; font-size: 14px; }
.ve-dim { color: rgba(255, 255, 255, 0.6); font-size: 12px; }
.video-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px 18px;
}
.vc-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vc-btn:hover { background: rgba(255, 255, 255, 0.22); }
.vc-time {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.75);
  min-width: 34px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.vc-track {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.22);
  cursor: pointer;
}
.vc-fill {
  height: 100%;
  border-radius: 3px;
  background: #f5f5f7;
}

/* ---------- Transitions ---------- */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: all 0.22s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateX(20px); }
</style>
