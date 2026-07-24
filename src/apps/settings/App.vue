<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useSystemStore, WALLPAPERS } from '../../stores/system'
import Toggle from './Toggle.vue'
import Icon from './Icon.vue'

const props = defineProps({ section: { type: String, default: 'Appearance' } })
const system = useSystemStore()

const SECTIONS = [
  { id: 'general', name: 'General', icon: 'gear', color: '#8e8e93' },
  { id: 'wifi', name: 'Wi-Fi', icon: 'wifi', color: '#0a84ff' },
  { id: 'bluetooth', name: 'Bluetooth', icon: 'bluetooth', color: '#0a84ff' },
  { id: 'network', name: 'Network', icon: 'globe', color: '#0a84ff' },
  { id: 'appearance', name: 'Appearance', icon: 'appearance', color: '#1c1c1e' },
  { id: 'wallpaper', name: 'Wallpaper', icon: 'photo', color: '#30b0c7' },
  { id: 'notifications', name: 'Notifications & Focus', icon: 'bell', color: '#ff3b30' },
  { id: 'sounds', name: 'Sounds', icon: 'speaker', color: '#ff2d55' },
  { id: 'displays', name: 'Displays', icon: 'display', color: '#0a84ff' },
  { id: 'controlcenter', name: 'Control Center', icon: 'controlCenter', color: '#8e8e93' },
  { id: 'privacy', name: 'Privacy & Security', icon: 'lock', color: '#0a84ff' },
  { id: 'users', name: 'Users & Groups', icon: 'person', color: '#0a84ff' },
  { id: 'datetime', name: 'Date & Time', icon: 'clock', color: '#8e8e93' },
  { id: 'about', name: 'About This Mac', icon: 'info', color: '#636366' },
]

const active = ref('appearance')
const generalSub = ref('list') // 'list' | 'su' | 'storage' | 'airdrop'

// Deep-link support: openApp('settings', { props: { section: 'Wi-Fi' } }) etc.
const ALIASES = {
  general: 'general',
  wifi: 'wifi',
  'wi-fi': 'wifi',
  bluetooth: 'bluetooth',
  network: 'network',
  appearance: 'appearance',
  wallpaper: 'wallpaper',
  notifications: 'notifications',
  'notifications & focus': 'notifications',
  focus: 'notifications',
  sounds: 'sounds',
  sound: 'sounds',
  displays: 'displays',
  display: 'displays',
  controlcenter: 'controlcenter',
  'control center': 'controlcenter',
  privacy: 'privacy',
  'privacy & security': 'privacy',
  security: 'privacy',
  users: 'users',
  'users & groups': 'users',
  datetime: 'datetime',
  'date & time': 'datetime',
  about: 'about',
  'about this mac': 'about',
  'software update': 'general:su',
  storage: 'general:storage',
  airdrop: 'general:airdrop',
  'airdrop & handoff': 'general:airdrop',
}

function applySection(value) {
  const q = String(value || '').trim().toLowerCase()
  const target = ALIASES[q] || (SECTIONS.find((s) => s.id === q || s.name.toLowerCase() === q) || {}).id
  if (!target) return
  const [section, sub] = target.split(':')
  active.value = section
  generalSub.value = sub || 'list'
}

onMounted(() => applySection(props.section))
watch(() => props.section, (v) => applySection(v))
// NOTE: go() always sets generalSub explicitly, so nav clicks reset to the section root
// while sub-pane jumps (e.g. About > Software Update…) survive.

const query = ref('')
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? SECTIONS.filter((s) => s.name.toLowerCase().includes(q)) : SECTIONS
})
const current = computed(() => SECTIONS.find((s) => s.id === active.value))
const SUB_TITLES = { su: 'Software Update', storage: 'Storage', airdrop: 'AirDrop & Handoff' }
const paneTitle = computed(() =>
  active.value === 'general' && generalSub.value !== 'list'
    ? SUB_TITLES[generalSub.value]
    : current.value?.name || '',
)

function go(section, sub) {
  active.value = section
  generalSub.value = sub || 'list'
}

