// Casual chess engine — real movement rules, no check/checkmate detection.
// Board is an 8×8 array; board[r][c] with r=0 at the top (rank 8, Black's home row).
// A piece is { color: 'w'|'b', type: 'p'|'n'|'b'|'r'|'q'|'k' } or null.

const BACK_RANK = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']

export function newGame() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null))
  for (let c = 0; c < 8; c++) {
    board[0][c] = { color: 'b', type: BACK_RANK[c] }
    board[1][c] = { color: 'b', type: 'p' }
    board[6][c] = { color: 'w', type: 'p' }
    board[7][c] = { color: 'w', type: BACK_RANK[c] }
  }
  return {
    board,
    turn: 'w',
    // moves: [{ from:{r,c}, to:{r,c}, piece, captured, promotion, san }]
    moves: [],
    // captured.w = pieces White has captured (black pieces), captured.b = Black's captures
    captured: { w: [], b: [] },
  }
}

export function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8
}

const KNIGHT_JUMPS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
]
const KING_STEPS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
]
const DIAGONALS = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const STRAIGHTS = [[-1, 0], [1, 0], [0, -1], [0, 1]]

// Pseudo-legal destinations for the piece on (r, c). No check filtering (casual rules).
export function legalMoves(board, r, c) {
  const piece = board[r][c]
  if (!piece) return []
  const moves = []
  const push = (tr, tc) => {
    const target = board[tr][tc]
    if (target && target.color === piece.color) return false // blocked by own piece
    moves.push({ r: tr, c: tc, capture: !!target })
    return !target // keep sliding only past empty squares
  }
  const slide = (dirs) => {
    for (const [dr, dc] of dirs) {
      let tr = r + dr, tc = c + dc
      while (inBounds(tr, tc) && push(tr, tc)) { tr += dr; tc += dc }
    }
  }
  const hop = (jumps) => {
    for (const [dr, dc] of jumps) {
      const tr = r + dr, tc = c + dc
      if (inBounds(tr, tc)) push(tr, tc)
    }
  }

  switch (piece.type) {
    case 'n': hop(KNIGHT_JUMPS); break
    case 'k': hop(KING_STEPS); break
    case 'b': slide(DIAGONALS); break
    case 'r': slide(STRAIGHTS); break
    case 'q': slide([...DIAGONALS, ...STRAIGHTS]); break
    case 'p': {
      const dir = piece.color === 'w' ? -1 : 1
      const startRow = piece.color === 'w' ? 6 : 1
      // one step forward (never a capture)
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push({ r: r + dir, c, capture: false })
        // initial double step over an empty square
        if (r === startRow && !board[r + 2 * dir][c]) {
          moves.push({ r: r + 2 * dir, c, capture: false })
        }
      }
      // diagonal captures
      for (const dc of [-1, 1]) {
        const tr = r + dir, tc = c + dc
        if (inBounds(tr, tc) && board[tr][tc] && board[tr][tc].color !== piece.color) {
          moves.push({ r: tr, c: tc, capture: true })
        }
      }
      break
    }
  }
  return moves
}

export function squareName(r, c) {
  return 'abcdefgh'[c] + (8 - r)
}

// Apply a move, mutate the game state, and record it. Pawns auto-promote to queen.
export function applyMove(game, from, to) {
  const piece = game.board[from.r][from.c]
  if (!piece) return null
  const captured = game.board[to.r][to.c]
  const lastRank = piece.color === 'w' ? 0 : 7
  const promotion = piece.type === 'p' && to.r === lastRank

  game.board[to.r][to.c] = promotion ? { color: piece.color, type: 'q' } : piece
  game.board[from.r][from.c] = null
  if (captured) game.captured[piece.color].push(captured.type)

  const san =
    squareName(from.r, from.c) +
    (captured ? '×' : '–') +
    squareName(to.r, to.c) +
    (promotion ? '=Q' : '')

  const move = {
    from: { ...from },
    to: { ...to },
    piece: piece.type,
    color: piece.color,
    captured: captured ? captured.type : null,
    promotion,
    san,
  }
  game.moves.push(move)
  game.turn = piece.color === 'w' ? 'b' : 'w'
  return move
}

// True when the side to move has at least one legal move anywhere.
export function hasAnyMove(game) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = game.board[r][c]
      if (p && p.color === game.turn && legalMoves(game.board, r, c).length) return true
    }
  }
  return false
}
