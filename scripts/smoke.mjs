// Interaction smoke test: drives the real UI in headless Chrome via playwright-core.
// Usage: npm run smoke  (requires the dev server on :5173 or a URL arg)
import { chromium } from 'playwright-core'

const BASE = process.argv[2] || 'http://localhost:5173'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const results = []
const consoleErrors = []
let page

function check(name, ok, extra = '') {
  results.push({ name, ok })
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`)
  return ok
}

async function waitBoot() {
  await page.waitForSelector('.boot', { state: 'detached', timeout: 15000 })
  await page.waitForSelector('.menubar', { timeout: 5000 })
}

async function openAndRun(url, fn) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitBoot()
  await fn()
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))

  // 1. Boot + desktop
  await openAndRun(`${BASE}/`, async () => {
    check('boots to desktop', await page.locator('.dock').isVisible())
    check('menu bar shows Finder menus', (await page.locator('.menubar').innerText()).includes('Finder'))
    check('dock has 15+ icons', (await page.locator('.dock-item').count()) >= 15)
  })

  // 2. Dock click opens Finder
  await page.locator('.dock-item .icon').first().click()
  await page.waitForSelector('.window', { timeout: 4000 })
  check('clicking Finder dock icon opens a window', (await page.locator('.window .title').first().innerText()) === 'Finder')

  // 3. Calculator arithmetic
  await openAndRun(`${BASE}/?open=calculator`, async () => {
    const win = page.locator('.window')
    for (const label of ['2', '+', '3', '=']) {
      const rx = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
      await win.locator('button.key', { hasText: rx }).first().click()
    }
    await page.waitForTimeout(150)
    const lines = (await win.innerText()).split('\n').map((l) => l.trim())
    check('calculator computes 2+3=5', lines.includes('5'), JSON.stringify(lines.slice(0, 6)))
  })

  // 4. Terminal: neofetch + tab completion-ish command
  await openAndRun(`${BASE}/?open=terminal`, async () => {
    const input = page.locator('.window input')
    await input.click()
    await input.fill('neofetch')
    await input.press('Enter')
    await page.waitForTimeout(300)
    const text = await page.locator('.window').innerText()
    check('terminal runs neofetch', /macOS Tahoe|Darwin|Guest/i.test(text))
    await input.fill('ls Doc')
    await input.press('Tab')
    await page.waitForTimeout(150)
    const val = await input.inputValue()
    check('terminal tab-completes paths', /Documents/.test(val), `value=${val}`)
    await input.press('Enter')
    await page.waitForTimeout(200)
    check('terminal lists Documents', (await page.locator('.window').innerText()).includes('Notes.md'))
  })

  // 5. Spotlight via keyboard
  await openAndRun(`${BASE}/`, async () => {
    await page.keyboard.press('Control+Space')
    await page.waitForSelector('.sp-input', { timeout: 3000 })
    await page.keyboard.type('safari', { delay: 20 })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    const titles = await page.locator('.window .title').allInnerTexts()
    check('spotlight opens Safari', titles.includes('Safari'), titles.join(','))
  })

  // 6. Mission Control + spaces
  await openAndRun(`${BASE}/?open=finder,notes,calculator`, async () => {
    await page.keyboard.press('Control+ArrowUp')
    await page.waitForSelector('.mc', { timeout: 3000 })
    check('mission control shows windows', (await page.locator('.mc-win').count()) === 3)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    check('escape closes mission control', (await page.locator('.mc').count()) === 0)
  })

  // 7. Sample the new apps: open each via URL, check window mounts without errors
  const appIds = ['mail', 'messages', 'maps', 'weather', 'clock', 'reminders', 'textedit', 'preview', 'activitymonitor', 'stocks', 'voicememos', 'podcasts', 'books', 'chess', 'facetime', 'appstore', 'photos', 'music', 'calendar', 'settings', 'discord', 'vscode', 'notes', 'finder']
  for (const id of appIds) {
    await openAndRun(`${BASE}/?open=${id}`, async () => {
      const n = await page.locator('.window').count()
      check(`app '${id}' mounts`, n >= 1)
    })
  }

  // 8. Screenshot gallery
  await openAndRun(`${BASE}/?open=finder,weather,terminal,calculator`, async () => {
    await page.screenshot({ path: '/tmp/smoke-final.png' })
  })

  await browser.close()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  const realErrors = consoleErrors.filter((e) => !/favicon|net::ERR|X-Frame-Options|frame|duckduckgo/i.test(e))
  if (realErrors.length) {
    console.log('\nConsole errors:')
    realErrors.slice(0, 20).forEach((e) => console.log('  •', e.slice(0, 300)))
  }
  check('no unexpected console errors', realErrors.length === 0, `${realErrors.length} errors`)
  process.exit(failed.length || realErrors.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
