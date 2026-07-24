import App from './App.vue'

export default {
  id: 'notes',
  name: 'Notes',
  icon: '/icons/notes.png',
  iconBg: 'linear-gradient(160deg,#fff8d1,#ffd60a)',
  component: App,
  defaultSize: { width: 980, height: 600 },
  resizable: true,
  singleton: true,
}
