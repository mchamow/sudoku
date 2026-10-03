import { describe, expect, it } from 'vitest'
import { PUZZLE, SOLUTION } from './fixtures'
import {
  boxOf,
  CLUES,
  conflicts,
  DIFFICULTIES,
  digitCounts,
  generate,
  hasUniqueSolution,
  mulberry32,
  parseGrid,
  PEERS,
  searchSolutions,
  solve,
} from './sudoku'

const isValidSolution = (grid: number[]) => grid.every((d) => d >= 1 && d <= 9) && conflicts(grid).size === 0

describe('grid geometry', () => {
  it('gives every cell 20 distinct peers', () => {
    for (const peers of PEERS) expect(new Set(peers).size).toBe(20)
    expect(PEERS[0]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 27, 36, 45, 54, 63, 72])
  })

  it('numbers boxes left to right, top to bottom', () => {
    expect([0, 8, 27, 40, 80].map(boxOf)).toEqual([0, 2, 3, 4, 8])
  })
})

describe('parseGrid', () => {
  it('reads digits with dots or zeros for blanks', () => {
    expect(parseGrid('.'.repeat(80) + '9').at(-1)).toBe(9)
    expect(parseGrid('0'.repeat(81)).every((d) => d === 0)).toBe(true)
  })

  it('rejects the wrong length or characters', () => {
    expect(() => parseGrid('1'.repeat(80))).toThrow()
    expect(() => parseGrid('x'.repeat(81))).toThrow()
  })
})

describe('conflicts', () => {
  it('finds both cells of a clash in a row, column and box', () => {
    const grid = Array(81).fill(0)
    grid[0] = 5
    grid[8] = 5 // same row
    grid[72] = 3 // row 9, column 1
    grid[55] = 3 // row 7, column 2: same box
    expect([...conflicts(grid)].sort((a, b) => a - b)).toEqual([0, 8, 55, 72])
  })

  it('finds none in a solved grid', () => {
    expect(conflicts(SOLUTION).size).toBe(0)
  })
})

it('counts digits on the board', () => {
  const counts = digitCounts(PUZZLE)
  expect(counts[5]).toBe(3)
  expect(counts.reduce((a, b) => a + b)).toBe(PUZZLE.filter(Boolean).length)
})

describe('solver', () => {
  it('solves a puzzle', () => {
    expect(solve(PUZZLE)).toEqual(SOLUTION)
  })

  it('knows a classic puzzle has one solution and an empty grid has many', () => {
    expect(hasUniqueSolution(PUZZLE)).toBe(true)
    expect(searchSolutions(Array(81).fill(0), 2).count).toBe(2)
  })

  it('reports no solution for clashing clues', () => {
    const broken = PUZZLE.slice()
    broken[2] = 5
    expect(solve(broken)).toBeNull()
  })
})

describe('generate', () => {
  it.each(DIFFICULTIES)('makes a %s puzzle with one solution that matches the board', (difficulty) => {
    const { puzzle, solution } = generate(difficulty, mulberry32(7))
    expect(isValidSolution(solution)).toBe(true)
    expect(hasUniqueSolution(puzzle)).toBe(true)
    expect(solve(puzzle)).toEqual(solution)
    puzzle.forEach((digit, cell) => digit && expect(digit).toBe(solution[cell]))
    expect(puzzle.filter(Boolean).length).toBe(CLUES[difficulty])
  })

  it('repeats for the same seed and varies otherwise', () => {
    expect(generate('medium', mulberry32(1))).toEqual(generate('medium', mulberry32(1)))
    expect(generate('medium', mulberry32(1)).puzzle).not.toEqual(generate('medium', mulberry32(2)).puzzle)
  })

  it('reaches the hard clue target across many seeds', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(generate('hard', mulberry32(seed)).puzzle.filter(Boolean).length).toBeLessThanOrEqual(CLUES.hard + 1)
    }
  })
})
