// Mini spreadsheet formula engine for the Excel app.
// Supports: numbers, cell references (A1), ranges (A1:B5) inside functions,
// SUM / AVG / MIN / MAX / COUNT, + - * / and parentheses.
// Errors: #NAME? (parse/unknown), #DIV/0!, #REF! (thrown by the host resolver
// for circular references and propagated through here untouched).

export function colToNum(col) {
  let n = 0
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

export function numToCol(n) {
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function parseRef(ref) {
  const m = /^([A-Za-z]+)([0-9]+)$/.exec(ref)
  if (!m) return null
  return { col: colToNum(m[1]), row: parseInt(m[2], 10) }
}

function fail(code) {
  throw Object.assign(new Error(code), { code })
}

const FUNCS = {
  SUM: (a) => a.reduce((x, y) => x + y, 0),
  AVG: (a) => {
    if (!a.length) fail('#DIV/0!')
    return a.reduce((x, y) => x + y, 0) / a.length
  },
  MIN: (a) => (a.length ? Math.min(...a) : 0),
  MAX: (a) => (a.length ? Math.max(...a) : 0),
  COUNT: (a) => a.length,
}

function toNum(v) {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  return 0
}

function tokenize(src) {
  const tokens = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i++
      continue
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^[0-9]*\.?[0-9]+/.exec(src.slice(i))
      tokens.push({ t: 'num', v: parseFloat(m[0]) })
      i += m[0].length
      continue
    }
    if (/[A-Za-z]/.test(ch)) {
      const m = /^[A-Za-z]+[0-9]*/.exec(src.slice(i))
      const word = m[0]
      if (/[0-9]$/.test(word)) {
        if (!parseRef(word)) fail('#NAME?')
        tokens.push({ t: 'ref', v: word.toUpperCase() })
      } else {
        tokens.push({ t: 'name', v: word.toUpperCase() })
      }
      i += word.length
      continue
    }
    if ('+-*/():,'.includes(ch)) {
      tokens.push({ t: 'op', v: ch })
      i++
      continue
    }
    fail('#NAME?')
  }
  return tokens
}

// Evaluate a formula body (text after "=") to a number.
// ctx.cell(refKey)  -> evaluated value of one cell (number|string)
// ctx.range(c1,r1,c2,r2) -> array of numeric values in the rectangle
export function evaluate(src, ctx) {
  const tokens = tokenize(src)
  let pos = 0

  const peek = (ahead = 0) => tokens[pos + ahead] || { t: 'eof' }
  const next = () => tokens[pos++]
  const isOp = (tok, v) => tok.t === 'op' && tok.v === v

  function parseExpr() {
    let v = parseTerm()
    while (isOp(peek(), '+') || isOp(peek(), '-')) {
      const op = next().v
      const rhs = parseTerm()
      v = op === '+' ? v + rhs : v - rhs
    }
    return v
  }

  function parseTerm() {
    let v = parseFactor()
    while (isOp(peek(), '*') || isOp(peek(), '/')) {
      const op = next().v
      const rhs = parseFactor()
      if (op === '*') v = v * rhs
      else {
        if (rhs === 0) fail('#DIV/0!')
        v = v / rhs
      }
    }
    return v
  }

  function parseFactor() {
    const tok = peek()
    if (isOp(tok, '-')) {
      next()
      return -parseFactor()
    }
    if (isOp(tok, '+')) {
      next()
      return parseFactor()
    }
    if (tok.t === 'num') {
      next()
      return tok.v
    }
    if (tok.t === 'ref') {
      next()
      return toNum(ctx.cell(tok.v))
    }
    if (isOp(tok, '(')) {
      next()
      const v = parseExpr()
      if (!isOp(peek(), ')')) fail('#NAME?')
      next()
      return v
    }
    if (tok.t === 'name') {
      next()
      const fn = FUNCS[tok.v]
      if (!fn || !isOp(peek(), '(')) fail('#NAME?')
      next() // consume '('
      const args = parseArgs()
      return fn(args)
    }
    fail('#NAME?')
  }

  function parseArgs() {
    const values = []
    if (isOp(peek(), ')')) {
      next()
      return values
    }
    for (;;) {
      // range like A1:B5 ?
      if (peek().t === 'ref' && isOp(peek(1), ':') && peek(2).t === 'ref') {
        const a = parseRef(next().v)
        next() // consume ':'
        const b = parseRef(next().v)
        values.push(...ctx.range(a.col, a.row, b.col, b.row))
      } else {
        values.push(parseExpr())
      }
      if (isOp(peek(), ',')) {
        next()
        continue
      }
      if (isOp(peek(), ')')) {
        next()
        break
      }
      fail('#NAME?')
    }
    return values
  }

  const result = parseExpr()
  if (pos < tokens.length) fail('#NAME?')
  return result
}