// --- persisted decorative prefs ------------------------------------------------
function persisted(key, fallback) {
  try {
    const v = localStorage.getItem('macos-web:' + key)
    return v === null ? fallback : v
  } catch {
    return fallback
  }
}
function persistRef(key, r) {
  watch(r, (v) => {
    try {
      localStorage.setItem('macos-web:' + key, String(v))
    } catch {
      // storage unavailable — ignore
    }
  })
}

// --- Appearance -----------------------------------------------------------------
const ACCENTS = [
  { name: 'Blue', color: '#0a84ff' },
  { name: 'Purple', color: '#bf5af2' },
  { name: 'Pink', color: '#ff375f' },
  { name: 'Red', color: '#ff3b30' },
  { name: 'Orange', color: '#ff9500' },
  { name: 'Yellow', color: '#ffcc00' },
  { name: 'Graphite', color: '#8e8e93' },
]
const accent = ref(persisted('accent', 'Blue'))
persistRef('accent', accent)

// --- Wallpaper ------------------------------------------------------------------
const wpAllSpaces = ref(persisted('wp-all-spaces', '1') === '1')
persistRef('wp-all-spaces', wpAllSpaces)

// --- Notifications & Focus ------------------------------------------------------
const notifApps = reactive([
  { name: 'Safari', icon: '/icons/safari.png', allow: true },
  { name: 'Mail', icon: '/icons/mail.png', allow: true },
  { name: 'Messages', icon: '/icons/messages.png', allow: true },
  { name: 'Calendar', icon: '/icons/calendar.png', allow: false },
])

// --- Sounds ---------------------------------------------------------------------
const ALERT_SOUNDS = ['Boop', 'Breeze', 'Crystal', 'Funk', 'Glass', 'Hero']
const alertSound = ref(persisted('alert-sound', 'Glass'))
persistRef('alert-sound', alertSound)
const outputDevices = [
  { name: 'MacBook Pro Speakers', kind: 'Built-in' },
  { name: 'AirPods Pro', kind: 'Bluetooth' },
]

// --- Displays -------------------------------------------------------------------
const RESOLUTIONS = ['Default', 'More Space', 'Larger Text']
const resolution = ref('Default')
const trueTone = ref(true)

// --- Control Center ---------------------------------------------------------------
const ccToggles = [
  { name: 'Wi-Fi', icon: 'wifi', color: '#0a84ff', key: 'wifi' },
  { name: 'Bluetooth', icon: 'bluetooth', color: '#0a84ff', key: 'bluetooth' },
  { name: 'AirDrop', icon: 'airdrop', color: '#30b0c7', key: 'airdrop' },
  { name: 'Focus', icon: 'moon', color: '#5e5ce6', key: 'focus' },
]

// --- Privacy & Security -----------------------------------------------------------
const privacy = reactive({
  location: true,
  analytics: false,
  camera: true,
  microphone: true,
  files: false,
})

// --- General ----------------------------------------------------------------------
const autoUpdate = ref(true)
const handoff = ref(true)
const storage = [
  { label: 'System', color: '#8e8e93', pct: 14 },
  { label: 'Apps', color: '#0a84ff', pct: 17 },
  { label: 'Documents', color: '#30b0c7', pct: 9 },
  { label: 'Other', color: '#bf5af2', pct: 8 },
]

// --- Bluetooth --------------------------------------------------------------------
function btGlyph(name) {
  const n = String(name).toLowerCase()
  if (n.includes('airpods') || n.includes('headphone')) return 'headphones'
  if (n.includes('mouse')) return 'mouse'
  if (n.includes('keyboard')) return 'keyboard'
  return 'bluetooth'
}

// --- Date & Time ------------------------------------------------------------------
const hour24 = ref(persisted('clock-24h', '0') === '1')
persistRef('clock-24h', hour24)
const setTimeAuto = ref(true)
const now = ref(new Date())
let clockTimer = null
onMounted(() => {
  clockTimer = setInterval(() => (now.value = new Date()), 1000)
})
onUnmounted(() => clearInterval(clockTimer))

const clockTime = computed(() => {
  const d = now.value
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  if (hour24.value) return `${String(d.getHours()).padStart(2, '0')}:${m}:${s}`
  const ap = d.getHours() >= 12 ? 'PM' : 'AM'
  return `${d.getHours() % 12 || 12}:${m}:${s} ${ap}`
})
const clockDate = computed(() =>
  now.value.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
)
</script>

