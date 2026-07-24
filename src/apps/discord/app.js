import App from './App.vue'

export default {
  id: 'discord',
  name: 'Discord',
  icon: '/icons/discord.svg',
  iconPad: true,
  iconBg: 'linear-gradient(160deg,#8b9cf9,#5865f2)',
  component: App,
  defaultSize: { width: 1080, height: 680 },
  darkChrome: true,
  resizable: true,
  singleton: true,
}
