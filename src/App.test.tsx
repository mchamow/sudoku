import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { PUZZLE, SOLUTION } from './fixtures'
import { newGame, type Game } from './game'
import { loadBest, loadGame, saveBest, saveGame } from './store'

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const board = () => screen.getByRole('grid', { name: 'Sudoku board' })
const cell = (row: number, col: number) =>
  within(board()).getByRole('button', { name: new RegExp(`^Row ${row}, column ${col}\\b`) })
const label = (row: number, col: number) => cell(row, col).getAttribute('aria-label')
const isSelected = (row: number, col: number) => cell(row, col).parentElement!.getAttribute('aria-selected') === 'true'
const button = (name: string | RegExp) => screen.getByRole('button', { name })
const key = (k: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(window, { key: k, ...init })
const digitKey = (d: number, init: KeyboardEventInit = {}) => key(String(d), { code: `Digit${d}`, ...init })
const givens = () => within(board()).getAllByRole('button', { name: /, given/ }).length
const timer = () => screen.getByRole('timer', { name: 'Time' })

/** Starts the app on the classic test puzzle, r1c3 (answer 4) selected. */
const renderWith = (game: Partial<Game> = {}) => {
  saveGame({ ...newGame('easy', PUZZLE, SOLUTION), ...game })
  return render(<App />)
}
/** Every cell but r1c3 filled in correctly. */
const almostSolved = () => SOLUTION.map((d, i) => (i === 2 ? 0 : d))

describe('first visit', () => {
  it('generates an easy puzzle and saves it', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Sudoku' })).toBeTruthy()
    expect(screen.getByText('Easy')).toBeTruthy()
    expect(givens()).toBe(38)
    expect(loadGame()?.difficulty).toBe('easy')
    expect(timer().textContent).toBe('0:00')
  })
})

describe('entering digits', () => {
  it('fills the selected cell from the number pad', () => {
    renderWith()
    expect(isSelected(1, 3)).toBe(true)
    fireEvent.click(button('Enter 4'))
    expect(label(1, 3)).toBe('Row 1, column 3: 4')
  })

  it('selects a cell by clicking and fills it from the keyboard', () => {
    renderWith()
    fireEvent.click(cell(1, 4))
    expect(isSelected(1, 4)).toBe(true)
    digitKey(6)
    expect(label(1, 4)).toBe('Row 1, column 4: 6')
  })

  it('moves with the arrow keys', () => {
    renderWith()
    key('ArrowRight')
    key('ArrowDown')
    expect(isSelected(2, 4)).toBe(true)
    key('ArrowUp')
    key('ArrowUp')
    expect(isSelected(9, 4)).toBe(true)
  })

  it("won't change a given", () => {
    renderWith()
    fireEvent.click(cell(1, 1))
    digitKey(9)
    expect(label(1, 1)).toBe('Row 1, column 1: 5, given')
  })

  it('erases with Backspace and the Erase button', () => {
    renderWith()
    digitKey(4)
    key('Backspace')
    expect(label(1, 3)).toBe('Row 1, column 3: empty')
    digitKey(4)
    fireEvent.click(button('Erase'))
    expect(label(1, 3)).toBe('Row 1, column 3: empty')
  })

  it('shows how many of each digit are left and disables a finished digit', () => {
    renderWith({ values: PUZZLE.map((d, i) => (SOLUTION[i] === 9 ? 9 : d)) })
    expect((button('Enter 9') as HTMLButtonElement).disabled).toBe(true)
    expect(button('Enter 5').textContent).toBe('56') // digit 5, 6 left
  })
})

describe('conflicts', () => {
  it('flags both cells of a clash and clears when fixed', () => {
    renderWith()
    digitKey(5) // r1c1 holds a 5
    expect(label(1, 3)).toBe('Row 1, column 3: 5, conflict')
    expect(label(1, 1)).toBe('Row 1, column 1: 5, given, conflict')
    digitKey(4)
    expect(label(1, 1)).toBe('Row 1, column 1: 5, given')
  })
})

describe('notes', () => {
  it('toggles pencil marks in notes mode', () => {
    renderWith()
    const notes = button('Notes')
    fireEvent.click(notes)
    expect(notes.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button('Note 1'))
    fireEvent.click(button('Note 2'))
    expect(label(1, 3)).toBe('Row 1, column 3: empty, notes 1 2')
    key('n')
    expect(notes.getAttribute('aria-pressed')).toBe('false')
    expect(button('Enter 1')).toBeTruthy()
  })

  it('toggles a note with Shift+digit and clears it from peers when a digit is placed', () => {
    renderWith()
    digitKey(4, { key: '$', shiftKey: true })
    key('ArrowRight')
    digitKey(4, { key: '$', shiftKey: true })
    digitKey(2, { key: '@', shiftKey: true })
    expect(label(1, 4)).toBe('Row 1, column 4: empty, notes 2 4')
    key('ArrowLeft')
    digitKey(4)
    expect(label(1, 4)).toBe('Row 1, column 4: empty, notes 2')
  })
})