<template>
  <div class="app-root">
    <div class="body">
      <aside class="sidebar">
        <div class="search">
          <Icon name="search" :size="12" class="mag" />
          <input v-model="query" placeholder="Search" spellcheck="false" />
        </div>
        <button v-if="!query" class="account" @click="go('users')">
          <span class="avatar"><Icon name="personFill" :size="24" /></span>
          <span class="acc-text">
            <span class="acc-name">guest</span>
            <span class="acc-sub">Apple Account</span>
          </span>
        </button>
        <nav class="nav">
          <button
            v-for="s in filtered"
            :key="s.id"
            class="nav-item"
            :class="{ sel: s.id === active }"
            @click="go(s.id)"
          >
            <span class="sic" :style="{ background: s.color }"><Icon :name="s.icon" :size="13" /></span>
            {{ s.name }}
          </button>
          <div v-if="!filtered.length" class="no-results">No Results</div>
        </nav>
      </aside>

      <main class="pane">
        <div class="pane-inner">
          <div class="pane-head">
            <button
              v-if="active === 'general' && generalSub !== 'list'"
              class="back"
              title="General"
              @click="generalSub = 'list'"
            >
              <Icon name="chevronLeft" :size="11" />
            </button>
            <h1 class="pane-title">{{ paneTitle }}</h1>
          </div>

          <!-- ==================== General ==================== -->
          <template v-if="active === 'general'">
            <div v-if="generalSub === 'list'" class="card">
              <button class="row link" @click="go('about')">
                <span class="sic" :style="{ background: '#636366' }"><Icon name="info" :size="13" /></span>
                <span class="row-label">About</span>
                <Icon name="chevronRight" :size="11" class="chev" />
              </button>
              <button class="row link" @click="generalSub = 'su'">
                <span class="sic" :style="{ background: '#8e8e93' }"><Icon name="update" :size="13" /></span>
                <span class="row-label">Software Update</span>
                <Icon name="chevronRight" :size="11" class="chev" />
              </button>
              <button class="row link" @click="generalSub = 'storage'">
                <span class="sic" :style="{ background: '#8e8e93' }"><Icon name="drive" :size="13" /></span>
                <span class="row-label">Storage</span>
                <Icon name="chevronRight" :size="11" class="chev" />
              </button>
              <button class="row link" @click="generalSub = 'airdrop'">
                <span class="sic" :style="{ background: '#30b0c7' }"><Icon name="airdrop" :size="13" /></span>
                <span class="row-label">AirDrop &amp; Handoff</span>
                <Icon name="chevronRight" :size="11" class="chev" />
              </button>
            </div>

            <!-- General > Software Update -->
            <template v-else-if="generalSub === 'su'">
              <div class="card su-card">
                <span class="su-badge"><Icon name="update" :size="30" /></span>
                <div class="su-title">macOS Tahoe 26.0</div>
                <div class="dim">Your Mac is up to date.</div>
                <div class="dim small">Last checked: Today</div>
              </div>
              <div class="group-label">Updates</div>
              <div class="card">
                <div class="row">
                  <span class="row-label">Automatic Updates</span>
                  <Toggle v-model="autoUpdate" />
                </div>
                <div class="row">
                  <span class="row-label dim">
                    Automatically keep your Mac up to date with the latest features and security
                    improvements.
                  </span>
                </div>
              </div>
            </template>

            <!-- General > Storage -->
            <template v-else-if="generalSub === 'storage'">
              <div class="card">
                <div class="row storage-row">
                  <div class="st-head">
                    <span class="row-label">Macintosh HD</span>
                    <span class="dim">245.8 GB of 512 GB used</span>
                  </div>
                  <div class="bar">
                    <i
                      v-for="seg in storage"
                      :key="seg.label"
                      :style="{ width: seg.pct + '%', background: seg.color }"
                    ></i>
                    <i class="free"></i>
                  </div>
                  <div class="legend">
                    <span v-for="seg in storage" :key="seg.label" class="leg">
                      <i :style="{ background: seg.color }"></i>{{ seg.label }}
                    </span>
                    <span class="leg"><i class="free-dot"></i>Available</span>
                  </div>
                </div>
              </div>
              <div class="hint">Storage is calculated on the virtual disk of this demo.</div>
            </template>

            <!-- General > AirDrop & Handoff -->
            <template v-else-if="generalSub === 'airdrop'">
              <div class="card">
                <div class="row">
                  <span class="sic" :style="{ background: '#30b0c7' }"><Icon name="airdrop" :size="13" /></span>
                  <span class="row-label">AirDrop</span>
                  <Toggle v-model="system.airdrop" />
                </div>
                <div class="row">
                  <span class="row-label">Allow Handoff between this Mac and your iCloud devices</span>
                  <Toggle v-model="handoff" />
                </div>
                <div class="row">
                  <span class="row-label">Allow AirDrop to discover</span>
                  <span class="dim">Contacts Only</span>
                </div>
              </div>
              <div class="hint">
                AirDrop lets you share instantly with people nearby. Handoff lets you pick up where
                you left off on other devices.
              </div>
            </template>
          </template>

          <!-- ==================== Wi-Fi ==================== -->
          <template v-else-if="active === 'wifi'">
            <div class="card">
              <div class="row">
                <span class="sic big" :style="{ background: '#0a84ff' }"><Icon name="wifi" :size="17" /></span>
                <span class="row-label">Wi-Fi</span>
                <Toggle v-model="system.wifi" />
              </div>
            </div>
            <div class="group-label">Known Networks</div>
            <div class="card" :class="{ dimmed: !system.wifi }">
              <button
                v-for="n in system.wifiNetworks"
                :key="n"
                class="row link"
                @click="system.joinNetwork(n)"
              >
                <span class="check">
                  <Icon v-if="n === system.wifiNetwork" name="check" :size="12" />
                </span>
                <span class="row-label">{{ n }}</span>
                <span v-if="n === system.wifiNetwork" class="dim">Connected</span>
                <Icon name="lock" :size="12" class="chev" />
                <Icon name="wifi" :size="13" class="chev" />
              </button>
              <button class="row link">
                <span class="check"></span>
                <span class="row-label">Other…</span>
                <Icon name="chevronRight" :size="11" class="chev" />
              </button>
            </div>
            <div v-if="!system.wifi" class="hint">
              Wi-Fi is turned off. Turn it on to see networks.
            </div>
          </template>

          <!-- ==================== Bluetooth ==================== -->
          <template v-else-if="active === 'bluetooth'">
            <div class="card">
              <div class="row">
                <span class="sic big" :style="{ background: '#0a84ff' }"><Icon name="bluetooth" :size="17" /></span>
                <span class="row-label">Bluetooth</span>
                <Toggle v-model="system.bluetooth" />
              </div>
            </div>
            <div class="group-label">My Devices</div>
            <div class="card" :class="{ dimmed: !system.bluetooth }">
              <div v-for="d in system.btDevices" :key="d.name" class="row">
                <span class="sic" :style="{ background: '#8e8e93' }">
                  <Icon :name="btGlyph(d.name)" :size="13" />
                </span>
                <span class="row-label">{{ d.name }}</span>
                <span class="dim">{{ d.connected ? 'Connected' : 'Not Connected' }}</span>
                <button class="btn" @click="system.toggleBtDevice(d.name)">
                  {{ d.connected ? 'Disconnect' : 'Connect' }}
                </button>
              </div>
            </div>
            <div v-if="!system.bluetooth" class="hint">Bluetooth is turned off.</div>
          </template>

          <!-- ==================== Network (decorative) ==================== -->
          <template v-else-if="active === 'network'">
            <div class="card">
              <div class="row">
                <span class="sic big" :style="{ background: '#0a84ff' }"><Icon name="globe" :size="17" /></span>
                <span class="row-label">Ethernet</span>
                <span class="dot"></span>
                <span class="dim">Connected</span>
              </div>
            </div>
            <div class="group-label">Details</div>
            <div class="card">
              <div class="row"><span class="row-label">IP Address</span><span class="dim">192.168.1.12</span></div>
              <div class="row"><span class="row-label">Subnet Mask</span><span class="dim">255.255.255.0</span></div>
              <div class="row"><span class="row-label">Router</span><span class="dim">192.168.1.1</span></div>
              <div class="row"><span class="row-label">DNS</span><span class="dim">192.168.1.1</span></div>
            </div>
            <div class="hint">This Mac is connected to the internet via Ethernet.</div>
          </template>

          <!-- ==================== Appearance ==================== -->
          <template v-else-if="active === 'appearance'">
            <div class="appear-row">
              <button class="appear" :class="{ sel: !system.dark }" @click="system.setDark(false)">
                <span class="thumb light-thumb">
                  <span class="mini-win"><i></i><i></i><i></i></span>
                </span>
                <span class="appear-name">Light</span>
              </button>
              <button class="appear" :class="{ sel: system.dark }" @click="system.setDark(true)">
                <span class="thumb dark-thumb">
                  <span class="mini-win dark"><i></i><i></i><i></i></span>
                </span>
                <span class="appear-name">Dark</span>
              </button>
            </div>
            <div class="group-label">Accent color</div>
            <div class="card">
              <div class="row">
                <span class="swatches">
                  <button
                    v-for="a in ACCENTS"
                    :key="a.name"
                    class="swatch"
                    :class="{ sel: accent === a.name }"
                    :style="{ background: a.color }"
                    :title="a.name"
                    @click="accent = a.name"
                  >
                    <Icon v-if="accent === a.name" name="check" :size="10" />
                  </button>
                </span>
              </div>
            </div>
            <div class="hint">Dark Mode changes the look of the desktop, Dock, menus and apps.</div>
          </template>

          <!-- ==================== Wallpaper ==================== -->
          <template v-else-if="active === 'wallpaper'">
            <div class="wp-grid">
              <button
                v-for="(w, i) in WALLPAPERS"
                :key="w.name"
                class="wp"
                :class="{ sel: system.wallpaperIndex === i }"
                @click="system.setWallpaper(i)"
              >
                <span class="wp-thumb" :style="{ background: w.css }"></span>
                <span class="wp-name">{{ w.name }}</span>
              </button>
            </div>
            <div class="group-label">Options</div>
            <div class="card">
              <div class="row">
                <span class="row-label">Show on all spaces</span>
                <Toggle v-model="wpAllSpaces" />
              </div>
            </div>
          </template>

          <!-- ==================== Notifications & Focus ==================== -->
          <template v-else-if="active === 'notifications'">
            <div class="group-label first">App Notifications</div>
            <div class="card">
              <div v-for="a in notifApps" :key="a.name" class="row">
                <img class="app-ic" :src="a.icon" :alt="a.name" draggable="false" />
                <span class="row-label">{{ a.name }}</span>
                <Toggle v-model="a.allow" />
              </div>
            </div>
            <div class="group-label">Focus</div>
            <div class="card">
              <div class="row">
                <span class="sic" :style="{ background: '#5e5ce6' }"><Icon name="moon" :size="13" /></span>
                <span class="row-label">Do Not Disturb</span>
                <Toggle v-model="system.focus" />
              </div>
              <div class="row">
                <span class="row-label">Schedule</span>
                <span class="dim">From 22:00 to 07:00</span>
              </div>
              <div class="row">
                <span class="row-label">Allow calls from</span>
                <span class="dim">Favorites</span>
              </div>
            </div>
            <div class="hint">
              When Do Not Disturb is on, a moon icon appears in the menu bar and notifications are
              silenced.
            </div>
          </template>

          <!-- ==================== Sounds ==================== -->
          <template v-else-if="active === 'sounds'">
            <div class="group-label first">Output</div>
            <div class="card">
              <div v-for="d in outputDevices" :key="d.name" class="row">
                <span class="sic" :style="{ background: '#8e8e93' }"><Icon name="speaker" :size="13" /></span>
                <span class="row-label">{{ d.name }}</span>
                <span class="dim">{{ d.kind }}</span>
              </div>
              <div class="row slider-row">
                <span class="dim lbl">Output volume</span>
                <Icon name="speakerLow" :size="14" class="chev" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  v-model.number="system.volume"
                  :style="{ '--fill': system.volume + '%' }"
                />
                <Icon name="speaker" :size="14" class="chev" />
                <span class="vol-val">{{ system.volume }}%</span>
              </div>
              <div class="row">
                <span class="row-label dim">Mute</span>
                <Toggle
                  :model-value="system.volume === 0"
                  @update:model-value="system.volume = $event ? 0 : 60"
                />
              </div>
            </div>
            <div class="group-label">Alert Sound</div>
            <div class="card">
              <button
                v-for="s in ALERT_SOUNDS"
                :key="s"
                class="row link"
                @click="alertSound = s"
              >
                <span class="check"><Icon v-if="alertSound === s" name="check" :size="12" /></span>
                <span class="row-label">{{ s }}</span>
              </button>
            </div>
          </template>

          <!-- ==================== Displays ==================== -->
          <template v-else-if="active === 'displays'">
            <div class="card">
              <div class="row slider-row">
                <span class="dim lbl">Brightness</span>
                <Icon name="sun" :size="13" class="chev" />
                <input
                  type="range"
                  min="20"
                  max="100"
                  v-model.number="system.brightness"
                  :style="{ '--fill': ((system.brightness - 20) / 80) * 100 + '%' }"
                />
                <Icon name="sun" :size="17" class="chev" />
                <span class="vol-val">{{ system.brightness }}%</span>
              </div>
              <div class="row">
                <span class="row-label">True Tone</span>
                <Toggle v-model="trueTone" />
              </div>
            </div>
            <div class="group-label">Resolution</div>
            <div class="card">
              <button
                v-for="r in RESOLUTIONS"
                :key="r"
                class="row link"
                @click="resolution = r"
              >
                <span class="check"><Icon v-if="resolution === r" name="check" :size="12" /></span>
                <span class="row-label">{{ r === 'Default' ? 'Default for display' : r }}</span>
              </button>
            </div>
          </template>

          <!-- ==================== Control Center ==================== -->
          <template v-else-if="active === 'controlcenter'">
            <div class="group-label first">Control Center Modules</div>
            <div class="card">
              <div v-for="t in ccToggles" :key="t.key" class="row">
                <span class="sic" :style="{ background: t.color }"><Icon :name="t.icon" :size="13" /></span>
                <span class="row-label">{{ t.name }}</span>
                <Toggle v-model="system[t.key]" />
              </div>
            </div>
            <div class="hint">These modules are shown in Control Center in the menu bar.</div>
          </template>

          <!-- ==================== Privacy & Security ==================== -->
          <template v-else-if="active === 'privacy'">
            <div class="card">
              <div class="row">
                <span class="row-label">Location Services</span>
                <Toggle v-model="privacy.location" />
              </div>
              <div class="row">
                <span class="row-label">Share Mac Analytics</span>
                <Toggle v-model="privacy.analytics" />
              </div>
            </div>
            <div class="group-label">Security</div>
            <div class="card">
              <div class="row">
                <span class="row-label">FileVault</span>
                <span class="dim">On</span>
              </div>
            </div>
            <div class="group-label">App Permissions</div>
            <div class="card">
              <div class="row">
                <span class="row-label">Camera</span>
                <Toggle v-model="privacy.camera" />
              </div>
              <div class="row">
                <span class="row-label">Microphone</span>
                <Toggle v-model="privacy.microphone" />
              </div>
              <div class="row">
                <span class="row-label">Files and Folders</span>
                <Toggle v-model="privacy.files" />
              </div>
            </div>
          </template>

          <!-- ==================== Users & Groups ==================== -->
          <template v-else-if="active === 'users'">
            <div class="card">
              <div class="row user-row">
                <span class="avatar small"><Icon name="personFill" :size="20" /></span>
                <span class="row-label">guest</span>
                <span class="badge">Admin</span>
              </div>
            </div>
            <div class="group-label">Login Items</div>
            <div class="card">
              <div class="row">
                <span class="row-label dim empty">No login items</span>
              </div>
            </div>
            <div class="row-buttons">
              <button class="btn" disabled>Add Account</button>
            </div>
          </template>

          <!-- ==================== Date & Time ==================== -->
          <template v-else-if="active === 'datetime'">
            <div class="card clock-card">
              <div class="clock-time">{{ clockTime }}</div>
              <div class="dim">{{ clockDate }}</div>
            </div>
            <div class="card">
              <div class="row">
                <span class="row-label">24-Hour Time</span>
                <Toggle v-model="hour24" />
              </div>
              <div class="row">
                <span class="row-label">Set date and time automatically</span>
                <Toggle v-model="setTimeAuto" />
              </div>
              <div class="row">
                <span class="row-label">Time zone</span>
                <span class="dim">GMT+2 — Cairo</span>
              </div>
            </div>
          </template>

          <!-- ==================== About This Mac ==================== -->
          <template v-else-if="active === 'about'">
            <div class="card about-card">
              <div class="mac-icon"><Icon name="macbook" :size="64" /></div>
              <div class="about-head">
                <div class="about-name">MacBook Pro</div>
                <div class="dim">14-inch, Nov 2024</div>
              </div>
              <div class="specs">
                <div class="spec"><span class="dim">Chip</span><span>Apple M4</span></div>
                <div class="spec"><span class="dim">Memory</span><span>16 GB</span></div>
                <div class="spec"><span class="dim">Serial number</span><span>F2LXM4P14T</span></div>
                <div class="spec"><span class="dim">macOS</span><span>Tahoe 26.0</span></div>
              </div>
              <div class="about-buttons">
                <button class="btn" @click="go('general')">More Info…</button>
                <button class="btn" @click="go('general', 'su')">Software Update…</button>
              </div>
            </div>
            <div class="group-label">Storage</div>
            <div class="card">
              <div class="row storage-row">
                <div class="st-head">
                  <span class="row-label">Macintosh HD</span>
                  <span class="dim">245.8 GB of 512 GB used</span>
                </div>
                <div class="bar">
                  <i
                    v-for="seg in storage"
                    :key="seg.label"
                    :style="{ width: seg.pct + '%', background: seg.color }"
                  ></i>
                  <i class="free"></i>
                </div>
                <div class="legend">
                  <span v-for="seg in storage" :key="seg.label" class="leg">
                    <i :style="{ background: seg.color }"></i>{{ seg.label }}
                  </span>
                  <span class="leg"><i class="free-dot"></i>Available</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.sidebar {
  width: 215px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  overflow-y: auto;
  background: var(--sidebar-bg);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  border-right: 0.5px solid var(--border);
}
.search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  border-radius: 7px;
  flex: none;
  background: var(--glass);
  border: 0.5px solid var(--border);
}
.mag {
  opacity: 0.6;
}
.search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  font-size: 13px;
}
.account {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  text-align: left;
  flex: none;
}
.account:hover {
  background: var(--hover);
}
.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(160deg, #7da2ff, #5e5ce6);
  flex: none;
}
.avatar.small {
  width: 32px;
  height: 32px;
}
.acc-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.acc-name {
  font-size: 14px;
  font-weight: 600;
}
.acc-sub {
  font-size: 11px;
  color: var(--text-dim);
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-item:hover:not(.sel) {
  background: var(--hover);
}
.nav-item.sel {
  background: var(--selection);
}
.sic {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: #fff;
  flex: none;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.08);
}
.sic.big {
  width: 30px;
  height: 30px;
  border-radius: 8px;
}
.no-results {
  padding: 8px;
  color: var(--text-dim);
  text-align: center;
}

