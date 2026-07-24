# macOS Web — Vue.js macOS Tahoe clone

A browser recreation of macOS Tahoe 26 ("Liquid Glass") built with Vue 3 + Vite + Pinia (JavaScript, no TypeScript). Inspired by win11React / PuruVJ macos-web.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (must pass)

## Architecture

- `src/stores/system.js` — `useSystemStore`: boot state, wallpaper, dark mode, volume/brightness, wifi/bluetooth/airdrop/focus toggles, overlay flags (`launchpadOpen`, `spotlightOpen`, `controlCenterOpen`, `notificationsOpen`), `contextMenu`. Exports `WALLPAPERS` (`{name, css}`).
- `src/stores/windows.js` — `useWindowsStore`: window manager. `windows`, `activeWindow`, `activeAppId`, `openAppIds`, `openApp(appId, {title, props})`, `closeWindow(id)`, `quitApp(appId)`, `focusWindow(id)`, `minimizeWindow(id)`, `toggleMaximize(id)`, `updateRect(id, rect)`.
- `src/fs.js` — reactive in-memory virtual file system. `HOME = '/Users/guest'`. API: `normalizePath(path, cwd)`, `getNode(path)`, `exists(path)`, `listDir(path)` → `[{name, type}]` (`type` is `'dir'|'file'`, dirs sort first), `readFile(path)`, `writeFile(path, content)`, `makeDir(path)`, `remove(path)`, `fileIcon(name, type)` → emoji.
- `src/apps/index.js` — app registry. Auto-imports every `src/apps/*/app.js` via `import.meta.glob`. Exports `apps` (map id → meta) and `getApp(id)`.
- `src/components/` — shell UI: `Desktop`, `MenuBar`, `Dock`, `WindowFrame`, `Launchpad`, `Spotlight`, `ControlCenter`, `NotificationCenter`, `ContextMenu`, `BootScreen`.

## App contract (how to add an app)

Create folder `src/apps/<id>/` with exactly two files (more internal files allowed, but keep them inside the folder):

1. `app.js` — default-exports metadata:

```js
import App from './App.vue'

export default {
  id: 'calculator',          // unique, matches folder name
  name: 'Calculator',        // shown in Dock / Launchpad / menu bar
  icon: '/icons/calculator.png', // app icon: path under public/icons (real macOS icons),
                               // OR an emoji string, OR 'live:calendar'
  iconBg: 'linear-gradient(160deg,#ffb340,#ff8a00)', // squircle bg, only used for emoji icons
  component: App,
  defaultSize: { width: 340, height: 520 },
  resizable: true,           // optional, default true
  singleton: true,           // optional, default true (one window per app)
  darkChrome: true,          // optional: dark window title bar (for fixed dark-theme apps)
}
```

Icons render via `src/components/AppIcon.vue` (handles image paths, emoji, and the live Calendar icon). Real macOS icons already extracted to `public/icons/` — use them.

## Extra shell APIs

- `inject('windowId')` — the id of the window hosting your app (e.g. for `closeWindow` on `exit`).
- `useSystemStore().clipboard` — shared virtual clipboard string (pbcopy/pbpaste).
- Windows live on spaces: `useWindowsStore()` has `spaces`, `activeSpace`, `addSpace()`, `switchSpace(id)`, `nextSpace(dir)`; new windows join the active space automatically.
- Shortcuts already handled by the shell: ⌘/Ctrl+Space Spotlight, Ctrl+↑ Mission Control, Ctrl+←/→ switch space, ⌃⌘F fullscreen, ⌘, Settings, Esc close overlays.

2. `App.vue` — the app UI. Vue 3 `<script setup>`, **scoped styles only**. The root element must fill the window: use class `app-root` (defined globally: height/width 100%, flex column). The window chrome (traffic lights, title bar) is provided by `WindowFrame` — do NOT render your own.

- Apps may receive props from `openApp(id, { props })` — declare them defensively with defaults.
- Apps may import `useSystemStore`, `useWindowsStore`, `apps`/`getApp`, and anything from `src/fs.js`.
- Persist user data to `localStorage` (key prefix `macos-web:`) where it makes sense.

## Styling rules

- Use the global CSS variables (light/dark aware): `--text`, `--text-dim`, `--window-bg`, `--sidebar-bg`, `--titlebar-bg`, `--border`, `--accent`, `--selection`, `--hover`, `--glass`, `--glass-strong`. Classes `.glass` / `.glass-strong` give Liquid Glass blur backgrounds. Apps must look right in both light and dark themes — always use the variables, never hard-code text/surface colors (app-specific brand surfaces like a terminal or Discord dark theme may be fixed, but design them to work against both).
- Font stack and `.app-root` are already global. No global styles from apps — scoped only.
- macOS Tahoe look: rounded corners (10–14px), subtle 0.5px borders, layered translucency, generous spacing, 13px base font.
- No external assets, CDNs or fonts — everything inline (CSS gradients, inline SVG). Exceptions: Photos/Preview/Music/Spotify/Podcasts load images from picsum.photos (with gradient fallbacks); Music/Spotify stream SoundHelix mp3s; Resolve/QuickTime/Photos-Videos stream media.w3.org mp4s; Safari/Chrome query the CORS-open Wikipedia API.
- UI chrome is emoji-free: use inline SVG glyphs. Real macOS icons live in `public/icons/` (+ `public/icons/brands/` for brand logos). Meta may set `iconPad: true` to render a flat SVG logo as a white glyph inside an `iconBg` squircle.
- Do not modify shared files (`src/stores/*`, `src/fs.js`, `src/components/*`, `src/apps/index.js`, root configs). New apps only add their own `src/apps/<id>/` folder.
