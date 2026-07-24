// Activity Monitor simulation engine.
// Seed process table + a 1-second random-walk model: each process drifts back
// toward its baseline %CPU with noise, and occasionally spikes. CPU time
// accumulates at cpu%/100 seconds per tick, like a real sampler.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const rnd = (lo, hi) => lo + Math.random() * (hi - lo)

// name, cat, pid, cpu: baseline %, vol: jitter amplitude, spike: chance of a
// cpu burst per tick, threads: base thread count, mem: baseline MB
// cat drives the tint of the generic app-window icon (like real macOS, which
// shows a neutral generic icon for processes without a bundle icon).
export const CAT_COLORS = {
  system: '#8e8e93',
  ui: '#64d2ff',
  app: '#0a84ff',
}

// Well-known processes get their real app icon; everything else keeps the
// neutral gray system glyph (like real macOS for processes w/o a bundle icon).
const ICON_MAP = {
  Music: '/icons/music.png',
  Safari: '/icons/safari.png',
  'Safari Web Content': '/icons/safari.png',
  Discord: '/icons/discord.svg',
  code: '/icons/vscode.png',
  'Google Chrome Helper': '/icons/chrome.png',
  Terminal: '/icons/terminal.png',
  Notes: '/icons/notes.png',
  Finder: '/icons/finder.png',
  'Control Center': '/icons/settings.png',
}
export const procIcon = (name) => ICON_MAP[name] || null

const SEED = [
  { name: 'kernel_task', cat: 'system', pid: 0, cpu: 4.5, vol: 2.5, spike: 0.03, threads: 412, mem: 918 },
  { name: 'launchd', cat: 'system', pid: 1, cpu: 0.1, vol: 0.1, spike: 0.01, threads: 4, mem: 12 },
  { name: 'WindowServer', cat: 'system', pid: 134, cpu: 9, vol: 4.5, spike: 0.06, threads: 18, mem: 214 },
  { name: 'loginwindow', cat: 'system', pid: 98, cpu: 0.2, vol: 0.2, spike: 0.01, threads: 12, mem: 47 },
  { name: 'SystemUIServer', cat: 'system', pid: 322, cpu: 0.4, vol: 0.4, spike: 0.02, threads: 9, mem: 58 },
  { name: 'Dock', cat: 'system', pid: 318, cpu: 0.3, vol: 0.3, spike: 0.02, threads: 9, mem: 74 },
  { name: 'Finder', cat: 'ui', pid: 341, cpu: 0.6, vol: 0.7, spike: 0.03, threads: 13, mem: 96 },
  { name: 'Control Center', cat: 'ui', pid: 356, cpu: 0.1, vol: 0.1, spike: 0.01, threads: 6, mem: 41 },
  { name: 'coreaudiod', cat: 'system', pid: 151, cpu: 1.1, vol: 1.3, spike: 0.04, threads: 14, mem: 33 },
  { name: 'bluetoothd', cat: 'system', pid: 129, cpu: 0.1, vol: 0.1, spike: 0.01, threads: 5, mem: 17 },
  { name: 'powerd', cat: 'system', pid: 112, cpu: 0.1, vol: 0.1, spike: 0.01, threads: 4, mem: 9 },
  { name: 'mds', cat: 'system', pid: 167, cpu: 0.6, vol: 0.8, spike: 0.03, threads: 11, mem: 61 },
  { name: 'mds_stores', cat: 'system', pid: 168, cpu: 1.6, vol: 2.2, spike: 0.05, threads: 8, mem: 46 },
  { name: 'cfprefsd', cat: 'system', pid: 141, cpu: 0.1, vol: 0.1, spike: 0.01, threads: 3, mem: 10 },
  { name: 'cloudd', cat: 'system', pid: 402, cpu: 0.4, vol: 0.5, spike: 0.02, threads: 8, mem: 29 },
  { name: 'bird', cat: 'system', pid: 388, cpu: 0.3, vol: 0.4, spike: 0.02, threads: 7, mem: 25 },
  { name: 'photolibraryd', cat: 'system', pid: 421, cpu: 0.5, vol: 0.6, spike: 0.02, threads: 9, mem: 84 },
  { name: 'softwareupdated', cat: 'system', pid: 187, cpu: 0.2, vol: 0.3, spike: 0.02, threads: 6, mem: 27 },
  { name: 'terminald', cat: 'system', pid: 203, cpu: 0.2, vol: 0.3, spike: 0.02, threads: 5, mem: 14 },
  { name: 'Safari', cat: 'app', pid: 812, cpu: 3.2, vol: 3, spike: 0.06, threads: 23, mem: 428 },
  { name: 'Safari Web Content', cat: 'app', pid: 815, cpu: 2.6, vol: 3.2, spike: 0.07, threads: 15, mem: 382 },
  { name: 'Google Chrome Helper', cat: 'app', pid: 903, cpu: 5.5, vol: 6, spike: 0.08, threads: 19, mem: 344 },
  { name: 'code', cat: 'app', pid: 1024, cpu: 4.2, vol: 4.5, spike: 0.06, threads: 31, mem: 786 },
  { name: 'Discord', cat: 'app', pid: 977, cpu: 1.6, vol: 1.8, spike: 0.04, threads: 25, mem: 312 },
  { name: 'Terminal', cat: 'app', pid: 1102, cpu: 0.3, vol: 0.4, spike: 0.02, threads: 6, mem: 37 },
  { name: 'Music', cat: 'app', pid: 1190, cpu: 0.6, vol: 0.8, spike: 0.02, threads: 11, mem: 122 },
  { name: 'Mail', cat: 'app', pid: 1215, cpu: 0.3, vol: 0.4, spike: 0.02, threads: 9, mem: 148 },
  { name: 'Notes', cat: 'app', pid: 1233, cpu: 0.2, vol: 0.3, spike: 0.01, threads: 6, mem: 91 },
]