.pane {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}
.pane-inner {
  max-width: 620px;
  margin: 0 auto;
  padding: 16px 26px 30px;
}
.pane-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.pane-title {
  font-size: 20px;
  font-weight: 700;
}
.back {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--glass-strong);
  border: 0.5px solid var(--border);
  color: var(--text-dim);
  flex: none;
}
.group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  margin: 16px 0 6px 8px;
}
.group-label.first {
  margin-top: 0;
}
.card {
  border-radius: 10px;
  border: 0.5px solid var(--border);
  background: var(--glass);
  overflow: hidden;
}
.card.dimmed {
  opacity: 0.45;
  pointer-events: none;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  min-height: 38px;
  width: 100%;
  text-align: left;
  font-size: 13px;
}
.row + .row {
  border-top: 0.5px solid var(--border);
}
.row.link:hover {
  background: var(--hover);
}
.row-label {
  flex: 1;
  min-width: 0;
}
.dim {
  color: var(--text-dim);
  font-size: 12px;
}
.dim.small {
  font-size: 11px;
}
.hint {
  margin: 10px 8px 0;
  font-size: 12px;
  color: var(--text-dim);
}
.chev {
  color: var(--text-dim);
  flex: none;
}
.check {
  width: 14px;
  color: var(--accent);
  display: inline-flex;
  flex: none;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34c759;
  flex: none;
}
.btn {
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 13px;
  background: var(--glass-strong);
  border: 0.5px solid var(--border);
  box-shadow: 0 0.5px 1.5px rgba(0, 0, 0, 0.08);
  flex: none;
}
.btn:active:not(:disabled) {
  filter: brightness(0.92);
}
.btn:disabled {
  opacity: 0.45;
}
.row-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(120, 120, 128, 0.2);
  color: var(--text-dim);
  flex: none;
}
.app-ic {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  flex: none;
}

