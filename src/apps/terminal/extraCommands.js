// Extra command implementations for Terminal.app: text utilities (grep, wc,
// head, tail, sort), session introspection (history, which, man, alias) and
// simulated system/network tools (ping, curl, df). Everything runs against
// the virtual file system in src/fs — no real network or disk access happens.

import { getNode } from '../../fs'

// [usage, one-line description] for every supported command. Drives both the
// `help` listing (rendered in commands.js) and `man <cmd>` lookups below.
export const HELP = [
  ['help', 'Show this help'],
  ['ls [-l] [path]', 'List directory contents'],
  ['ll', 'Alias for ls -l'],
  ['cd [path]', 'Change directory (supports ~ and ..)'],
  ['pwd', 'Print working directory'],
  ['cat <file>', 'Print file contents'],
  ['grep [-i] <pattern> <file>', 'Print lines matching a pattern'],
  ['head [-n N] <file>', 'Print the first N lines (default 10)'],
  ['tail [-n N] <file>', 'Print the last N lines (default 10)'],
  ['sort <file>', 'Print lines sorted alphabetically'],
  ['wc <file>', 'Print line, word and character counts'],
  ['find [path]', 'List all paths under a directory, recursively'],
  ['echo [text...]', 'Print text'],
  ['mkdir <dir>', 'Create a directory'],
  ['touch <file>', 'Create an empty file'],
  ['rm [-r] <path>', 'Remove a file or directory'],
  ['ln', 'Make links (not supported here)'],
  ['chmod <mode> <file>', 'Change permissions (no-op)'],
  ['chown <user> <file>', 'Change ownership (no-op)'],
  ['alias', 'List command aliases'],
  ['history', 'Show command history'],
  ['which <cmd>', 'Locate a command'],
  ['man <cmd>', 'Show a one-line summary of a command'],
  ['open <app>', 'Open an app (e.g. open finder)'],
  ['pbcopy <file>', 'Copy file contents to the clipboard'],
  ['pbpaste', 'Print clipboard contents'],
  ['ps', 'Show process list'],
  ['top', 'Show a snapshot of system activity'],
  ['kill <pid>', 'Terminate a process'],
  ['df [-h]', 'Show disk usage'],
  ['ping <host>', 'Ping a host (simulated)'],
  ['curl <url>', 'Fetch a URL (simulated, no real network)'],
  ['env', 'Print environment variables'],
  ['say <text>', 'Speak some text'],
  ['sudo <cmd>', 'Run a command as root (good luck)'],
  ['date', 'Show current date and time'],
  ['whoami', 'Print current user'],
  ['uname [-a]', 'Print system information'],
  ['hostname', 'Print host name'],
  ['clear', 'Clear the screen'],
  ['neofetch', 'Show system info'],
  ['exit', 'Close this terminal window'],
]

// Small string hash used to make ping/curl output stable per argument.
function strHash(s) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

