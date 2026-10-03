import { beforeEach, describe, expect, it } from 'vitest'
import { PUZZLE, SOLUTION } from './fixtures'
import { newGame, reducer } from './game'
import { loadBest, loadGame, saveBest, saveGame } from './store'

beforeEach(() => localStorage.clear())

describe('game', () => {
  it('round-trips a game without its undo history', () => {
    const game = reducer({ ...newGame('medium', PUZZLE, SOLUTION), elapsed: 42 }, { type: 'digit', digit: 4 })
    saveGame(game)
    expect(loadGame()).toEqual({ ...game, past: [], future: [] })
  })

  it('returns null when nothing is saved', () => {
    expect(loadGame()).toBeNull()
  })

  it.each([
    ['not JSON', '{oops'],
    ['not an object', '42'],
    ['a short grid', JSON.stringify({ ...newGame('easy', PUZZLE, SOLUTION), values: [1, 2, 3] })],
    ['an unknown difficulty', JSON.stringify({ ...newGame('easy', PUZZLE, SOLUTION), difficulty: 'expert' })],
    ['a clue that disagrees with the solution', JSON.stringify(newGame('easy', SOLUTION.map((d) => (d % 9) + 1), SOLUTION))],
    ['an overwritten clue', JSON.stringify({ ...newGame('easy', PUZZLE, SOLUTION), values: SOLUTION.map(() => 1) })],
    ['a bad selection', JSON.stringify({ ...newGame('easy', PUZZLE, SOLUTION), selected: 99 })],
    ['a negative time', JSON.stringify({ ...newGame('easy', PUZZLE, SOLUTION), elapsed: -5 })],
  ])('returns null for %s', (_, raw) => {
    localStorage.setItem('sudoku:game', raw)
    expect(loadGame()).toBeNull()
  })

  it('works out whether a saved game is already won', () => {
    saveGame({ ...newGame('easy', PUZZLE, SOLUTION), values: SOLUTION })
    expect(loadGame()?.won).toBe(true)
  })
})

describe('best times', () => {
  it('round-trips and drops junk entries', () => {
    saveBest({ easy: 120, hard: 600 })
    expect(loadBest()).toEqual({ easy: 120, hard: 600 })
    localStorage.setItem('sudoku:best', JSON.stringify({ easy: 'fast', medium: 300, expert: 1 }))
    expect(loadBest()).toEqual({ medium: 300 })
    localStorage.setItem('sudoku:best', 'nope')
    expect(loadBest()).toEqual({})
  })
})