/* Appearance */
.appear-row {
  display: flex;
  gap: 20px;
}
.appear {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.thumb {
  width: 150px;
  height: 96px;
  border-radius: 10px;
  border: 0.5px solid var(--border);
  display: grid;
  place-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
.light-thumb {
  background: linear-gradient(160deg, #a1c4fd, #c2e9fb 60%, #fbc2eb);
}
.dark-thumb {
  background: linear-gradient(160deg, #232526, #414345);
}
.mini-win {
  width: 84px;
  height: 56px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 8px;
}
.mini-win.dark {
  background: rgba(32, 32, 36, 0.95);
}
.mini-win i {
  height: 5px;
  border-radius: 3px;
  background: rgba(128, 128, 128, 0.5);
}
.mini-win i:first-child {
  width: 60%;
}
.appear.sel .thumb,
.wp.sel .wp-thumb {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
.appear.sel .appear-name,
.wp.sel .wp-name {
  color: var(--accent);
  font-weight: 600;
}
.swatches {
  display: flex;
  gap: 8px;
}
.swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.15);
}
.swatch.sel {
  outline: 2px solid var(--accent);
  outline-offset: 1.5px;
}

/* Wallpaper */
.wp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}
.wp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.wp-thumb {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 10px;
  border: 0.5px solid var(--border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

/* Sliders */
.slider-row .lbl {
  width: 90px;
  flex: none;
}
input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 4px;
  border-radius: 2px;
  outline: none;
  background: linear-gradient(
    to right,
    var(--accent) 0%,
    var(--accent) var(--fill, 60%),
    rgba(120, 120, 128, 0.25) var(--fill, 60%)
  );
}
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.3),
    0 0 0 0.5px rgba(0, 0, 0, 0.08);
}
.vol-val {
  width: 38px;
  text-align: right;
  color: var(--text-dim);
  flex: none;
}

/* Software Update */
.su-card {
  padding: 26px 22px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.su-badge {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(160deg, #a9a9b1, #8e8e93);
  margin-bottom: 6px;
}
.su-title {
  font-size: 17px;
  font-weight: 700;
}

/* Date & Time */
.clock-card {
  padding: 22px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
.clock-time {
  font-size: 34px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}

/* About */
.about-card {
  padding: 22px;
  text-align: center;
}
.mac-icon {
  color: var(--text-dim);
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}
.about-head {
  margin-bottom: 16px;
}
.about-name {
  font-size: 17px;
  font-weight: 700;
}
.specs {
  max-width: 320px;
  margin: 0 auto;
}
.spec {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}
.about-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
.storage-row {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.st-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.bar {
  display: flex;
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  background: rgba(120, 120, 128, 0.18);
}
.bar i {
  display: block;
}
.bar .free {
  flex: 1;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 11px;
  color: var(--text-dim);
}
.leg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.leg i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.free-dot {
  background: rgba(120, 120, 128, 0.3);
}
.empty {
  text-align: center;
}
</style>
