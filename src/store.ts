import type { BestTimes, Game } from './game'
import { CELLS, DIFFICULTIES, type Difficulty, type Grid } from './sudoku'

const GAME_KEY = 'sudoku:game'
const BEST_KEY = 'sudoku:best'

const isGrid = (value: unknown, max: number): value is Grid =>
  Array.isArray(value) &&
  value.length === CELLS &&
  value.every((n) => Number.isInteger(n) && n >= 0 && n <= max)

const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the game still works, it just won't survive a reload.
  }
}

/** The saved game, or null when there is none or it doesn't hold together. */
export function loadGame(): Game | null {
  const saved = read(GAME_KEY) as Partial<Game> | null
  if (!saved || typeof saved !== 'object') return null
  const { difficulty, puzzle, solution, values, notes, selected, elapsed, hints } = saved
  if (
    !DIFFICULTIES.includes(difficulty as Difficulty) ||
    !isGrid(puzzle, 9) ||
    !isGrid(solution, 9) ||
    !isGrid(values, 9) ||
    !isGrid(notes, 0b1111111110) ||
    !isCount(selected) ||
    selected >= CELLS ||
    !isCount(elapsed) ||
    !isCount(hints) ||
    solution.includes(0) ||
    puzzle.some((digit, cell) => digit && (digit !== solution[cell] || values[cell] !== digit))
  ) {
    return null
  }
  return {
    difficulty: difficulty as Difficulty,
    puzzle,
    solution,
    values,
    notes,
    selected,
    noteMode: saved.noteMode === true,
    elapsed,
    paused: saved.paused === true,
    won: values.every((digit, cell) => digit === solution[cell]),
    hints,
    past: [],
    future: [],
  }
}

/** Saves everything but the undo history. */
export function saveGame({ past: _past, future: _future, ...game }: Game) {
  write(GAME_KEY, game)
}

export function loadBest(): BestTimes {
  const saved = read(BEST_KEY)
  if (!saved || typeof saved !== 'object') return {}
  const best: BestTimes = {}
  for (const difficulty of DIFFICULTIES) {
    const seconds = (saved as Record<string, unknown>)[difficulty]
    if (isCount(seconds)) best[difficulty] = seconds
  }
  return best
}

export const saveBest = (best: BestTimes) => write(BEST_KEY, best)
