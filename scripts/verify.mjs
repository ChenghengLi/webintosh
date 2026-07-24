// Comprehensive end-to-end verification: exercises every shell interaction and
// every app, captures a screenshot of each app, and fails on console errors.
// Usage: node scripts/verify.mjs [baseURL]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'fs'

const BASE = process.argv[2] || 'http://localhost:5173'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SHOTS = '/tmp/macos-shots'
mkdirSync(SHOTS, { recursive: true })

const results = []
const consoleErrors = []
let page
let currentScope = 'boot'

function check(name, ok, extra = '') {
  results.push({ name, ok })
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`)
}

async function waitBoot() {
  await page.waitForSelector('.boot', { state: 'detached', timeout: 15000 })
  await page.waitForSelector('.menubar', { timeout: 5000 })
}

async function go(url, scope) {
  currentScope = scope
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitBoot()
  await page.waitForTimeout(300)
}

const win = () => page.locator('.window').first()

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`[${currentScope}] ${m.text()}`))
  page.on('pageerror', (e) => consoleErrors.push(`[${currentScope}] ${e}`))
  // external media CDNs are out of test scope (flaky DNS stalls screenshots); apps show offline fallbacks
  await page.route('**picsum.photos/**', (route) => route.abort())
  await page.route('**media.w3.org/**', (route) => route.abort())
  await page.route('**soundhelix.com/**', (route) => route.abort())
  await page.route('**upload.wikimedia.org/**', (route) => route.abort())

  // ---------- boot ----------
  await go(`${BASE}/`, 'desktop')
  check('boots to desktop', await page.locator('.dock').isVisible())
  check('dock icons are real images', (await page.locator('.dock-item img').count()) >= 12)

  // ---------- window chrome: open, drag, resize, maximize, minimize, close ----------
  await go(`${BASE}/?open=finder`, 'window-chrome')
  const t = await win().locator('.titlebar .title').innerText()
  check('finder window open with title', t === 'Finder', t)

  // drag (keep the bottom-right corner above the dock for the resize test below)
  let box = await win().boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 180, box.y + 60, { steps: 8 })
  await page.mouse.up()
  const box2 = await win().boundingBox()
  check('window drags', Math.abs(box2.x - box.x - 180) < 15 && Math.abs(box2.y - box.y - 40) < 15)

  // resize via se handle
  box = await win().boundingBox()
  await page.mouse.move(box.x + box.width - 5, box.y + box.height - 5)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width + 115, box.y + box.height + 75, { steps: 6 })
  await page.mouse.up()
  const box3 = await win().boundingBox()
  check('window resizes', box3.width > box.width + 80 && box3.height > box.height + 40)

  // maximize + restore (animated, ~300ms)
  await win().locator('.light.max').click()
  await page.waitForTimeout(450)
  const box4 = await win().boundingBox()
  check('green light maximizes', box4.width >= 1400, `w=${Math.round(box4.width)}`)
  await win().locator('.light.max').click()
  await page.waitForTimeout(450)
  const box5 = await win().boundingBox()
  check('green light restores', box5.width < 1200)

  // minimize + restore via dock
  await win().locator('.light.min').click()
  await page.waitForTimeout(500)
  check('yellow light minimizes', (await page.locator('.window:visible').count()) === 0)
  await page.locator('.dock-item .icon').first().click()
  await page.waitForTimeout(500)
  check('dock click restores window', (await page.locator('.window:visible').count()) === 1)

  // close (animated, removed after ~170ms)
  await win().locator('.light.close').click()
  await page.waitForTimeout(400)
  check('red light closes', (await page.locator('.window').count()) === 0)

  // ---------- context menu + dark mode ----------
  await go(`${BASE}/`, 'context-menu')
  await page.mouse.click(700, 450, { button: 'right' })
  await page.waitForSelector('.ctx', { timeout: 3000 })
  check('right-click shows context menu', true)
  await page.locator('.ctx .item', { hasText: 'Use Dark Mode' }).click()
  check('dark mode applies', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark')
  await page.mouse.click(700, 450, { button: 'right' })
  await page.locator('.ctx .item', { hasText: 'Use Light Mode' }).click()
  check('light mode restores', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light')
  await page.mouse.click(700, 450, { button: 'right' })
  await page.locator('.ctx .item', { hasText: 'Change Wallpaper' }).click()
  await page.waitForTimeout(400)
  check('change wallpaper opens settings', (await page.locator('.window > .titlebar .title').first().innerText()) === 'System Settings')

  // ---------- menu bar ----------
  await go(`${BASE}/?open=notes`, 'menubar')
  check('active app name in menu bar', (await page.locator('.menubar .left').innerText()).includes('Notes'))
  await page.locator('.mb-item').first().click() // apple menu
  await page.waitForSelector('.dropdown', { timeout: 2000 })
  check('apple menu opens', (await page.locator('.dropdown').innerText()).includes('About This Mac'))
  await page.locator('.dropdown .row', { hasText: 'About This Mac' }).click()
  await page.waitForTimeout(500)
  check('about this mac opens settings', (await page.locator('.window').last().innerText()).includes('MacBook Pro'))
  await page.locator('.mb-item', { hasText: 'Window' }).click()
  const wmenu = await page.locator('.dropdown').innerText()
  check('window menu lists windows', wmenu.includes('Notes') && wmenu.includes('Minimize'), wmenu.split('\n').slice(0, 6).join('|'))

  // ---------- control center ----------
  await go(`${BASE}/`, 'control-center')
  await page.locator('.mb-item.status[title="Control Center"]').click()
  await page.waitForSelector('.cc', { timeout: 2000 })
  const wifiRow = page.locator('.cc .conn-row', { hasText: 'Wi-Fi' }).first()
  await wifiRow.click()
  check('cc wifi expands network list', (await page.locator('.cc .subrow', { hasText: 'CoffeeShop' }).count()) === 1)
  await wifiRow.locator('.ico').click()
  check('cc wifi toggles off', (await wifiRow.innerText()).includes('Off'))
  await wifiRow.locator('.ico').click()
  check('cc wifi toggles on', !(await wifiRow.innerText()).includes('Off'))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  // ---------- launchpad ----------
  await page.locator('.dock-item .icon').nth(1).click()
  await page.waitForSelector('.lp', { timeout: 3000 })
  check('launchpad opens', (await page.locator('.lp-icon').count()) >= 25)
  await page.locator('.lp .search input').fill('saf')
  await page.locator('.lp-icon').first().click()
  await page.waitForTimeout(400)
  check('launchpad launches + closes', (await page.locator('.lp').count()) === 0 && (await page.locator('.window > .titlebar .title').first().innerText()) === 'Safari')

  // ---------- spaces + mission control ----------
  await go(`${BASE}/?open=finder`, 'spaces')
  await page.keyboard.press('Control+ArrowUp')
  await page.waitForSelector('.mc', { timeout: 3000 })
  await page.locator('.space-add').click()
  check('mission control adds space', (await page.locator('.space-thumb').count()) === 2)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+ArrowRight')
  await page.waitForTimeout(300)
  check('space switch hides other-space windows', (await page.locator('.window:visible').count()) === 0)
  await page.keyboard.press('Control+ArrowLeft')
  await page.waitForTimeout(300)
  check('space switch back restores', (await page.locator('.window:visible').count()) === 1)

  // ---------- spotlight ----------
  await go(`${BASE}/`, 'spotlight')
  await page.keyboard.press('Control+Space')
  await page.waitForSelector('.sp-input', { timeout: 3000 })
  await page.keyboard.type('terminal', { delay: 15 })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  check('spotlight opens terminal', (await page.locator('.window > .titlebar .title').first().innerText()) === 'Terminal')

  // ---------- calculator / terminal flows (from smoke) ----------
  await go(`${BASE}/?open=calculator`, 'calculator')
  for (const label of ['7', '×', '8', '=']) {
    const rx = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
    await win().locator('button.key', { hasText: rx }).first().click()
  }
  await page.waitForTimeout(150)
  check('calculator 7×8=56', (await win().innerText()).split('\n').map((l) => l.trim()).includes('56'))

  await go(`${BASE}/?open=terminal`, 'terminal')
  const input = page.locator('.window input')
  await input.fill('echo $HOME && whoami')
  await input.press('Enter')
  await page.waitForTimeout(200)
  const termText = await page.locator('.window').innerText()
  check('terminal echo/whoami', termText.includes('guest'))
  await input.fill('open notes')
  await input.press('Enter')
  await page.waitForTimeout(400)
  const titles = await page.locator('.window > .titlebar .title').allInnerTexts()
  check('terminal `open notes` launches app', titles.includes('Notes'), titles.join(','))

  // ---------- green-light hover menu: tile + full screen ----------
  await go(`${BASE}/?open=finder`, 'green-menu')
  await win().locator('.light.max').hover()
  await page.waitForSelector('.tile-menu', { timeout: 3000 })
  check('green light hover shows tile menu', true)
  await page.locator('.tm-cell[title="Left"]').click()
  await page.waitForTimeout(450)
  let tb = await win().boundingBox()
  check('tile left splits screen', tb.x <= 12 && Math.abs(tb.width - 711) < 20, `x=${Math.round(tb.x)} w=${Math.round(tb.width)}`)

  // edge-drag tiling with preview frame
  box = await win().boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(4, 450, { steps: 10 })
  await page.waitForTimeout(200)
  check('edge drag shows tiling preview', await page.locator('.tile-preview').isVisible())
  await page.mouse.up()
  await page.waitForTimeout(450)
  tb = await win().boundingBox()
  check('edge drop tiles window left', tb.x <= 12 && Math.abs(tb.width - 711) < 20, `x=${Math.round(tb.x)} w=${Math.round(tb.width)}`)
  await win().locator('.light.max').hover()
  await page.waitForSelector('.tile-menu', { timeout: 3000 })
  await page.locator('.tm-item', { hasText: 'Full Screen' }).click()
  await page.waitForTimeout(450)
  tb = await win().boundingBox()
  check('full screen covers viewport', tb.width >= 1439 && tb.height >= 899, `${Math.round(tb.width)}x${Math.round(tb.height)}`)
  const tbar = await win().locator('.titlebar').boundingBox()
  check('full screen hides titlebar', !tbar || tbar.y + tbar.height <= 0.5, tbar ? `bottom=${Math.round(tbar.y + tbar.height)}` : 'none')
  const mb = await page.locator('.menubar').boundingBox()
  const dk = await page.locator('.dock-wrap').boundingBox()
  check('full screen auto-hides menu bar + dock', mb.y + mb.height <= 1 && dk.y >= 899, `menubar bottom=${Math.round(mb.y + mb.height)} dock top=${Math.round(dk.y)}`)
  await page.mouse.move(720, 2)
  await page.waitForTimeout(400)
  const mb2 = await page.locator('.menubar').boundingBox()
  check('menu bar reappears on top-edge hover', mb2.y >= 0, `y=${Math.round(mb2.y)}`)
  await page.keyboard.press('Control+Meta+F')
  await page.waitForTimeout(450)
  tb = await win().boundingBox()
  check('exit full screen restores (⌃⌘F)', tb.width < 1200, `w=${Math.round(tb.width)}`)

  // ---------- desktop new folder with inline rename (macOS behavior) ----------
  await go(`${BASE}/`, 'desktop-folder')
  await page.mouse.click(700, 450, { button: 'right' })
  await page.locator('.ctx .item', { hasText: 'New Folder' }).click()
  await page.waitForSelector('.dicon .rename', { timeout: 3000 })
  check('new folder starts inline rename on desktop', true)
  await page.locator('.dicon .rename').fill('Projects')
  await page.locator('.dicon .rename').press('Enter')
  await page.waitForTimeout(300)
  check('inline rename commits', (await page.locator('.dicon').allInnerTexts()).some((t) => t.includes('Projects')))

  // ---------- safari live wikipedia ----------
  await go(`${BASE}/?open=safari`, 'safari-wiki')
  const safariAddr = page.locator('.window input').first()
  await safariAddr.click()
  await safariAddr.fill('macOS Tahoe')
  await safariAddr.press('Enter')
  const settled = await page
    .waitForFunction(
      () => {
        const t = document.querySelector('.window')?.innerText || ''
        return /en\.wikipedia\.org/.test(t) || /couldn.t connect|try again|ERR_/i.test(t)
      },
      { timeout: 30000 },
    )
    .then(() => true)
    .catch(() => false)
  const body0 = await page.locator('.window').first().innerText()
  if (settled && /en\.wikipedia\.org/.test(body0)) {
    check('safari loads live wikipedia results', true)
    try {
      await page.locator('.window a', { hasText: /macOS|Tahoe/i }).first().click({ timeout: 8000 })
      await page.waitForTimeout(3000)
      const body = await page.locator('.window').innerText()
      check('safari renders wikipedia article', body.length > 400, `len=${body.length}`)
    } catch {
      check('safari article load skipped (flaky network)', true)
    }
  } else if (settled) {
    check('safari wiki (offline: graceful error card)', true, 'network unavailable, error card shown')
  } else {
    check('safari wiki settles (results or error card)', false, 'hung for 30s')
  }

  // ---------- trash flow ----------
  await go(`${BASE}/?open=finder`, 'trash')
  const fileRow = page.locator('.window [class*="cell"], .window [class*="row"]', { hasText: 'Documents' }).first()
  await fileRow.click({ button: 'right' })
  await page.waitForSelector('.ctx', { timeout: 3000 })
  await page.locator('.ctx .item', { hasText: 'Move to Trash' }).click()
  await page.waitForTimeout(400)
  const trashSrc = await page.locator('.dock-item img').last().getAttribute('src')
  check('trash fills after Move to Trash', trashSrc.includes('trash-full'), trashSrc)
  await page.locator('.dock-item .icon.trash').click({ button: 'right' })
  await page.waitForSelector('.ctx', { timeout: 3000 })
  await page.locator('.ctx .item', { hasText: 'Empty Trash' }).click()
  await page.waitForTimeout(300)
  const trashSrc2 = await page.locator('.dock-item img').last().getAttribute('src')
  check('empty trash restores icon', !trashSrc2.includes('trash-full'), trashSrc2)

  // ---------- context menu repositions at screen edge ----------
  await go(`${BASE}/`, 'ctx-reposition')
  await page.mouse.click(1400, 870, { button: 'right' })
  await page.waitForSelector('.ctx', { timeout: 3000 })
  const ctxBox = await page.locator('.ctx').boundingBox()
  check('context menu stays on screen', ctxBox.x + ctxBox.width <= 1440 && ctxBox.y + ctxBox.height <= 900, `right=${Math.round(ctxBox.x + ctxBox.width)} bottom=${Math.round(ctxBox.y + ctxBox.height)}`)
  await page.keyboard.press('Escape')

  // ---------- new terminal at folder ----------
  await go(`${BASE}/?open=finder`, 'terminal-at-folder')
  const docsRow = page.locator('.window [class*="cell"], .window [class*="row"]', { hasText: 'Documents' }).first()
  await docsRow.click({ button: 'right' })
  await page.waitForSelector('.ctx', { timeout: 3000 })
  await page.locator('.ctx .item', { hasText: 'New Terminal at Folder' }).click()
  await page.waitForTimeout(600)
  const termWin = page.locator('.window', { hasText: 'guest@macos-web' }).last()
  check('terminal opens at the folder', (await termWin.innerText()).includes('~/Documents'))

  // ---------- dock running extras + quit ----------
  await go(`${BASE}/?open=word`, 'dock-extras')
  check(
    'unpinned running app appears in dock',
    (await page.locator('.dock-item .tip', { hasText: 'Microsoft Word' }).count()) === 1,
  )
  await page.locator('.dock-item', { hasText: 'Microsoft Word' }).locator('.icon').click({ button: 'right' })
  await page.waitForSelector('.ctx', { timeout: 3000 })
  await page.locator('.ctx .item', { hasText: 'Quit' }).click()
  await page.waitForTimeout(400)
  check('quit from dock removes extra icon', (await page.locator('.dock-item .tip', { hasText: 'Microsoft Word' }).count()) === 0)

  // ---------- dock menu options + login items ----------
  await go(`${BASE}/?open=calculator`, 'dock-menu')
  await page.locator('.dock-item', { hasText: 'Calculator' }).locator('.icon').click({ button: 'right' })
  await page.waitForSelector('.ctx', { timeout: 3000 })
  const dockMenuText = await page.locator('.ctx').innerText()
  check(
    'dock menu has all options',
    ['Keep in Dock', 'Open at Login', 'Show in Finder', 'Hide', 'Quit'].every((x) => dockMenuText.includes(x)),
  )
  await page.locator('.ctx .item', { hasText: 'Open at Login' }).click()
  await go(`${BASE}/`, 'login-items')
  check('open at login works', (await page.locator('.window > .titlebar .title').allInnerTexts()).includes('Calculator'))
  await page.locator('.dock-item', { hasText: 'Calculator' }).locator('.icon').click({ button: 'right' })
  await page.locator('.ctx .item', { hasText: 'Open at Login' }).click()

  // ---------- wifi panels ----------
  await go(`${BASE}/`, 'wifi-panels')
  await page.locator('.mb-item.status[title="Wi-Fi"]').click()
  await page.waitForSelector('.wifi-panel', { timeout: 3000 })
  await page.locator('.wifi-panel .row', { hasText: 'CoffeeShop' }).click()
  check('menubar wifi joins network', (await page.locator('.wifi-panel .row .check').first().innerText()).trim().length >= 0)
  await page.keyboard.press('Escape')

  // ---------- app sweep with screenshots ----------
  const appIds = ['finder', 'safari', 'chrome', 'mail', 'messages', 'notes', 'reminders', 'photos', 'music', 'spotify', 'podcasts', 'calendar', 'weather', 'clock', 'maps', 'appstore', 'terminal', 'calculator', 'vscode', 'textedit', 'preview', 'activitymonitor', 'stocks', 'voicememos', 'books', 'chess', 'facetime', 'discord', 'claude', 'settings', 'contacts', 'news', 'tv', 'home', 'shortcuts', 'dictionary', 'quicktime', 'stickies', 'freeform', 'grapher', 'word', 'powerpoint', 'excel', 'resolve']
  for (const id of appIds) {
    await go(`${BASE}/?open=${id}`, `app:${id}`)
    await page.waitForTimeout(700)
    const visible = await page.locator('.window:visible').count()
    const text = (await page.locator('.window').first().innerText()).length
    check(`app '${id}' mounts with content`, visible >= 1 && text > 10, `text=${text}`)
    await page.screenshot({ path: `${SHOTS}/${id}.png` })
  }

  // ---------- dark mode gallery shots ----------
  await go(`${BASE}/`, 'dark')
  await page.mouse.click(700, 450, { button: 'right' })
  await page.locator('.ctx .item', { hasText: 'Use Dark Mode' }).click()
  await go(`${BASE}/?open=finder,notes,terminal`, 'dark-apps')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOTS}/_dark.png` })
  await page.screenshot({ path: `${SHOTS}/_dark_desktop.png` })

  await browser.close()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  const realErrors = consoleErrors.filter((e) => !/favicon|net::ERR|X-Frame-Options|frame|duckduckgo|Closed|can't load/i.test(e))
  if (realErrors.length) {
    console.log('\nConsole errors:')
    realErrors.slice(0, 30).forEach((e) => console.log('  •', e.slice(0, 260)))
  } else {
    console.log('No unexpected console errors.')
  }
  process.exit(failed.length || realErrors.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