export function createProcesses() {
  return SEED.map((s) => ({
    name: s.name,
    cat: s.cat,
    pid: s.pid,
    baseCpu: s.cpu,
    vol: s.vol,
    spikeChance: s.spike,
    cpu: s.cpu + rnd(-s.vol, s.vol) * 0.5,
    cpuTime: rnd(2, 4200), // seconds of accumulated CPU time
    threadsBase: s.threads,
    threads: s.threads,
    memBase: s.mem,
    mem: s.mem * rnd(0.9, 1.1),
    spiking: 0, // ticks remaining in the current burst
  }))
}

export function tickProcesses(list) {
  for (const p of list) {
    // mean-reverting random walk, with occasional multi-tick bursts
    if (p.spiking > 0) {
      p.spiking--
    } else if (Math.random() < p.spikeChance) {
      p.spiking = 1 + Math.floor(Math.random() * 4)
    }
    const burst = p.spiking > 0 ? rnd(6, 30) : 0
    const target = p.baseCpu + burst
    p.cpu += (target - p.cpu) * 0.4 + (Math.random() - 0.5) * p.vol
    p.cpu = clamp(p.cpu, 0, 99.9)
    p.cpuTime += p.cpu / 100

    if (Math.random() < 0.12) p.threads = Math.max(1, p.threadsBase + Math.round(rnd(-2, 2)))

    p.mem += (p.memBase - p.mem) * 0.05 + (Math.random() - 0.5) * p.memBase * 0.04
    p.mem = clamp(p.mem, p.memBase * 0.55, p.memBase * 1.7)
  }
}

// ---- machine-wide stats (CPU load split, memory pressure, disk, network) ----

export function createSysStats(processes) {
  const appMem = processes.reduce((a, p) => a + p.mem, 0) / 1024 // GB
  return {
    user: 11,
    system: 6,
    memTotal: 16, // GB
    appMem,
    wired: 1.6,
    compressed: 1.15,
    swap: 0.4,
    pressure: 0.22, // 0..1
    battery: 87,
    diskRead: 1.8, // MB/s
    diskWrite: 0.9,
    diskReadTotal: 12.4, // GB
    diskWriteTotal: 8.1,
    netIn: 320, // KB/s
    netOut: 46,
    netInTotal: 4.7, // GB
    netOutTotal: 1.2,
  }
}

export function tickSysStats(s, processes) {
  // loosely couple the load split to what the table is doing
  const total = processes.reduce((a, p) => a + p.cpu, 0)
  const target = clamp(total * 0.62, 7, 88)
  const combined = clamp(s.user + s.system + (target - (s.user + s.system)) * 0.25 + rnd(-2.5, 2.5), 3, 96)
  const userRatio = clamp(0.66 + rnd(-0.08, 0.08), 0.4, 0.85)
  s.user = combined * userRatio
  s.system = combined * (1 - userRatio)

  s.appMem = processes.reduce((a, p) => a + p.mem, 0) / 1024
  s.wired = clamp(s.wired + rnd(-0.03, 0.03), 1.2, 2.1)
  s.compressed = clamp(s.compressed + rnd(-0.04, 0.04), 0.7, 1.9)
  s.swap = clamp(s.swap + rnd(-0.02, 0.02), 0, 1.2)
  const used = s.appMem + s.wired + s.compressed
  const pTarget = clamp(used / s.memTotal - 0.28 + rnd(-0.02, 0.02), 0.06, 0.9)
  s.pressure = clamp(s.pressure + (pTarget - s.pressure) * 0.2, 0.05, 0.95)

  s.diskRead = clamp(s.diskRead + rnd(-0.9, 0.9), 0.1, 24)
  s.diskWrite = clamp(s.diskWrite + rnd(-0.5, 0.5), 0.05, 12)
  s.diskReadTotal += s.diskRead / 1024
  s.diskWriteTotal += s.diskWrite / 1024
  s.netIn = clamp(s.netIn + rnd(-140, 140), 2, 4200)
  s.netOut = clamp(s.netOut + rnd(-22, 22), 1, 900)
  s.netInTotal += s.netIn / 1048576
  s.netOutTotal += s.netOut / 1048576
}

// ---- formatters ----

export function fmtCpuTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`
}

export function fmtMem(mb) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`
}

export function fmtGB(gb) {
  return `${gb.toFixed(2)} GB`
}

export function fmtRate(mbPerSec) {
  if (mbPerSec >= 1) return `${mbPerSec.toFixed(1)} MB/s`
  return `${Math.round(mbPerSec * 1024)} KB/s`
}

export function fmtKBRate(kb) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB/s`
  return `${Math.round(kb)} KB/s`
}
