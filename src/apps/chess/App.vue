<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { newGame, legalMoves, applyMove, hasAnyMove } from './engine'

const GLYPHS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' }

const game = reactive(newGame())
const selected = ref(null) // { r, c } of the selected piece
const movesEl = ref(null)

const targets = computed(() => {
  if (!selected.value) return []
  return legalMoves(game.board, selected.value.r, selected.value.c)
})

const lastMove = computed(() => game.moves[game.moves.length - 1] || null)

const movePairs = computed(() => {
  const pairs = []
  for (let i = 0; i < game.moves.length; i += 2) {
    pairs.push({ n: i / 2 + 1, white: game.moves[i], black: game.moves[i + 1] || null })
  }
  return pairs
})

// captured.w = black pieces White took; sort biggest first, compute material swing
function tray(color) {
  const list = [...game.captured[color]].sort((a, b) => VALUES[b] - VALUES[a])
  const mine = game.captured[color].reduce((s, t) => s + VALUES[t], 0)
  const theirs = game.captured[color === 'w' ? 'b' : 'w'].reduce((s, t) => s + VALUES[t], 0)
  return { list, plus: Math.max(0, mine - theirs) }
}
const whiteTray = computed(() => tray('w'))
const blackTray = computed(() => tray('b'))

const outOfMoves = computed(() => game.moves.length > 0 && !hasAnyMove(game))

function squareState(r, c) {
  const t = targets.value.find((m) => m.r === r && m.c === c)
  return {
    dark: (r + c) % 2 === 1,
    selected: selected.value && selected.value.r === r && selected.value.c === c,
    lastFrom: lastMove.value && lastMove.value.from.r === r && lastMove.value.from.c === c,
    lastTo: lastMove.value && lastMove.value.to.r === r && lastMove.value.to.c === c,
    dot: !!t && !t.capture,
    ring: !!t && t.capture,
  }
}

function onSquare(r, c) {
  const piece = game.board[r][c]
  // clicking a highlighted destination makes the move
  if (selected.value) {
    const t = targets.value.find((m) => m.r === r && m.c === c)
    if (t) {
      applyMove(game, selected.value, { r, c })
      selected.value = null
      return
    }
  }
  // select own piece, re-select another, or clear selection
  if (piece && piece.color === game.turn) {
    selected.value = selected.value && selected.value.r === r && selected.value.c === c
      ? null
      : { r, c }
  } else {
    selected.value = null
  }
}

function reset() {
  Object.assign(game, newGame())
  selected.value = null
}

watch(
  () => game.moves.length,
  async () => {
    await nextTick()
    if (movesEl.value) movesEl.value.scrollTop = movesEl.value.scrollHeight
  }
)
</script>

<template>
  <div class="app-root chess-root">
    <!-- toolbar -->
    <header class="toolbar">
      <div class="turn" :class="game.turn">
        <span class="turn-pawn">{{ game.turn === 'w' ? '♙' : '♟' }}</span>
        <span class="turn-label">
          {{ outOfMoves ? (game.turn === 'w' ? 'White has no moves' : 'Black has no moves') : (game.turn === 'w' ? 'White to move' : 'Black to move') }}
        </span>
      </div>
      <span class="casual">Casual rules — check not enforced</span>
      <button class="new-game" @click="reset">New Game</button>
    </header>

    <div class="body">
      <!-- board side -->
      <div class="board-col">
        <!-- pieces Black has captured (white pieces) -->
        <div class="tray">
          <span
            v-for="(t, i) in blackTray.list"
            :key="i"
            class="cap-piece cap-white"
            :title="PIECE_NAMES[t]"
          >{{ GLYPHS[t] }}</span>
          <span v-if="blackTray.plus" class="plus">+{{ blackTray.plus }}</span>
        </div>

        <div class="board-stage">
          <div class="board">
            <div
              v-for="r in 8"
              :key="r"
              class="rank"
            >
              <button
                v-for="c in 8"
                :key="c"
                class="sq"
                :class="squareState(r - 1, c - 1)"
                @click="onSquare(r - 1, c - 1)"
              >
                <span v-if="c === 1" class="coord rank-coord">{{ 9 - r }}</span>
                <span v-if="r === 8" class="coord file-coord">{{ 'abcdefgh'[c - 1] }}</span>
                <span
                  v-if="game.board[r - 1][c - 1]"
                  class="piece"
                  :class="game.board[r - 1][c - 1].color === 'w' ? 'pw' : 'pb'"
                >{{ GLYPHS[game.board[r - 1][c - 1].type] }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- pieces White has captured (black pieces) -->
        <div class="tray">
          <span
            v-for="(t, i) in whiteTray.list"
            :key="i"
            class="cap-piece cap-black"
            :title="PIECE_NAMES[t]"
          >{{ GLYPHS[t] }}</span>
          <span v-if="whiteTray.plus" class="plus">+{{ whiteTray.plus }}</span>
        </div>
      </div>

      <!-- move list -->
      <aside class="side">
        <div class="side-title">Moves</div>
        <div ref="movesEl" class="moves">
          <div v-if="!game.moves.length" class="empty">No moves yet</div>
          <div v-for="p in movePairs" :key="p.n" class="move-row">
            <span class="move-n">{{ p.n }}.</span>
            <span class="move-san">{{ p.white.san }}</span>
            <span class="move-san">{{ p.black ? p.black.san : '' }}</span>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.chess-root {
  color: var(--text);
  background: var(--window-bg);
}

/* ── toolbar ─────────────────────────────── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
  flex: none;
}
.turn {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
}
.turn-pawn {
  font-size: 19px;
  line-height: 1;
}
.turn.w .turn-pawn { color: #fff; -webkit-text-stroke: 1.2px #3a3a3c; text-shadow: 0 1px 2px rgba(0,0,0,.35); }
.turn.b .turn-pawn { color: #1c1c1e; -webkit-text-stroke: 0.6px rgba(255,255,255,.45); }
.casual {
  font-size: 11px;
  color: var(--text-dim);
  flex: 1;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.new-game {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  padding: 4px 12px;
  cursor: pointer;
}
.new-game:hover { filter: brightness(1.08); }
.new-game:active { transform: scale(0.97); }

/* ── layout ──────────────────────────────── */
.body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.board-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  gap: 6px;
}

