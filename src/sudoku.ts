/** A 9×9 grid in row-major order: 81 digits, 0 for an empty cell. */
export type Grid = number[]
export type Rng = () => number

export const CELLS = 81
export const rowOf = (cell: number) => Math.floor(cell / 9)
export const colOf = (cell: number) => cell % 9
export const boxOf = (cell: number) => 3 * Math.floor(rowOf(cell) / 3) + Math.floor(colOf(cell) / 3)

/** The 20 cells sharing a row, column or box with each cell. */
export const PEERS: number[][] = Array.from({ length: CELLS }, (_, cell) =>
  Array.from({ length: CELLS }, (_, other) => other).filter(
    (other) =>
      other !== cell &&
      (rowOf(other) === rowOf(cell) || colOf(other) === colOf(cell) || boxOf(other) === boxOf(cell)),
  ),
)

/** Parses 81 characters of digits, with `0` or `.` for empty cells; whitespace is ignored. */
export function parseGrid(text: string): Grid {
  const chars = text.replace(/\s/g, '')
  if (!/^[0-9.]{81}$/.test(chars)) throw new Error('a grid is 81 digits or dots')
  return [...chars].map((char) => (char === '.' ? 0 : Number(char)))
}

/** Cells whose digit also appears in one of their peers. */
export function conflicts(values: Grid): Set<number> {
  const found = new Set<number>()
  values.forEach((digit, cell) => {
    if (digit && PEERS[cell].some((peer) => values[peer] === digit)) found.add(cell)
  })
  return found
}

/** How many times each digit 1–9 appears on the grid (index 0 unused). */
export function digitCounts(values: Grid): number[] {
  const counts = Array<number>(10).fill(0)
  for (const digit of values) if (digit) counts[digit]++
  return counts
}

const ALL = 0b1111111110 // bits 1–9

const popcount = (mask: number) => {
  let n = 0
  for (; mask; mask &= mask - 1) n++
  return n
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

/**
 * Backtracking search that always branches on the cell with the fewest candidates. Stops after
 * `limit` solutions; with `rng`, tries digits in random order (used to make random full grids).
 */
export function searchSolutions(grid: Grid, limit: number, rng?: Rng): { count: number; first: Grid | null } {
  const g = grid.slice()
  const rows = Array<number>(9).fill(0)
  const cols = Array<number>(9).fill(0)
  const boxes = Array<number>(9).fill(0)
  for (let cell = 0; cell < CELLS; cell++) {
    if (!g[cell]) continue
    const bit = 1 << g[cell]
    if ((rows[rowOf(cell)] | cols[colOf(cell)] | boxes[boxOf(cell)]) & bit) return { count: 0, first: null }
    rows[rowOf(cell)] |= bit
    cols[colOf(cell)] |= bit
    boxes[boxOf(cell)] |= bit
  }

  let count = 0
  let first: Grid | null = null
  const search = (): boolean => {
    let best = -1
    let bestMask = 0
    let bestSize = 10
    for (let cell = 0; cell < CELLS; cell++) {
      if (g[cell]) continue
      const mask = ALL & ~(rows[rowOf(cell)] | cols[colOf(cell)] | boxes[boxOf(cell)])
      const size = popcount(mask)
      if (size === 0) return false
      if (size < bestSize) {
        best = cell
        bestMask = mask
        bestSize = size
        if (size === 1) break
      }
    }
    if (best === -1) {
      count++
      first ??= g.slice()
      return count >= limit
    }
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => bestMask & (1 << d))
    if (rng) shuffle(digits, rng)
    const [r, c, b] = [rowOf(best), colOf(best), boxOf(best)]
    for (const digit of digits) {
      const bit = 1 << digit
      g[best] = digit
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      const done = search()
      g[best] = 0
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
      if (done) return true
    }
    return false
  }
  search()
  return { count, first }
}

export const solve = (grid: Grid): Grid | null => searchSolutions(grid, 1).first
export const hasUniqueSolution = (grid: Grid) => searchSolutions(grid, 2).count === 1

export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
/** Clues left on the board: fewer clues, fewer easy deductions. */
export const CLUES: Record<Difficulty, number> = { easy: 38, medium: 30, hard: 24 }

/**
 * A random puzzle with exactly one solution: fill a random complete grid, then empty cells in random
 * order, putting a digit back whenever removing it would allow a second solution. Some grids get stuck
 * above the clue target (every remaining clue is needed), so a few attempts keep the sparsest.
 */
export function generate(difficulty: Difficulty, rng: Rng = Math.random): { puzzle: Grid; solution: Grid } {
  let best: { puzzle: Grid; solution: Grid; clues: number } | null = null
  for (let attempt = 0; attempt < 10 && (!best || best.clues > CLUES[difficulty]); attempt++) {
    const solution = searchSolutions(Array(CELLS).fill(0), 1, rng).first!
    const puzzle = solution.slice()
    let clues = CELLS
    for (const cell of shuffle([...Array(CELLS).keys()], rng)) {
      if (clues <= CLUES[difficulty]) break
      puzzle[cell] = 0
      if (hasUniqueSolution(puzzle)) clues--
      else puzzle[cell] = solution[cell]
    }
    if (!best || clues < best.clues) best = { puzzle, solution, clues }
  }
  return { puzzle: best!.puzzle, solution: best!.solution }
}

/** A small seeded generator, so tests can ask for the same puzzle twice. */
export function mulberry32(seed: number): Rng {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
