import { CELLS, colOf, PEERS, rowOf, type Difficulty, type Grid } from './sudoku'

/** What undo and redo restore: the player's digits and pencil marks. */
export type Snapshot = { values: Grid; notes: number[] }

export type Game = {
  difficulty: Difficulty
  /** The clues; non-zero cells can't be edited. */
  puzzle: Grid
  solution: Grid
  values: Grid
  /** Pencil marks per cell as a bitmask, bit d set for digit d. */
  notes: number[]
  selected: number
  noteMode: boolean
  /** Seconds played, not counting pauses. */
  elapsed: number
  paused: boolean
  won: boolean
  hints: number
  past: Snapshot[]
  future: Snapshot[]
}

export type Action =
  | { type: 'new'; difficulty: Difficulty; puzzle: Grid; solution: Grid }
  | { type: 'select'; cell: number }
  | { type: 'move'; rows: number; cols: number }
  | { type: 'digit'; digit: number; note?: boolean }
  | { type: 'erase' }
  | { type: 'noteMode' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'hint' }
  | { type: 'tick' }
  | { type: 'pause'; paused: boolean }

const HISTORY = 200

export function newGame(difficulty: Difficulty, puzzle: Grid, solution: Grid): Game {
  return {
    difficulty,
    puzzle,
    solution,
    values: puzzle.slice(),
    notes: Array(CELLS).fill(0),
    selected: puzzle.indexOf(0),
    noteMode: false,
    elapsed: 0,
    paused: false,
    won: false,
    hints: 0,
    past: [],
    future: [],
  }
}

export const hasNote = (notes: number, digit: number) => (notes & (1 << digit)) !== 0
export const noteDigits = (notes: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => hasNote(notes, d))

/** Records the current board for undo and applies the new one. */
function commit(game: Game, values: Grid, notes: number[]): Game {
  const past = [...game.past, { values: game.values, notes: game.notes }].slice(-HISTORY)
  const won = values.every((digit, cell) => digit === game.solution[cell])
  return { ...game, values, notes, past, future: [], won, paused: false }
}

/** Puts a digit in a cell, clearing that cell's marks and the digit's marks on its peers. */
function place(game: Game, cell: number, digit: number): Game {
  const values = game.values.slice()
  values[cell] = digit
  const notes = game.notes.slice()
  notes[cell] = 0
  if (digit) for (const peer of PEERS[cell]) notes[peer] &= ~(1 << digit)
  return commit(game, values, notes)
}

const wrap = (n: number) => (n + 9) % 9

export function reducer(game: Game, action: Action): Game {
  if (action.type === 'new') return newGame(action.difficulty, action.puzzle, action.solution)
  if (action.type === 'pause') return game.won || game.paused === action.paused ? game : { ...game, paused: action.paused }
  if (action.type === 'tick') return game.won || game.paused ? game : { ...game, elapsed: game.elapsed + 1 }
  // Everything below needs a visible, unfinished board.
  if (game.won || game.paused) return game

  const { selected } = game
  const editable = game.puzzle[selected] === 0
  switch (action.type) {
    case 'select':
      return action.cell >= 0 && action.cell < CELLS ? { ...game, selected: action.cell } : game
    case 'move':
      return { ...game, selected: wrap(rowOf(selected) + action.rows) * 9 + wrap(colOf(selected) + action.cols) }
    case 'noteMode':
      return { ...game, noteMode: !game.noteMode }
    case 'digit': {
      if (!editable || action.digit < 1 || action.digit > 9) return game
      if (action.note ?? game.noteMode) {
        if (game.values[selected]) return game
        const notes = game.notes.slice()
        notes[selected] ^= 1 << action.digit
        return commit(game, game.values, notes)
      }
      // Typing the digit a cell already holds clears it.
      return place(game, selected, game.values[selected] === action.digit ? 0 : action.digit)
    }
    case 'erase': {
      if (!editable || (!game.values[selected] && !game.notes[selected])) return game
      const values = game.values.slice()
      const notes = game.notes.slice()
      values[selected] = 0
      notes[selected] = 0
      return commit(game, values, notes)
    }
    case 'undo': {
      const previous = game.past.at(-1)
      if (!previous) return game
      return {
        ...game,
        ...previous,
        past: game.past.slice(0, -1),
        future: [{ values: game.values, notes: game.notes }, ...game.future],
      }
    }
    case 'redo': {
      const [next, ...future] = game.future
      if (!next) return game
      return { ...game, ...next, past: [...game.past, { values: game.values, notes: game.notes }], future }
    }
    case 'hint': {
      // Fix the selected cell if it's empty or wrong, otherwise the first such cell on the board.
      const wrong = (cell: number) => game.values[cell] !== game.solution[cell]
      const cell = wrong(selected) ? selected : game.values.findIndex((_, c) => wrong(c))
      if (cell === -1) return game
      return { ...place({ ...game, selected: cell }, cell, game.solution[cell]), hints: game.hints + 1 }
    }
  }
}

/** Fastest solve per difficulty, in seconds. */
export type BestTimes = Partial<Record<Difficulty, number>>

/** The game plus what a win updates: best times, and the result to celebrate until dismissed. */
export type Session = { game: Game; best: BestTimes; result: { newBest: boolean } | null }
export type SessionAction = Action | { type: 'dismiss' }

export function sessionReducer(session: Session, action: SessionAction): Session {
  if (action.type === 'dismiss') return session.result ? { ...session, result: null } : session
  const game = reducer(session.game, action)
  if (game === session.game) return session
  if (!game.won || session.game.won) return { ...session, game, result: action.type === 'new' ? null : session.result }
  const previous = session.best[game.difficulty]
  const newBest = previous === undefined || game.elapsed < previous
  return {
    game,
    best: newBest ? { ...session.best, [game.difficulty]: game.elapsed } : session.best,
    result: { newBest },
  }
}
