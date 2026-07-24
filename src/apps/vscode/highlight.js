// Lightweight syntax highlighter for the VS Code editor overlay.
// Pure regex/state tokenizer (no external libs) producing one
// <div class="hl-line"> per source line with <span class="t-*"> tokens.
// Colors are VS Code Dark+ values; the t-* classes are styled in App.vue.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const span = (cls, text) => `<span class="t-${cls}">${esc(text)}</span>`

export function detectLang(name = '') {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  if (['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx'].includes(ext)) return 'js'
  if (['css', 'scss', 'less'].includes(ext)) return 'css'
  if (['html', 'htm', 'vue', 'svg', 'xml'].includes(ext)) return 'html'
  if (ext === 'json') return 'json'
  if (['md', 'markdown'].includes(ext)) return 'md'
  return ''
}

// ---- JavaScript / TypeScript ------------------------------------------------

const JS_KEYWORDS = new Set(
  (
    'await async break case catch class const continue debugger default delete do else export ' +
    'extends finally for from function if import in instanceof let new of return static super ' +
    'switch this throw try typeof var void while with yield get set true false null undefined'
  ).split(' '),
)

// 1 block comment, 2 line comment, 3/4 strings, 5 template, 6 number, 7 identifier, 8 other
const JS_TOKEN =
  /(\/\*[\s\S]*?(?:\*\/|$))|(\/\/.*)|('(?:[^'\\\n]|\\.)*(?:'|$))|("(?:[^"\\\n]|\\.)*(?:"|$))|(`(?:[^`\\]|\\.)*(?:`|$))|(\b0[xX][\da-fA-F]+\b|\b0[bB][01]+\b|\b0[oO][0-7]+\b|\b\d(?:[\d_]*\d)?(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+|.)/gy

function jsLine(line, state) {
  let out = ''
  let rest = line
  // Continue an unterminated block comment or template literal from the previous line.
  if (state.mode === 'comment') {
    const end = rest.indexOf('*/')
    if (end === -1) return span('com', rest)
    out += span('com', rest.slice(0, end + 2))
    rest = rest.slice(end + 2)
    state.mode = ''
  } else if (state.mode === 'tpl') {
    const m = /^([^`\\]|\\.)*(`|$)/.exec(rest)
    out += span('str', m[0])
    rest = rest.slice(m[0].length)
    if (m[2] === '`') state.mode = ''
  }
  JS_TOKEN.lastIndex = 0
  let m
  while ((m = JS_TOKEN.exec(rest)) !== null) {
    const tok = m[0]
    if (m[1]) {
      out += span('com', tok)
      if (!tok.endsWith('*/')) state.mode = 'comment'
    } else if (m[2]) {
      out += span('com', tok)
    } else if (m[3] || m[4]) {
      out += span('str', tok)
    } else if (m[5]) {
      out += span('str', tok)
      if (!tok.endsWith('`')) state.mode = 'tpl'
    } else if (m[6]) {
      out += span('num', tok)
    } else if (m[7]) {
      if (JS_KEYWORDS.has(tok)) out += span('kw', tok)
      else if (/^[A-Z]/.test(tok)) out += span('type', tok) // classes/types are capitalized
      else if (/^\s*\(/.test(rest.slice(JS_TOKEN.lastIndex))) out += span('fn', tok) // call site
      else out += esc(tok)
    } else {
      out += esc(tok)
    }
  }
  return out
}

// ---- CSS ----------------------------------------------------------------------

function cssLine(line, state) {
  let out = ''
  let rest = line
  let inValue = false // between "property:" and ";" inside a declaration block
  while (rest.length) {
    if (state.mode === 'comment') {
      const end = rest.indexOf('*/')
      if (end === -1) return out + span('com', rest)
      out += span('com', rest.slice(0, end + 2))
      rest = rest.slice(end + 2)
      state.mode = ''
      continue
    }
    let m
    if ((m = /^[ \t]+/.exec(rest))) {
      out += esc(m[0])
      rest = rest.slice(m[0].length)
      continue
    }
    if (rest.startsWith('/*')) {
      const end = rest.indexOf('*/', 2)
      if (end === -1) {
        out += span('com', rest)
        state.mode = 'comment'
        return out
      }
      out += span('com', rest.slice(0, end + 2))
      rest = rest.slice(end + 2)
      continue
    }
    if ((m = /^("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)/.exec(rest))) {
      out += span('str', m[0])
      rest = rest.slice(m[0].length)
      continue
    }
    const ch = rest[0]
    if (ch === '{') {
      state.depth++
      inValue = false
      out += esc(ch)
      rest = rest.slice(1)
      continue
    }
    if (ch === '}') {
      state.depth = Math.max(0, state.depth - 1)
      inValue = false
      out += esc(ch)
      rest = rest.slice(1)
      continue
    }
    if (state.depth === 0) {
      // Selector context: everything up to "{" is selector text; @rules are keywords.
      if ((m = /^@[\w-]+/.exec(rest))) {
        out += span('kw', m[0])
        rest = rest.slice(m[0].length)
        continue
      }
      if ((m = /^[^{]+/.exec(rest))) {
        out += span('sel', m[0])
        rest = rest.slice(m[0].length)
        continue
      }
      out += esc(ch)
      rest = rest.slice(1)
      continue
    }
    // Declaration context.
    if (ch === ';') {
      inValue = false
      out += esc(ch)
      rest = rest.slice(1)
      continue
    }
    if (ch === ':') {
      inValue = true
      out += esc(ch)
      rest = rest.slice(1)
      continue
    }
    if (inValue) {
      if ((m = /^#[0-9a-fA-F]{3,8}\b/.exec(rest))) {
        out += span('num', m[0])
        rest = rest.slice(m[0].length)
        continue
      }
      if ((m = /^-?(?:\d+\.?\d*|\.\d+)(?:[a-z%]+)?/i.exec(rest))) {
        out += span('num', m[0])
        rest = rest.slice(m[0].length)
        continue
      }
      if ((m = /^!?[\w-]+/.exec(rest))) {
        out += span('str', m[0])
        rest = rest.slice(m[0].length)
        continue
      }
      out += esc(ch)
      rest = rest.slice(1)
      continue
    }
    if ((m = /^@[\w-]+/.exec(rest))) {
      out += span('kw', m[0])
      rest = rest.slice(m[0].length)
      continue
    }
    if ((m = /^-?[_a-zA-Z][\w-]*/.exec(rest))) {
      // Followed by ":" -> property name, otherwise a (nested) selector.
      out += /^\s*:/.test(rest.slice(m[0].length)) ? span('prop', m[0]) : span('sel', m[0])
      rest = rest.slice(m[0].length)
      continue
    }
    out += esc(ch)
    rest = rest.slice(1)
  }
  return out
}

// ---- HTML / XML -----------------------------------------------------------------

function htmlLine(line, state) {
  let out = ''
  let rest = line
  while (rest.length) {
    if (state.mode === 'comment') {
      const end = rest.indexOf('-->')
      if (end === -1) return out + span('com', rest)
      out += span('com', rest.slice(0, end + 3))
      rest = rest.slice(end + 3)
      state.mode = ''
      continue
    }
    if (!state.inTag) {
      if (rest.startsWith('<!--')) {
        const end = rest.indexOf('-->', 4)
        if (end === -1) {
          out += span('com', rest)
          state.mode = 'comment'
          return out
        }
        out += span('com', rest.slice(0, end + 3))
        rest = rest.slice(end + 3)
        continue
      }
      const i = rest.indexOf('<')
      if (i === -1) return out + esc(rest)
      out += esc(rest.slice(0, i))
      rest = rest.slice(i)
      const m = /^<\/?[a-zA-Z][\w.-]*/.exec(rest)
      if (m) {
        const openLen = m[0].startsWith('</') ? 2 : 1
        out += span('punct', m[0].slice(0, openLen)) + span('tag', m[0].slice(openLen))
        rest = rest.slice(m[0].length)
        state.inTag = true
      } else {
        out += esc('<')
        rest = rest.slice(1)
      }
      continue
    }
    // Inside a tag: attributes and quoted values until ">".
    let m
    if ((m = /^[ \t]+/.exec(rest))) {
      out += esc(m[0])
      rest = rest.slice(m[0].length)
      continue
    }
    if ((m = /^\/?>/.exec(rest))) {
      out += span('punct', m[0])
      rest = rest.slice(m[0].length)
      state.inTag = false
      continue
    }
    if ((m = /^("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)/.exec(rest))) {
      out += span('str', m[0])
      rest = rest.slice(m[0].length)
      continue
    }
    if ((m = /^[\w-]+/.exec(rest))) {
      out += span('prop', m[0])
      rest = rest.slice(m[0].length)
      continue
    }
    out += esc(rest[0])
    rest = rest.slice(1)
  }
  return out
}

// ---- JSON -------------------------------------------------------------------------

// 1 string (key when followed by ":"), 2 number, 3 literal, 4 other
const JSON_TOKEN = /("(?:[^"\\]|\\.)*(?:"|$))|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)|(true|false|null)\b|(\s+|.)/gy

function jsonLine(line) {
  let out = ''
  JSON_TOKEN.lastIndex = 0
  let m
  while ((m = JSON_TOKEN.exec(line)) !== null) {
    const tok = m[0]
    if (m[1]) {
      out += /^\s*:/.test(line.slice(JSON_TOKEN.lastIndex)) ? span('prop', tok) : span('str', tok)
    } else if (m[2]) {
      out += span('num', tok)
    } else if (m[3]) {
      out += span('lit', tok)
    } else {
      out += esc(tok)
    }
  }
  return out
}

// ---- Markdown -----------------------------------------------------------------------

// 1 inline code, 2 bold, 3 italic
const MD_INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*|_[^_\n]+_)/g

function mdLine(line, state) {
  if (/^\s*```/.test(line)) {
    state.inFence = !state.inFence
    return span('punct', line)
  }
  if (state.inFence) return span('str', line)
  if (/^#{1,6}(\s|$)/.test(line)) return span('head', line)
  let out = ''
  let last = 0
  MD_INLINE.lastIndex = 0
  let m
  while ((m = MD_INLINE.exec(line)) !== null) {
    out += esc(line.slice(last, m.index))
    if (m[1]) out += span('str', m[0])
    else if (m[2]) out += span('bold', m[0])
    else out += span('it', m[0])
    last = m.index + m[0].length
  }
  return out + esc(line.slice(last))
}

// ---- Driver ---------------------------------------------------------------------------

// Subtle indent guides: one 1px vertical line per two columns of leading whitespace
// (ch units match the monospace grid exactly; painted only across the indent region).
function indentGuideStyle(line) {
  const m = /^[ \t]+/.exec(line)
  if (!m) return ''
  const level = Math.floor(m[0].replace(/\t/g, '  ').length / 2)
  if (!level) return ''
  return (
    ' style="background-image:repeating-linear-gradient(to right,rgba(255,255,255,0.06) 0,' +
    'rgba(255,255,255,0.06) 1px,transparent 1px,transparent 2ch);background-size:' +
    `${level * 2}ch 100%;background-repeat:no-repeat"`
  )
}

export function highlightCode(code, fileName) {
  const lang = detectLang(fileName)
  const state = { mode: '', depth: 0, inTag: false, inFence: false }
  let html = ''
  for (const line of code.split('\n')) {
    let inner
    switch (lang) {
      case 'js':
        inner = jsLine(line, state)
        break
      case 'css':
        inner = cssLine(line, state)
        break
      case 'html':
        inner = htmlLine(line, state)
        break
      case 'json':
        inner = jsonLine(line)
        break
      case 'md':
        inner = mdLine(line, state)
        break
      default:
        inner = esc(line)
    }
    html += `<div class="hl-line"${indentGuideStyle(line)}>${inner}</div>`
  }
  return html
}
