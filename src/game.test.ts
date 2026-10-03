import { describe, expect, it } from 'vitest'
import { PUZZLE, SOLUTION } from './fixtures'
import { hasNote, newGame, noteDigits, reducer, sessionReducer, type Action, type Game, type Session } from './game'

const start = () => newGame('easy', PUZZLE, SOLUTION)
const run = (game: Game, ...actions: Action[]) => actions.reduce(reducer, game)
const at = (row: number, col: number) => (row - 1) * 9 + (col - 1)
const select = (row: number, col: number): Action => ({ type: 'select', cell: at(row, col) })
const digit = (d: number, note?: boolean): Action => ({ type: 'digit', digit: d, note })

/** The game one move from solved: every cell but r1c3 filled in correctly. */
const almostSolved = () => {
  const game = start()
  return { ...game, values: SOLUTION.map((d, cell) => (cell === at(1, 3) ? 0 : d)), selected: at(1, 3) }
}

describe('newGame', () => {
  it('starts on the first empty cell with the clues as values', () => {
    const game = start()
    expect(game.selected).toBe(at(1, 3))
    expect(game.values).toEqual(PUZZLE)
    expect(game).toMatchObject({ elapsed: 0, won: false, paused: false, hints: 0, noteMode: false })
  })
})

describe('selection', () => {
  it('selects a cell and moves with wrap-around', () => {
    let game = run(start(), select(1, 1))
    expect(game.selected).toBe(at(1, 1))
    game = run(game, { type: 'move', rows: -1, cols: 0 })
    expect(game.selected).toBe(at(9, 1))
    game = run(game, { type: 'move', rows: 0, cols: -1 })
    expect(game.selected).toBe(at(9, 9))
    game = run(game, { type: 'move', rows: 1, cols: 1 })
    expect(game.selected).toBe(at(1, 1))
  })

  it('ignores cells off the board', () => {
    const game = start()
    expect(run(game, { type: 'select', cell: 81 })).toBe(game)
  })
})

describe('digits', () => {
  it('places a digit in an empty cell, and the same digit again clears it', () => {
    let game = run(start(), digit(4))
    expect(game.values[at(1, 3)]).toBe(4)
    game = run(game, digit(4))
    expect(game.values[at(1, 3)]).toBe(0)
  })

  it('accepts wrong digits (the board shows the clash) but never changes a clue', () => {
    const game = run(start(), digit(5))
    expect(game.values[at(1, 3)]).toBe(5)
    const clue = run(start(), select(1, 1))
    expect(run(clue, digit(9))).toBe(clue)
  })

  it('erases a cell, and does nothing for an empty cell or a clue', () => {
    const game = run(start(), digit(4), { type: 'erase' })
    expect(game.values[at(1, 3)]).toBe(0)
    expect(run(game, { type: 'erase' })).toBe(game)
    const clue = run(start(), select(1, 1))
    expect(run(clue, { type: 'erase' })).toBe(clue)
  })
})

describe('notes', () => {
  it('toggles pencil marks in note mode or with an explicit note', () => {
    let game = run(start(), { type: 'noteMode' }, digit(1), digit(2))
    expect(noteDigits(game.notes[at(1, 3)])).toEqual([1, 2])
    game = run(game, digit(1))
    expect(noteDigits(game.notes[at(1, 3)])).toEqual([2])
    game = run(start(), digit(7, true))
    expect(hasNote(game.notes[at(1, 3)], 7)).toBe(true)
    expect(game.values[at(1, 3)]).toBe(0)
  })

  it("doesn't mark a cell that holds a digit", () => {
    const game = run(start(), digit(4))
    expect(run(game, digit(1, true))).toBe(game)
  })

  it("placing a digit clears that cell's marks and the digit from its peers' marks", () => {
    let game = run(start(), digit(4, true), digit(2, true), select(1, 4), digit(4, true), select(9, 3), digit(4, true))
    game = run(game, select(2, 2), digit(4, true), select(1, 3), digit(4))
    expect(game.notes[at(1, 3)]).toBe(0)
    expect(hasNote(game.notes[at(1, 4)], 4)).toBe(false) // same row
    expect(hasNote(game.notes[at(9, 3)], 4)).toBe(false) // same column
    expect(hasNote(game.notes[at(2, 2)], 4)).toBe(false) // same box
  })
})

