// Safe math expression parser for Grapher.
// Supports: + - * / ^ (right-assoc), parentheses, unary minus,
// implicit multiplication (2x, 2(x+1), 2sin(x)),
// functions sin cos tan sqrt abs log exp, constants pi e, variable x.
// No eval / Function — tokenizer + recursive descent into an AST evaluator.

const FUNCS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: (v) => (v < 0 ? NaN : Math.sqrt(v)),
  abs: Math.abs,
  log: (v) => (v <= 0 ? NaN : Math.log(v)),
  exp: Math.exp,
}

const CONSTS = { pi: Math.PI, e: Math.E }

// ---- Tokenizer -----------------------------------------------------------

function tokenize(src) {
  const tokens = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === ' ' || c === '\t') { i++; continue }
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      const raw = src.slice(i, j)
      if ((raw.match(/\./g) || []).length > 1) throw new Error(`bad number "${raw}"`)
      tokens.push({ t: 'num', v: parseFloat(raw) })
      i = j
      continue
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i
      while (j < src.length && /[a-zA-Z]/.test(src[j])) j++
      const word = src.slice(i, j).toLowerCase()
      if (word === 'x') tokens.push({ t: 'var' })
      else if (FUNCS[word]) tokens.push({ t: 'func', v: word })
      else if (CONSTS[word] !== undefined) tokens.push({ t: 'num', v: CONSTS[word] })
      else throw new Error(`unknown name "${word}"`)
      i = j
      continue
    }
    if ('+-*/^'.includes(c)) { tokens.push({ t: 'op', v: c }); i++; continue }
    if (c === '(') { tokens.push({ t: 'lparen' }); i++; continue }
    if (c === ')') { tokens.push({ t: 'rparen' }); i++; continue }
    if (c === '=') throw new Error('just type the expression after "y ="')
    throw new Error(`unexpected character "${c}"`)
  }
  return tokens
}

// Insert implicit multiplication: num/var/) followed by num/var/func/(
function withImplicitMul(tokens) {
  const out = []
  const isValue = (tk) => tk && (tk.t === 'num' || tk.t === 'var' || tk.t === 'rparen')
  const startsValue = (tk) => tk && (tk.t === 'num' || tk.t === 'var' || tk.t === 'func' || tk.t === 'lparen')
  for (let k = 0; k < tokens.length; k++) {
    const prev = out[out.length - 1]
    const cur = tokens[k]
    if (isValue(prev) && startsValue(cur)) out.push({ t: 'op', v: '*' })
    out.push(cur)
  }
  return out
}

// ---- Recursive descent parser --------------------------------------------
// expr   := term (('+'|'-') term)*
// term   := unary (('*'|'/') unary)*
// unary  := '-' unary | power
// power  := atom ('^' unary)?          // right-assoc, allows 2^-3
// atom   := num | var | func '(' expr ')' | '(' expr ')'

function parse(tokens) {
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]

  function parseExpr() {
    let left = parseTerm()
    while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = next().v
      left = { t: 'bin', op, l: left, r: parseTerm() }
    }
    return left
  }

  function parseTerm() {
    let left = parseUnary()
    while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = next().v
      left = { t: 'bin', op, l: left, r: parseUnary() }
    }
    return left
  }

  function parseUnary() {
    if (peek() && peek().t === 'op' && (peek().v === '-' || peek().v === '+')) {
      const op = next().v
      const operand = parseUnary()
      return op === '-' ? { t: 'neg', v: operand } : operand
    }
    return parsePower()
  }

  function parsePower() {
    const base = parseAtom()
    if (peek() && peek().t === 'op' && peek().v === '^') {
      next()
      return { t: 'bin', op: '^', l: base, r: parseUnary() }
    }
    return base
  }

  function parseAtom() {
    const tk = next()
    if (!tk) throw new Error('unexpected end of expression')
    if (tk.t === 'num') return { t: 'num', v: tk.v }
    if (tk.t === 'var') return { t: 'var' }
    if (tk.t === 'func') {
      const open = next()
      if (!open || open.t !== 'lparen') throw new Error(`expected "(" after ${tk.v}`)
      const arg = parseExpr()
      const close = next()
      if (!close || close.t !== 'rparen') throw new Error('missing closing parenthesis')
      return { t: 'call', f: tk.v, arg }
    }
    if (tk.t === 'lparen') {
      const inner = parseExpr()
      const close = next()
      if (!close || close.t !== 'rparen') throw new Error('missing closing parenthesis')
      return inner
    }
    if (tk.t === 'rparen') throw new Error('unexpected ")"')
    throw new Error(`unexpected "${tk.v}"`)
  }

  const ast = parseExpr()
  if (pos < tokens.length) throw new Error(`unexpected "${tokens[pos].v ?? ')'}"`)
  return ast
}

// ---- Evaluator -----------------------------------------------------------

function makeEvaluator(ast) {
  return function evaluate(x) {
    return walk(ast, x)
  }
}

function walk(node, x) {
  switch (node.t) {
    case 'num': return node.v
    case 'var': return x
    case 'neg': return -walk(node.v, x)
    case 'call': return FUNCS[node.f](walk(node.arg, x))
    case 'bin': {
      const a = walk(node.l, x)
      const b = walk(node.r, x)
      switch (node.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/': return a / b
        case '^': return Math.pow(a, b)
      }
    }
  }
  return NaN
}

// ---- Public API ------------------------------------------------------------

// compile('sin(x) + x^2') -> { fn } or { error: 'message' }
export function compile(src) {
  const trimmed = (src || '').trim()
  if (!trimmed) return { fn: null, empty: true }
  try {
    const tokens = withImplicitMul(tokenize(trimmed))
    if (!tokens.length) return { fn: null, empty: true }
    return { fn: makeEvaluator(parse(tokens)) }
  } catch (err) {
    return { fn: null, error: err.message }
  }
}