describe('undo and redo', () => {
  it('undoes and redoes with buttons and shortcuts', () => {
    renderWith()
    expect((button('Undo') as HTMLButtonElement).disabled).toBe(true)
    digitKey(4)
    key('ArrowRight')
    digitKey(6)
    fireEvent.click(button('Undo'))
    expect(label(1, 4)).toBe('Row 1, column 4: empty')
    key('z', { ctrlKey: true })
    expect(label(1, 3)).toBe('Row 1, column 3: empty')
    fireEvent.click(button('Redo'))
    expect(label(1, 3)).toBe('Row 1, column 3: 4')
    key('z', { metaKey: true, shiftKey: true })
    expect(label(1, 4)).toBe('Row 1, column 4: 6')
    expect((button('Redo') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('hints', () => {
  it('fills in the answer for the selected cell', () => {
    renderWith()
    fireEvent.click(button('Hint'))
    expect(label(1, 3)).toBe('Row 1, column 3: 4')
    key('h')
    expect(label(1, 4)).toBe('Row 1, column 4: 6')
    expect(isSelected(1, 4)).toBe(true)
  })
})

describe('timer and pause', () => {
  it('counts seconds and stops while paused, hiding the board', () => {
    vi.useFakeTimers()
    renderWith()
    act(() => vi.advanceTimersByTime(3000))
    expect(timer().textContent).toBe('0:03')
    fireEvent.click(button('Pause'))
    expect(screen.getByText('Paused')).toBeTruthy()
    expect(label(1, 1)).toBe('Row 1, column 1')
    act(() => vi.advanceTimersByTime(5000))
    expect(timer().textContent).toBe('0:03')
    fireEvent.click(screen.getAllByRole('button', { name: 'Resume' })[0])
    act(() => vi.advanceTimersByTime(1000))
    expect(timer().textContent).toBe('0:04')
    key('p')
    expect(screen.getByText('Paused')).toBeTruthy()
  })

  it('pauses when the tab is hidden', () => {
    renderWith()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(screen.getByText('Paused')).toBeTruthy()
    vi.restoreAllMocks()
  })
})

describe('winning', () => {
  it('celebrates a solve, records the best time and offers a new game', () => {
    renderWith({ values: almostSolved(), elapsed: 125 })
    digitKey(4)
    const dialog = screen.getByRole('dialog', { name: 'Solved!' })
    expect(within(dialog).getByText('Easy puzzle in 2:05 without hints.')).toBeTruthy()
    expect(within(dialog).getByText(/New best time for easy/)).toBeTruthy()
    expect(loadBest()).toEqual({ easy: 125 })
    fireEvent.click(within(dialog).getByRole('button', { name: 'New game' }))
    const picker = screen.getByRole('dialog', { name: 'New game' })
    expect(within(picker).getByRole('button', { name: /Easy.*Best 2:05/ })).toBeTruthy()
  })

  it('counts hints and keeps a faster earlier best', () => {
    saveBest({ easy: 60 })
    renderWith({ values: almostSolved(), elapsed: 125 })
    key('h')
    const dialog = screen.getByRole('dialog', { name: 'Solved!' })
    expect(within(dialog).getByText('Easy puzzle in 2:05 with 1 hint.')).toBeTruthy()
    expect(within(dialog).queryByText(/New best/)).toBeNull()
    expect(loadBest()).toEqual({ easy: 60 })
  })

  it("doesn't celebrate again when a solved game is reloaded", () => {
    renderWith({ values: SOLUTION, elapsed: 125 })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(/Solved in 2:05/)).toBeTruthy()
    expect((button('Enter 1') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('new game', () => {
  it('starts a puzzle of the chosen difficulty', () => {
    renderWith({ elapsed: 30 })
    fireEvent.click(button('New game'))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'New game' })).getByRole('button', { name: /^Hard/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Hard')).toBeTruthy()
    expect(givens()).toBe(24)
    expect(timer().textContent).toBe('0:00')
  })

  it('ignores game shortcuts while a dialog is open', () => {
    renderWith()
    fireEvent.click(button('New game'))
    digitKey(4)
    expect(loadGame()?.values[2]).toBe(0)
  })
})

describe('saving', () => {
  it('restores the board after a reload', () => {
    const { unmount } = renderWith()
    digitKey(4)
    key('ArrowDown')
    digitKey(7, { key: '&', shiftKey: true })
    unmount()
    render(<App />)
    expect(label(1, 3)).toBe('Row 1, column 3: 4')
    expect(label(2, 3)).toBe('Row 2, column 3: empty, notes 7')
    expect(isSelected(2, 3)).toBe(true)
  })

  it('starts a new game when the save is corrupt', () => {
    localStorage.setItem('sudoku:game', '{"values": "broken"')
    render(<App />)
    expect(givens()).toBe(38)
  })
})
