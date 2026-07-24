# Webintosh

**macOS Tahoe 26, running entirely in your browser.** A pixel-faithful recreation of the Mac desktop — window manager, Dock, Spaces, Spotlight, Control Center, and 44 fully functional apps — built with **Vue 3 + Vite + Pinia**.

**Live demo → [webintosh on Vercel](https://macos-web-brown.vercel.app)**

Inspired by [win11React](https://github.com/blueedgetechno/win11React) and [PuruVJ/macos-web](https://github.com/PuruVJ/macos-web).

## Quick start

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run smoke    # quick interaction test (headless Chrome)
npm run verify   # full Playwright suite: 95+ checks across the shell and all apps
```

## What's inside

### The desktop environment
- **Boot screen → desktop** with real macOS wallpapers and genuine app icons (extracted from a local macOS installation)
- **Menu bar** — Apple menu, per-app menus, Window menu, and the full Tahoe status row: Bluetooth, Focus, battery, input-source switcher (EN / 拼 / ع / あ), Wi-Fi menu with network switching, Spotlight, Siri, Control Center, live 12/24h clock
- **Dock** — magnification-free Tahoe behavior: running apps appear, auto-shrink that can never overflow, right-click menu (Open / Keep in Dock / Open at Login / Show in Finder / Hide / Quit), working Trash (fills on delete, Put Back, Empty)
- **Window manager** — drag, 8-direction resize, minimize (genie), maximize, and the Tahoe green-light **tiling panel**: Fill Screen, halves, quarters, Arrange side-by-side, edge-drag tiling previews, and true full screen with auto-hiding Dock & menu bar
- **Spaces + Mission Control** (Ctrl+↑ / Ctrl+←→) with mini-screen space thumbnails
- **Spotlight** (⌘/Ctrl+Space), **Launchpad**, **Control Center** (expandable Wi-Fi/Bluetooth panels, Now Playing card that really controls Music/Spotify, AirPods battery, output selector), **Notification Center**, right-click context menus everywhere, dark mode, persistent state

### 44 apps — all functional
- **Apple:** Finder (real icons, drag & drop, copy/paste, Rename, Quick Look, New Terminal at Folder), Safari + Google Chrome (live Wikipedia browsing), Mail, Messages, Notes, Reminders, Photos (real photos, Videos, People, EXIF), Music & Spotify (**real audio playback**), Podcasts, Calendar (Day/Week/Month/Year, event popovers, multiple calendars, drag-to-move), Weather, Clock, Maps (dense streets, routes, turn-by-turn, transit, 3D tilt), App Store, Terminal (60+ commands, tab completion), Calculator, TextEdit, Preview (markup), Activity Monitor, Stocks, Voice Memos, Books, Chess, FaceTime, Contacts, News, TV, Home, Shortcuts, Dictionary, QuickTime (**real video**), Stickies, Freeform, Grapher, System Settings
- **Third-party:** Visual Studio Code (open projects, **syntax highlighting**, ⌘S saves), Discord, Claude (streaming assistant), Microsoft Word / PowerPoint / Excel (1:1 ribbons, formula engine), **DaVinci Resolve** (real video timeline, color wheels, audio meters)

### Engineering
- Reactive **virtual file system** shared by Finder, Terminal, VS Code, TextEdit, Word, and the Desktop itself (with Trash support)
- **95+ automated Playwright checks** (`npm run verify`) covering window chrome, tiling, fullscreen, Spaces, Trash, context menus, Wi-Fi panels, dock extras, and every app's mount
- Real macOS assets where it matters: app icons from `.icns`, Dock Trash states, Desktop Pictures wallpapers, official brand SVGs
- Honest networking: Wikipedia API for real browsing; picsum/SoundHelix/W3C media with graceful offline fallbacks everywhere

## Project layout

```
src/
  components/   Desktop, MenuBar, Dock, WindowFrame, MissionControl,
                Spotlight, Launchpad, ControlCenter, NotificationCenter, ...
  stores/       Pinia: system (theme/wallpaper/media/dock) + windows (WM + spaces)
  fs.js         reactive virtual file system (+ Trash, move, rename)
  apps/         44 self-registering apps — see AGENTS.md for the app contract
scripts/        smoke.mjs + verify.mjs (Playwright via system Chrome)
public/         icons/ wallpapers/
```

Add a new app by dropping a folder into `src/apps/<id>/` — the contract is documented in [AGENTS.md](AGENTS.md).

## Deployment

Static SPA — deploys anywhere:

```sh
vercel --prod --yes --name macos-web
```

## License & disclaimer

[MIT](LICENSE)

Webintosh is a fan-made technical demonstration. Not affiliated with, endorsed by, or sponsored by Apple Inc., Microsoft, Blackmagic Design, Discord, Spotify, or Anthropic. macOS, the Mac interface, and all app icons and wallpapers are trademarks and copyrighted works of Apple Inc. and their respective owners — they appear here for study and demonstration purposes only. Product names and logos (Word, Excel, PowerPoint, Spotify, Discord, Claude, DaVinci Resolve, Visual Studio Code, Google Chrome) belong to their respective owners.