// cmds is the full command map (from commands.js), used by ll / which.
export function createExtraCommands(ctx, cmds) {
  const { out, resolve } = ctx

  // Split "a\nb\n" into ['a', 'b'] — the fragment after a trailing newline
  // is not a line.
  function toLines(content) {
    const lines = content.split('\n')
    if (lines.length && lines[lines.length - 1] === '') lines.pop()
    return lines
  }

  // Read a file argument, printing a real-tool-style error on failure.
  function readTarget(cmd, arg) {
    const node = getNode(resolve(arg))
    if (!node) {
      out(`${cmd}: ${arg}: No such file or directory`)
      return null
    }
    if (node.type !== 'file') {
      out(`${cmd}: ${arg}: Is a directory`)
      return null
    }
    return node.content
  }

  // Parse head/tail style arguments: [-n N] <file> (also accepts -N).
  function parseCountArgs(cmd, args) {
    let n = 10
    let file = null
    for (let i = 0; i < args.length; i++) {
      const a = args[i]
      if (a === '-n') {
        const v = args[++i]
        if (!/^\d+$/.test(v || '')) {
          out(`${cmd}: illegal line count -- ${v}`)
          return null
        }
        n = Number(v)
      } else if (/^-\d+$/.test(a)) {
        n = Number(a.slice(1))
      } else if (file == null) {
        file = a
      }
    }
    if (file == null) {
      out(`usage: ${cmd} [-n N] <file>`)
      return null
    }
    return { n, file }
  }

  return {
    grep(args) {
      const insensitive = args.some((a) => a.startsWith('-') && a.includes('i'))
      const [pattern, file] = args.filter((a) => !a.startsWith('-'))
      if (pattern == null || file == null) return out('usage: grep [-i] <pattern> <file>')
      const content = readTarget('grep', file)
      if (content == null) return
      let re
      try {
        re = new RegExp(pattern, insensitive ? 'i' : '')
      } catch {
        re = null // not a valid regex: fall back to a literal substring match
      }
      const matches = (line) =>
        re ? re.test(line) : insensitive
          ? line.toLowerCase().includes(pattern.toLowerCase())
          : line.includes(pattern)
      const rows = []
      toLines(content).forEach((line, i) => {
        if (matches(line)) rows.push(`${i + 1}:${line}`)
      })
      if (rows.length) out(rows.join('\n'))
    },

    find(args) {
      const arg = args[0] || '.'
      const node = getNode(resolve(arg))
      if (!node) return out(`find: ${arg}: No such file or directory`)
      // find-style output echoes the path as typed ('.', 'Documents', '/').
      const base = arg.replace(/\/+$/, '') || '/'
      const rows = [base]
      const walk = (n, prefix) => {
        if (n.type !== 'dir') return
        for (const [name, child] of Object.entries(n.children)) {
          const childPath = prefix === '/' ? `/${name}` : `${prefix}/${name}`
          rows.push(childPath)
          walk(child, childPath)
        }
      }
      walk(node, base)
      out(rows.join('\n'))
    },

    wc(args) {
      const files = args.filter((a) => !a.startsWith('-'))
      if (!files.length) return out('usage: wc <file>')
      const fmt = (l, w, c, name) =>
        `${String(l).padStart(7)} ${String(w).padStart(7)} ${String(c).padStart(7)} ${name}`
      const rows = []
      let tl = 0
      let tw = 0
      let tc = 0
      for (const arg of files) {
        const content = readTarget('wc', arg)
        if (content == null) continue
        const l = (content.match(/\n/g) || []).length
        const w = content.split(/\s+/).filter(Boolean).length
        const c = content.length
        tl += l
        tw += w
        tc += c
        rows.push(fmt(l, w, c, arg))
      }
      if (files.length > 1) rows.push(fmt(tl, tw, tc, 'total'))
      if (rows.length) out(rows.join('\n'))
    },

    head(args) {
      const parsed = parseCountArgs('head', args)
      if (!parsed) return
      const content = readTarget('head', parsed.file)
      if (content == null) return
      const result = toLines(content).slice(0, parsed.n).join('\n')
      if (result) out(result)
    },

    tail(args) {
      const parsed = parseCountArgs('tail', args)
      if (!parsed) return
      const content = readTarget('tail', parsed.file)
      if (content == null) return
      const lines = toLines(content)
      const result = (parsed.n === 0 ? [] : lines.slice(-parsed.n)).join('\n')
      if (result) out(result)
    },

    sort(args) {
      const file = args.find((a) => !a.startsWith('-'))
      if (!file) return out('usage: sort <file>')
      const content = readTarget('sort', file)
      if (content == null) return
      const result = toLines(content).sort().join('\n')
      if (result) out(result)
    },

    history() {
      const entries = (ctx.history && ctx.history.value) || []
      if (!entries.length) return
      out(entries.map((cmd, i) => `${String(i + 1).padStart(4)}  ${cmd}`).join('\n'))
    },

    which(args) {
      const name = args[0]
      if (!name) return out('usage: which <command>')
      if (name === 'll') return out('ll: aliased to ls -l')
      if (cmds[name]) out(`/bin/${name}`)
      else out(`${name} not found`)
    },

    man(args) {
      const name = args[0]
      if (!name) return out('What manual page do you want?')
      const entry = HELP.find(([usage]) => usage.split(' ')[0] === name)
      if (!entry) return out(`No manual entry for ${name}`)
      out(`${entry[0]} — ${entry[1]}`)
    },

    alias() {
      out('alias ll="ls -l"')
    },

    ll(args) {
      cmds.ls(['-l', ...args])
    },

    ping(args) {
      const host = args[0]
      if (!host) return out('usage: ping <host>')
      const h = strHash(host)
      const ip = `${(h & 127) + 1}.${(h >> 7) & 255}.${(h >> 15) & 255}.${(h >> 23) & 255}`
      let t = 5 + (h % 9)
      const times = []
      for (let i = 0; i < 4; i++) {
        t += Math.random() * 8 + 2 // strictly increasing
        times.push(t)
      }
      const rows = [`PING ${host} (${ip}): 56 data bytes`]
      times.forEach((ms, i) => {
        rows.push(`64 bytes from ${ip}: icmp_seq=${i} ttl=56 time=${ms.toFixed(3)} ms`)
      })
      const min = Math.min(...times)
      const max = Math.max(...times)
      const avg = times.reduce((sum, ms) => sum + ms, 0) / times.length
      const sd = Math.sqrt(times.reduce((sum, ms) => sum + (ms - avg) ** 2, 0) / times.length)
      rows.push('')
      rows.push(`--- ${host} ping statistics ---`)
      rows.push('4 packets transmitted, 4 packets received, 0.0% packet loss')
      rows.push(
        `round-trip min/avg/max/stddev = ${min.toFixed(3)}/${avg.toFixed(3)}/${max.toFixed(3)}/${sd.toFixed(3)} ms`,
      )
      out(rows.join('\n'))
    },

    curl(args) {
      const url = args.find((a) => !a.startsWith('-'))
      if (!url) return out('usage: curl <url>')
      const size = 800 + (strHash(url) % 4200)
      out(
        [
          'HTTP/2 200',
          'server: macos-web',
          `date: ${new Date().toUTCString()}`,
          'content-type: text/html; charset=UTF-8',
          `content-length: ${size}`,
          '',
          `<!doctype html><title>${url}</title><!-- ${size} bytes of simulated HTML from ${url}; no network request was made -->`,
        ].join('\n'),
      )
    },

    df() {
      out(
        [
          'Filesystem       Size   Used  Avail Capacity  iused      ifree %iused  Mounted on',
          '/dev/disk3s1s1  460Gi   11Gi  319Gi     4%  356214  3343968380    0%   /',
          'devfs            191Ki  191Ki    0Bi   100%      662           0  100%   /dev',
          '/dev/disk3s6    460Gi  2.0Gi  319Gi     1%        2  3343968380    0%   /System/Volumes/VM',
          '/dev/disk3s2    460Gi  5.1Gi  319Gi     2%     1283  3343968380    0%   /System/Volumes/Preboot',
          '/dev/disk3s4    460Gi  3.0Gi  319Gi     1%      168  3343968380    0%   /System/Volumes/Update',
          '/dev/disk3s5    460Gi  119Gi  319Gi    28%  1822102  3343968380    0%   /System/Volumes/Data',
        ].join('\n'),
      )
    },

    // The virtual FS tracks no permissions or ownership: succeed silently.
    chmod() {},
    chown() {},

    ln() {
      out('ln: hard links not supported')
    },
  }
}
