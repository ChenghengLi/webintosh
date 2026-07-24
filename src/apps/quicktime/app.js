import App from './App.vue'

export default {
  id: 'quicktime',
  name: 'QuickTime Player',
  icon: '/icons/quicktime.png',
  component: App,
  defaultSize: { width: 960, height: 640 },
  darkChrome: true, // fixed dark theme, like the real QuickTime Player
}
