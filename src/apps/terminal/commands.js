// Command implementations for Terminal.app. App.vue owns the shell state
// (cwd, output lines, history, stores) and passes a small context object
// to createCommands() so this module stays UI-free.

import { HOME, getNode, listDir, exists, writeFile, makeDir, remove } from '../../fs'
import { apps } from '../index'
import { HELP, createExtraCommands } from './extraCommands'

// Inline style used for directory names in ls / completion listings.
// The terminal uses a fixed light "Basic" profile, so a fixed blue is fine.
export const DIR_STYLE = 'color:#2456c8;font-weight:700'

// ----- date helpers -----------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad2 = (n) => String(n).padStart(2, '0')

function tzName(d) {
  const m = d.toString().match(/\(([^)]+)\)/)
  return m ? m[1].split(/\s+/).map((w) => w[0]).join('') : 'GMT'
}

export function macDate(d = new Date()) {
  return (
    `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${tzName(d)} ${d.getFullYear()}`
  )
}

function lsDate(d = new Date()) {
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, ' ')} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

// ----- fake process table (shared by ps / top / kill) -------------------------

const FAKE_PROCS = [
  { pid: 1, tty: '??', time: '0:03.12', cmd: '/sbin/launchd' },
  { pid: 87, tty: '??', time: '0:41.20', cmd: '/usr/libexec/logd' },
  { pid: 143, tty: '??', time: '0:12.87', cmd: '/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder' },
  { pid: 188, tty: '??', time: '0:42.03', cmd: '/System/Library/CoreServices/Dock.app/Contents/MacOS/Dock' },
  { pid: 241, tty: '??', time: '0:05.66', cmd: '/usr/sbin/syslogd' },
  { pid: 412, tty: '??', time: '1:23.45', cmd: 'WindowServer -daemon' },
  { pid: 512, tty: 'ttys000', time: '0:00.12', cmd: '-zsh' },
]

// `ls -l` columns preceding the file name.
function longPrefix(node) {
  const isDir = node.type === 'dir'
  const names = isDir ? Object.keys(node.children) : []
  const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--'
  const links = isDir ? 2 + names.filter((n) => node.children[n].type === 'dir').length : 1
  const size = isDir ? (names.length + 2) * 32 : node.content.length
  return `${perms}  ${String(links).padStart(2)} guest  staff  ${String(size).padStart(6)} ${lsDate()} `
}

// ----- command factory ----------------------------------------------------------