describe('undo and redo', () => {
  it('steps back and forth through edits, and a new edit drops the redo trail', () => {
    let game = run(start(), digit(4), select(1, 4), digit(1, true), digit(6))
    game = run(game, { type: 'undo' })
    expect(game.values[at(1, 4)]).toBe(0)
    game = run(game, { type: 'undo' }, { type: 'undo' })
    expect(game.values).toEqual(PUZZLE)
    expect(run(game, { type: 'undo' })).toBe(game)
    game = run(game, { type: 'redo' })
    expect(game.values[at(1, 3)]).toBe(4)
    expect(game.future).toHaveLength(2)
    game = run(game, select(2, 2), digit(7))
    expect(game.future).toHaveLength(0)
    expect(run(game, { type: 'redo' })).toBe(game)
  })

  it('restores pencil marks cleared by placing a digit', () => {
    let game = run(start(), select(1, 4), digit(6, true), select(1, 3), digit(6))
    game = run(game, { type: 'undo' })
    expect(hasNote(game.notes[at(1, 4)], 6)).toBe(true)
  })

  it("doesn't record selection moves", () => {
    expect(run(start(), select(5, 5)).past).toHaveLength(0)
  })
})

describe('hints', () => {
  it('fills the selected cell with its answer', () => {
    const game = run(start(), { type: 'hint' })
    expect(game.values[at(1, 3)]).toBe(4)
    expect(game.hints).toBe(1)
  })

  it('corrects a wrong digit', () => {
    const game = run(start(), digit(9), { type: 'hint' })
    expect(game.values[at(1, 3)]).toBe(4)
  })

  it('picks the first unsolved cell when the selected one is fine', () => {
    const game = run(start(), select(1, 1), { type: 'hint' })
    expect(game.selected).toBe(at(1, 3))
    expect(game.values[at(1, 3)]).toBe(4)
  })
})

describe('clock and pause', () => {
  it('ticks while playing, not while paused', () => {
    let game = run(start(), { type: 'tick' }, { type: 'tick' })
    expect(game.elapsed).toBe(2)
    game = run(game, { type: 'pause', paused: true }, { type: 'tick' })
    expect(game.elapsed).toBe(2)
  })

  it('locks the board while paused', () => {
    const paused = run(start(), { type: 'pause', paused: true })
    expect(run(paused, digit(4))).toBe(paused)
    expect(run(paused, select(5, 5))).toBe(paused)
    expect(run(paused, { type: 'pause', paused: false }).paused).toBe(false)
  })
})

describe('winning', () => {
  it('wins on the last correct digit, then freezes the board and clock', () => {
    const game = run(almostSolved(), { type: 'tick' }, digit(4))
    expect(game.won).toBe(true)
    expect(run(game, { type: 'tick' }).elapsed).toBe(1)
    expect(run(game, { type: 'undo' })).toBe(game)
    expect(run(game, { type: 'pause', paused: true })).toBe(game)
  })

  it("doesn't win with a wrong last digit", () => {
    expect(run(almostSolved(), digit(5)).won).toBe(false)
  })

  it('a new game starts fresh', () => {
    const game = run(almostSolved(), digit(4), { type: 'new', difficulty: 'hard', puzzle: PUZZLE, solution: SOLUTION })
    expect(game).toMatchObject({ won: false, difficulty: 'hard', elapsed: 0 })
  })
})

describe('session', () => {
  const session = (game: Game, best: Session['best'] = {}): Session => ({ game, best, result: null })

  it('records a first solve as the best time and celebrates it', () => {
    const solved = sessionReducer(session({ ...almostSolved(), elapsed: 90 }), digit(4))
    expect(solved.best).toEqual({ easy: 90 })
    expect(solved.result).toEqual({ newBest: true })
    expect(sessionReducer(solved, { type: 'dismiss' }).result).toBeNull()
  })

  it('keeps a faster best time', () => {
    const solved = sessionReducer(session({ ...almostSolved(), elapsed: 90 }, { easy: 60, hard: 300 }), digit(4))
    expect(solved.best).toEqual({ easy: 60, hard: 300 })
    expect(solved.result).toEqual({ newBest: false })
  })

  it('returns the same session for actions that change nothing', () => {
    const s = session(start())
    expect(sessionReducer(s, { type: 'undo' })).toBe(s)
    expect(sessionReducer(s, { type: 'dismiss' })).toBe(s)
  })
})
