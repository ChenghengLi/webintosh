import App from './App.vue'

export default {
  id: 'safari',
  name: 'Safari',
  icon: '/icons/safari.png',
  iconBg: 'linear-gradient(160deg,#5ee7ff,#0a84ff)',
  component: App,
  defaultSize: { width: 1100, height: 700 },
  resizable: true,
  singleton: true,
}