// ctx: { cwd, out, outSeg, resolve, clearScreen, system, windows, windowId, bootTime }
export function createCommands(ctx) {
  const { cwd, out, outSeg, resolve } = ctx

  const cmds = {
    help() {
      const width = Math.max(...HELP.map(([usage]) => usage.length))
      const rows = HELP.map(([usage, desc]) => `  ${usage.padEnd(width)}  ${desc}`)
      out(['Available commands:', ...rows, '', 'Tip: press Tab to complete command names and file paths.'].join('\n'))
    },

    ls(args) {
      const long = args.includes('-l')
      const target = args.find((a) => !a.startsWith('-'))
      const p = target ? resolve(target) : cwd.value
      const node = getNode(p)
      if (!node) return out(`ls: ${target || p}: No such file or directory`)
      if (node.type === 'file') {
        const name = p.slice(p.lastIndexOf('/') + 1)
        return out(long ? longPrefix(node) + name : name)
      }
      const items = listDir(p)
      if (!items.length) return
      if (!long) {
        const row = []
        items.forEach((i, idx) => {
          row.push({ text: i.name, style: i.type === 'dir' ? DIR_STYLE : '' })
          if (idx < items.length - 1) row.push({ text: '  ' })
        })
        return outSeg([row])
      }
      const blocks = items.reduce((sum, i) => {
        const n = getNode(p === '/' ? `/${i.name}` : `${p}/${i.name}`)
        return sum + (n.type === 'file' ? Math.max(1, Math.ceil(n.content.length / 512)) : 0)
      }, 0)
      const rows = [[{ text: `total ${blocks * 8}` }]]
      for (const i of items) {
        const n = getNode(p === '/' ? `/${i.name}` : `${p}/${i.name}`)
        rows.push([{ text: longPrefix(n) }, { text: i.name, style: i.type === 'dir' ? DIR_STYLE : '' }])
      }
      outSeg(rows)
    },

    cd(args) {
      const arg = args[0]
      if (!arg) {
        cwd.value = HOME
        return
      }
      const p = resolve(arg)
      const node = getNode(p)
      if (!node) return out(`cd: no such file or directory: ${arg}`)
      if (node.type !== 'dir') return out(`cd: not a directory: ${arg}`)
      cwd.value = p
    },

    pwd() {
      out(cwd.value)
    },

    cat(args) {
      if (!args.length) return out('usage: cat <file>')
      for (const arg of args) {
        const p = resolve(arg)
        const node = getNode(p)
        if (!node) out(`cat: ${arg}: No such file or directory`)
        else if (node.type === 'dir') out(`cat: ${arg}: Is a directory`)
        else out(node.content.replace(/\n+$/, ''))
      }
    },

    echo(args) {
      out(args.join(' '))
    },

    clear() {
      ctx.clearScreen()
    },

    date() {
      out(macDate())
    },

    whoami() {
      out('guest')
    },

    uname(args) {
      out(
        args.includes('-a')
          ? 'Darwin macos-web 25.0.0 Darwin Kernel Version 25.0.0: Mon Jun  2 20:12:30 PDT 2025; root:xnu-11215.101.1~1/RELEASE_ARM64_T6030 arm64'
          : 'Darwin',
      )
    },

    hostname() {
      out('macos-web')
    },

    open(args) {
      const id = args[0]
      if (!id) return out('usage: open <app>')
      if (!apps[id]) {
        out(`The application ${id} does not exist.`)
        out(`Available apps: ${Object.keys(apps).sort().join(', ')}`)
        return
      }
      ctx.windows.openApp(id)
    },

    mkdir(args) {
      if (!args.length) return out('usage: mkdir <directory>')
      for (const arg of args) {
        const p = resolve(arg)
        if (exists(p)) out(`mkdir: ${arg}: File exists`)
        else if (!makeDir(p)) out(`mkdir: ${arg}: No such file or directory`)
      }
    },

    touch(args) {
      if (!args.length) return out('usage: touch <file>')
      for (const arg of args) {
        const p = resolve(arg)
        if (exists(p)) continue
        if (!writeFile(p, '')) out(`touch: ${arg}: No such file or directory`)
      }
    },

    rm(args) {
      const recursive = args.some((a) => a.startsWith('-') && a.includes('r'))
      const targets = args.filter((a) => !a.startsWith('-'))
      if (!targets.length) return out('usage: rm [-r] <path>')
      for (const arg of targets) {
        const p = resolve(arg)
        const node = getNode(p)
        if (!node || p === '/') out(`rm: ${arg}: No such file or directory`)
        else if (node.type === 'dir' && !recursive) out(`rm: ${arg}: is a directory`)
        else remove(p)
      }
    },

    sudo(args) {
      if (!args.length) return out('usage: sudo <command>')
      out('guest is not in the sudoers file. This incident will be reported.')
    },

    ps() {
      const row = (pid, tty, time, cmd) => `${String(pid).padStart(5)} ${tty.padEnd(8)}${time.padStart(8)} ${cmd}`
      const rows = [row('PID', 'TTY', 'TIME', 'CMD')]
      for (const p of FAKE_PROCS) rows.push(row(p.pid, p.tty, p.time, p.cmd))
      rows.push(row(573, 'ttys000', '0:00.01', 'ps'))
      out(rows.join('\n'))
    },

    top() {
      const d = new Date()
      const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
      out(
        [
          `Processes: 348 total, 2 running, 346 sleeping, 1612 threads          ${time}`,
          'Load Avg: 1.92, 2.04, 2.11  CPU usage: 5.26% user, 8.42% sys, 86.31% idle',
          'SharedLibs: 471M resident, 61M data, 45M linkedit.',
          'MemRegions: 71204 total, 3412M resident, 142M private, 1683M shared.',
          'PhysMem: 14G used (2112M wired, 1842M compressor), 1624M unused.',
          'VM: 391G vsize, 2341M framework vsize, 0(0) swapins, 0(0) swapouts.',
          'Networks: packets 1204813/924M in, 812442/146M out.',
          'Disks: 512304/13G read, 204812/9G written.',
          '',
          'PID    COMMAND          %CPU TIME     #TH  #PORT MEM    PURG CMPRS  PPID STATE',
          '412    WindowServer     14.2 01:24.31 8    612   428M   14M  0B     1    sleeping',
          '512    zsh              0.0  00:00.12 1    44    21M    0B   0B     511  sleeping',
          '143    Finder           0.0  00:12.87 5    281   142M   4M   0B     1    sleeping',
          '188    Dock             0.0  00:42.03 4    244   121M   3M   0B     1    sleeping',
          '87     logd             0.0  00:41.20 3    122   18M    0B   0B     1    sleeping',
          '241    syslogd          0.0  00:05.66 2    88    12M    0B   0B     1    sleeping',
          '1      launchd          0.0  00:03.12 3    1542  42M    0B   0B     0    sleeping',
        ].join('\n'),
      )
    },

    kill(args) {
      const pid = parseInt(args.find((a) => !a.startsWith('-')), 10)
      if (!args.length || Number.isNaN(pid)) return out('usage: kill [-signal] <pid>')
      if (pid === 1) return out('kill: 1: Operation not permitted')
      if (FAKE_PROCS.some((p) => p.pid === pid)) return // success is silent
      out(`kill: kill ${pid} failed: no such process`)
    },

    env() {
      out(
        [
          'TERM=xterm-256color',
          'COLORTERM=truecolor',
          'TERM_PROGRAM=macos-web',
          'SHELL=/bin/zsh',
          'USER=guest',
          'LOGNAME=guest',
          `HOME=${HOME}`,
          `PWD=${cwd.value}`,
          'PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
          'LANG=en_US.UTF-8',
          'LC_ALL=en_US.UTF-8',
          'SHLVL=1',
          '_=/usr/bin/env',
        ].join('\n'),
      )
    },

    say(args) {
      if (!args.length) return out('usage: say <text>')
      out(`💬 “${args.join(' ')}”`)
    },

    pbcopy(args) {
      if (!args.length) return out('usage: pbcopy <file>')
      const p = resolve(args[0])
      const node = getNode(p)
      if (!node) return out(`pbcopy: ${args[0]}: No such file or directory`)
      if (node.type === 'dir') return out(`pbcopy: ${args[0]}: Is a directory`)
      ctx.system.clipboard = node.content
    },

    pbpaste() {
      if (ctx.system.clipboard) out(ctx.system.clipboard.replace(/\n+$/, ''))
    },

    exit() {
      if (ctx.windowId != null) ctx.windows.closeWindow(ctx.windowId)
    },

    neofetch() {
      const logo = [
        "                    'c.",
        '                 ,xNMM.',
        '               .OMMMMo',
        '               OMMM0,',
        "     .;loddo:' loolloddol;.",
        '   cKMMMMMMMMMMNWMMMMMMMMMM0:',
        ' .KMMMMMMMMMMMMMMMMMMMMMMMWd.',
        ' XMMMMMMMMMMMMMMMMMMMMMMMX.',
        ';MMMMMMMMMMMMMMMMMMMMMMMM:',
        ':MMMMMMMMMMMMMMMMMMMMMMMM:',
        '.MMMMMMMMMMMMMMMMMMMMMMMMX.',
        ' kMMMMMMMMMMMMMMMMMMMMMMMMWd.',
        ' .XMMMMMMMMMMMMMMMMMMMMMMMMMMk',
        '  .XMMMMMMMMMMMMMMMMMMMMMMMMK.',
        '    kMMMMMMMMMMMMMMMMMMMMMMd',
        '     ;KMMMMMMMWXXWMMMMMMMk.',
        '       .cooc,.    .,coo:.',
      ]
      const uptimeMin = Math.max(1, Math.round((Date.now() - ctx.bootTime) / 60000))
      const info = [
        'guest@macos-web',
        '---------------',
        'OS: macOS Tahoe 26.0 arm64',
        'Host: MacBook Pro M4',
        'Kernel: 25.0.0',
        `Uptime: ${uptimeMin} min`,
        'Shell: zsh',
        'DE: Aqua',
        'Terminal: macos-web',
      ]
      const width = Math.max(...logo.map((l) => l.length)) + 3
      const rows = Math.max(logo.length, info.length)
      const text = []
      for (let i = 0; i < rows; i++) {
        text.push((logo[i] || '').padEnd(width) + (info[i] || ''))
      }
      out(text.join('\n'))
    },
  }
  // grep, find, wc, head, tail, sort, history, which, man, alias, ll, ping,
  // curl, df, chmod, chown, ln — see extraCommands.js. Passed the command map
  // so `ll` can delegate to `ls` and `which` can look up known commands.
  Object.assign(cmds, createExtraCommands(ctx, cmds))
  return cmds
}
