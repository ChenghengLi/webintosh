import { WALLPAPERS } from '../../stores/system'

// Shortcut definitions for the Shortcuts app.
// `actions` render as editor rows; `result` is the banner text shown after a run;
// `execute(system)` performs a real side effect on the OS and returns the banner text.

export const SHORTCUTS = [
  {
    id: 'morning-briefing',
    name: 'Morning Briefing',
    glyph: 'sunrise',
    gradient: 'linear-gradient(150deg,#ffb340,#ff5e62)',
    actions: [
      { icon: 'weather', tint: '#0a84ff', name: 'Get Current Weather', params: 'Current Location' },
      { icon: 'bell', tint: '#ff453a', name: 'Show Notification', params: '"Good morning! 72° and sunny."' },
      { icon: 'music', tint: '#fc5c7d', name: 'Play Music', params: 'Morning Playlist' },
    ],
    result: 'Good morning! 72° and sunny in Cupertino.',
  },
  {
    id: 'play-chill-mix',
    name: 'Play Chill Mix',
    glyph: 'music',
    gradient: 'linear-gradient(150deg,#bf5af2,#5e5ce6)',
    actions: [
      { icon: 'speaker', tint: '#8e8e93', name: 'Set Volume', params: '40%' },
      { icon: 'music', tint: '#fc5c7d', name: 'Play Music', params: 'Chill Mix' },
    ],
    result: 'Now playing: Chill Mix.',
  },
  {
    id: 'set-focus-1h',
    name: 'Set Focus 1h',
    glyph: 'moon',
    gradient: 'linear-gradient(150deg,#7d7aff,#3634a3)',
    actions: [
      { icon: 'moon', tint: '#5e5ce6', name: 'Set Focus', params: 'Do Not Disturb · On for 1 hour' },
      { icon: 'bell', tint: '#ff453a', name: 'Show Notification', params: '"Focus is on. See you in an hour."' },
    ],
    execute(system) {
      system.focus = true
      const t = new Date(Date.now() + 3600000)
      const at = t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      return `Do Not Disturb on until ${at}.`
    },
  },
  {
    id: 'text-eta',
    name: 'Text ETA',
    glyph: 'message',
    gradient: 'linear-gradient(150deg,#34c759,#0f9d58)',
    actions: [
      { icon: 'map', tint: '#30d158', name: 'Get Travel Time', params: 'Current Location → Home' },
      { icon: 'message', tint: '#30d158', name: 'Send Message', params: 'To: Mom · "On my way — ~20 min."' },
    ],
    result: 'Message sent to Mom: “On my way — be there in ~20 min.”',
  },
  {
    id: 'wallpaper-shuffle',
    name: 'Wallpaper Shuffle',
    glyph: 'photo',
    gradient: 'linear-gradient(150deg,#64d2ff,#0a84ff)',
    actions: [
      { icon: 'photo', tint: '#ff9f0a', name: 'Find Photos', params: 'Wallpapers album' },
      { icon: 'image', tint: '#0a84ff', name: 'Set Wallpaper', params: 'Random photo' },
    ],
    execute(system) {
      let i = system.wallpaperIndex
      while (i === system.wallpaperIndex && WALLPAPERS.length > 1)
        i = Math.floor(Math.random() * WALLPAPERS.length)
      system.setWallpaper(i)
      return `Wallpaper set to ${WALLPAPERS[i].name}.`
    },
  },
  {
    id: 'start-work-timer',
    name: 'Start Work Timer',
    glyph: 'timer',
    gradient: 'linear-gradient(150deg,#ff6961,#c81e3a)',
    actions: [
      { icon: 'stopwatch', tint: '#ff9f0a', name: 'Start Timer', params: '25 minutes' },
      { icon: 'moon', tint: '#5e5ce6', name: 'Set Focus', params: 'Work · On' },
    ],
    execute(system) {
      system.focus = true
      return 'Timer started: 25 minutes. Work Focus on.'
    },
  },
  {
    id: 'toggle-dark-mode',
    name: 'Toggle Dark Mode',
    glyph: 'appearance',
    gradient: 'linear-gradient(150deg,#636366,#1c1c1e)',
    actions: [{ icon: 'appearance', tint: '#636366', name: 'Set Appearance', params: 'Toggle Dark Mode' }],
    execute(system) {
      system.toggleDark()
      return `Appearance set to ${system.dark ? 'Dark' : 'Light'}.`
    },
  },
  {
    id: 'battery-report',
    name: 'Battery Report',
    glyph: 'battery',
    gradient: 'linear-gradient(150deg,#ffd60a,#ff9f0a)',
    actions: [
      { icon: 'battery', tint: '#30d158', name: 'Get Battery Level', params: '' },
      { icon: 'bell', tint: '#ff453a', name: 'Show Notification', params: '"Battery level"' },
    ],
    result: null, // computed in execute
    execute(system) {
      const level = system.battery
      return `Battery at ${level}% — ${level > 20 ? 'plenty of charge left' : 'low, plug in soon'}.`
    },
  },
]

export const GALLERY = [
  { glyph: 'camera', title: 'Make GIF', from: 'Photos', gradient: 'linear-gradient(150deg,#ff6482,#a240ff)' },
  { glyph: 'calculator', title: 'Split the Bill', from: 'Essentials', gradient: 'linear-gradient(150deg,#64d2ff,#0a84ff)' },
  { glyph: 'doc', title: 'Scan to PDF', from: 'Notes', gradient: 'linear-gradient(150deg,#ffd60a,#ff9f0a)' },
  { glyph: 'runner', title: 'Log a Run', from: 'Fitness', gradient: 'linear-gradient(150deg,#30d158,#0f9d58)' },
  { glyph: 'mic', title: 'Dictate a Note', from: 'Voice Memos', gradient: 'linear-gradient(150deg,#bf5af2,#5e5ce6)' },
  { glyph: 'weather', title: 'Weekend Weather', from: 'Weather', gradient: 'linear-gradient(150deg,#5ac8fa,#1d6ff2)' },
  { glyph: 'news', title: 'Read Later', from: 'Safari', gradient: 'linear-gradient(150deg,#ff9f0a,#ff453a)' },
  { glyph: 'droplet', title: 'Water Reminder', from: 'Health', gradient: 'linear-gradient(150deg,#63e6e2,#0a84ff)' },
  { glyph: 'dice', title: 'Roll the Dice', from: 'Fun', gradient: 'linear-gradient(150deg,#ff6482,#ff375f)' },
  { glyph: 'pin', title: 'Share Location', from: 'Maps', gradient: 'linear-gradient(150deg,#8e8e93,#48484a)' },
]