/* captured trays */
.tray {
  flex: none;
  height: 26px;
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 0 4px;
  overflow: hidden;
}
.cap-piece {
  font-size: 20px;
  line-height: 1;
  margin-right: -3px;
}
.cap-white { color: #fafafa; -webkit-text-stroke: 1px #3a3a3c; text-shadow: 0 1px 1px rgba(0,0,0,.3); }
.cap-black { color: #1c1c1e; -webkit-text-stroke: 0.5px rgba(255,255,255,.4); }
.plus {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
}

/* board */
.board-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;
}
.board {
  position: relative;
  width: min(100cqw, 100cqh);
  aspect-ratio: 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  /* dark walnut frame: the gradient background shows through the transparent border */
  border: 14px solid transparent;
  border-radius: 10px;
  background: linear-gradient(145deg, #59371e 0%, #3f2712 55%, #2b1a0c 100%);
  overflow: hidden;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.32), 0 0 0 0.5px var(--border);
  user-select: none;
}
.board::after {
  /* inner shadow where the frame meets the squares (painted above them) */
  content: '';
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5), inset 0 3px 12px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.rank {
  flex: 1;
  display: flex;
  min-height: 0;
}
.sq {
  position: relative;
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
  background: #ecc493;
}
.sq.dark { background: #a5713f; }
.sq.lastFrom,
.sq.lastTo { box-shadow: inset 0 0 0 100px rgba(255, 213, 79, 0.38); }
.sq.selected { box-shadow: inset 0 0 0 100px rgba(80, 160, 255, 0.42); }

/* destination markers */
.sq.dot::after {
  content: '';
  position: absolute;
  width: 26%;
  height: 26%;
  border-radius: 50%;
  background: rgba(20, 20, 20, 0.22);
}
.sq.ring::after {
  content: '';
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  border: 3px solid rgba(20, 20, 20, 0.28);
}
.sq:hover .piece { transform: scale(1.05); }

/* coordinates */
.coord {
  position: absolute;
  font-size: 9px;
  font-weight: 700;
  pointer-events: none;
}
.rank-coord { top: 2px; left: 3px; }
.file-coord { bottom: 1px; right: 3px; }
.sq:not(.dark) .coord { color: #a5713f; }
.sq.dark .coord { color: #ecc493; }

/* pieces: filled glyphs for both armies, distinguished by fill + stroke */
.piece {
  font-size: 38px; /* fallback; overridden by the container query below */
  line-height: 1;
  pointer-events: none;
  transition: transform 0.08s ease;
  font-family: 'Arial Unicode MS', 'Helvetica Neue', serif;
}
@container (min-width: 0px) {
  /* board = min(stage w, stage h); the 14px frame shrinks the squares ~7%, so glyph ≈ 75% of a square at ~8.6cqmin */
  .piece { font-size: 8.6cqmin; }
}
.pw {
  color: #fafafa;
  -webkit-text-stroke: 1.4px #3a3a3c;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.35);
}
.pb {
  color: #1c1c1e;
  -webkit-text-stroke: 0.7px rgba(255, 255, 255, 0.4);
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.25);
}

/* ── side panel ──────────────────────────── */
.side {
  flex: none;
  width: 168px;
  display: flex;
  flex-direction: column;
  border-left: 0.5px solid var(--border);
  background: var(--sidebar-bg);
}
.side-title {
  flex: none;
  padding: 10px 12px 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
  border-bottom: 0.5px solid var(--border);
}
.moves {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 0;
}
.empty {
  padding: 12px;
  font-size: 12px;
  color: var(--text-dim);
}
.move-row {
  display: grid;
  grid-template-columns: 30px 1fr 1fr;
  padding: 3px 10px;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}
.move-row:nth-child(odd) { background: var(--hover); }
.move-n { color: var(--text-dim); }
.move-san { font-weight: 500; }
</style>
