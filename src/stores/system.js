import { defineStore } from 'pinia'

export const DOCK_DEFAULT = [
  'finder',
  'launchpad',
  'safari',
  'chrome',
  'mail',
  'messages',
  'notes',
  'reminders',
  'photos',
  'music',
  'spotify',
  'calendar',
  'weather',
  'appstore',
  'terminal',
  'calculator',
  'vscode',
  'discord',
  'settings',
]

export const WALLPAPERS = [
  { name: 'Sonoma', css: "url('/wallpapers/sonoma.jpg') center / cover no-repeat" },
  { name: 'Radial Sky Blue', css: "url('/wallpapers/radial-sky-blue.jpg') center / cover no-repeat" },
  { name: 'iMac Blue', css: "url('/wallpapers/imac-blue.jpg') center / cover no-repeat" },
  { name: 'iMac Green', css: "url('/wallpapers/imac-green.jpg') center / cover no-repeat" },
  { name: 'iMac Orange', css: "url('/wallpapers/imac-orange.jpg') center / cover no-repeat" },
  { name: 'iMac Pink', css: "url('/wallpapers/imac-pink.jpg') center / cover no-repeat" },
  { name: 'iMac Purple', css: "url('/wallpapers/imac-purple.jpg') center / cover no-repeat" },
  { name: 'iMac Silver', css: "url('/wallpapers/imac-silver.jpg') center / cover no-repeat" },
  { name: 'iMac Yellow', css: "url('/wallpapers/imac-yellow.jpg') center / cover no-repeat" },
]

export const useSystemStore = defineStore('system', {
  state: () => ({
    booting: true,
    wallpaperIndex: 0,
    dark: false,
    volume: 60,
    brightness: 100,
    wifi: true,
    bluetooth: true,
    airdrop: false,
    focus: false,
    wifiNetwork: 'HomeNet',
    wifiNetworks: ['HomeNet', 'CoffeeShop Guest', 'xfinitywifi'],
    btDevices: [
      { name: 'AirPods Pro', connected: true, battery: 82 },
      { name: 'Magic Mouse', connected: true, battery: 64 },
      { name: 'Magic Keyboard', connected: false, battery: 41 },
    ],
    audioOutput: 'speakers', // 'speakers' | 'airpods'
    inputSource: 'US',
    dockHidden: [], // pinned app ids the user removed from the Dock
    dockExtraPinned: [], // unpinned apps the user chose to keep in the Dock
    loginItems: [], // app ids opened automatically at login
    inputSources: [
      { id: 'US', glyph: 'EN', name: 'U.S. English' },
      { id: 'pinyin', glyph: '拼', name: 'Chinese – Simplified (Pinyin)' },
      { id: 'arabic', glyph: 'ع', name: 'Arabic – QWERTY' },
      { id: 'japanese', glyph: 'あ', name: 'Japanese – Romaji' },
    ],
    use24h: true,
    battery: 87,
    launchpadOpen: false,
    spotlightOpen: false,
    controlCenterOpen: false,
    notificationsOpen: false,
    missionControlOpen: false,
    contextMenu: null, // { x, y, items: [{ label, action, disabled, separator }] }
    clipboard: '',
    nowPlaying: null, // { title, artist, app, playing } — set by Music/Spotify while audio plays
    mediaControls: null, // { playPause(), next(), prev() } registered by the source app
    fileClipboard: null, // { path, name, type: 'file'|'dir', cut: boolean }
  }),
  getters: {
    wallpaper: (s) => WALLPAPERS[s.wallpaperIndex],
  },
  actions: {
    hydrate() {
      try {
        const saved = JSON.parse(localStorage.getItem('macos-web:system') || '{}')
        if (typeof saved.dark === 'boolean') this.setDark(saved.dark)
        if (Number.isInteger(saved.wallpaperIndex) && WALLPAPERS[saved.wallpaperIndex])
          this.wallpaperIndex = saved.wallpaperIndex
        if (typeof saved.volume === 'number') this.volume = saved.volume
        if (typeof saved.brightness === 'number') this.brightness = saved.brightness
        if (Array.isArray(saved.dockHidden)) this.dockHidden = saved.dockHidden
        if (Array.isArray(saved.dockExtraPinned)) this.dockExtraPinned = saved.dockExtraPinned
        if (Array.isArray(saved.loginItems)) this.loginItems = saved.loginItems
      } catch {
        // ignore corrupt persisted state
      }
    },
    persist() {
      localStorage.setItem(
        'macos-web:system',
        JSON.stringify({
          dark: this.dark,
          wallpaperIndex: this.wallpaperIndex,
          volume: this.volume,
          brightness: this.brightness,
          dockHidden: this.dockHidden,
          dockExtraPinned: this.dockExtraPinned,
          loginItems: this.loginItems,
        }),
      )
    },
    setWallpaper(i) {
      if (WALLPAPERS[i]) this.wallpaperIndex = i
    },
    joinNetwork(name) {
      if (this.wifi && this.wifiNetworks.includes(name)) this.wifiNetwork = name
    },
    setNowPlaying(np) {
      this.nowPlaying = np
    },
    setMediaControls(ctrls) {
      this.mediaControls = ctrls
    },
    setInputSource(id) {
      if (this.inputSources.some((s) => s.id === id)) this.inputSource = id
    },
    toggleDockPin(id) {
      if (this.dockExtraPinned.includes(id)) {
        this.dockExtraPinned = this.dockExtraPinned.filter((x) => x !== id)
      } else if (this.dockHidden.includes(id)) {
        this.dockHidden = this.dockHidden.filter((x) => x !== id)
      } else if (DOCK_DEFAULT.includes(id)) {
        this.dockHidden = [...this.dockHidden, id]
      } else {
        this.dockExtraPinned = [...this.dockExtraPinned, id]
      }
    },
    toggleLoginItem(id) {
      this.loginItems = this.loginItems.includes(id)
        ? this.loginItems.filter((x) => x !== id)
        : [...this.loginItems, id]
    },
    clearMedia(appName) {
      if (!appName || this.nowPlaying?.app === appName) {
        this.nowPlaying = null
        this.mediaControls = null
      }
    },
    toggleBtDevice(name) {
      const d = this.btDevices.find((d) => d.name === name)
      if (d && this.bluetooth) d.connected = !d.connected
    },
    toggleDark() {
      this.dark = !this.dark
      document.documentElement.dataset.theme = this.dark ? 'dark' : 'light'
    },
    setDark(v) {
      this.dark = v
      document.documentElement.dataset.theme = v ? 'dark' : 'light'
    },
    toggleOverlay(name) {
      const wasOpen = this[name]
      this.closeOverlays()
      this[name] = !wasOpen
    },
    closeOverlays() {
      this.launchpadOpen = false
      this.spotlightOpen = false
      this.controlCenterOpen = false
      this.notificationsOpen = false
      this.missionControlOpen = false
      this.contextMenu = null
    },
    openContextMenu(x, y, items) {
      this.contextMenu = { x, y, items }
    },
  },
})
