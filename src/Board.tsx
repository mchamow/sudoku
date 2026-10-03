import { Play } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { hasNote, noteDigits, type Game } from './game'
import { boxOf, colOf, rowOf } from './sudoku'

type Props = {
  game: Game
  conflicts: Set<number>
  onSelect: (cell: number) => void
  onResume: () => void
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function cellLabel(game: Game, cell: number, conflict: boolean) {
  const digit = game.values[cell]
  const parts = [`Row ${rowOf(cell) + 1}, column ${colOf(cell) + 1}: ${digit || 'empty'}`]
  if (game.puzzle[cell]) parts.push('given')
  if (!digit && game.notes[cell]) parts.push(`notes ${noteDigits(game.notes[cell]).join(' ')}`)
  if (conflict) parts.push('conflict')
  return parts.join(', ')
}

export function Board({ game, conflicts, onSelect, onResume }: Props) {
  const { selected, values, puzzle, notes, paused } = game
  const selectedDigit = values[selected]
  const boardRef = useRef<HTMLDivElement>(null)

  // Keyboard moves change the selection; keep focus on it when focus is already on the board.
  useEffect(() => {
    const board = boardRef.current
    if (board?.contains(document.activeElement) && document.activeElement !== board) {
      board.querySelector<HTMLElement>(`[data-cell="${selected}"]`)?.focus()
    }
  }, [selected])

  return (
    <div className="relative w-full max-w-lg">
      <div
        ref={boardRef}
        role="grid"
        aria-label="Sudoku board"
        className="grid aspect-square w-full grid-cols-9 overflow-hidden rounded-lg border-2 border-foreground/70 bg-card select-none"
      >
        {DIGITS.map((_, row) => (
          <div role="row" key={row} className="contents">
            {DIGITS.map((_, col) => {
              const cell = row * 9 + col
              const digit = values[cell]
              const given = puzzle[cell] !== 0
              const conflict = conflicts.has(cell)
              const isSelected = cell === selected
              const peer =
                rowOf(cell) === rowOf(selected) || colOf(cell) === colOf(selected) || boxOf(cell) === boxOf(selected)
              const sameDigit = !!selectedDigit && digit === selectedDigit
              return (
                <div role="gridcell" key={col} aria-selected={isSelected} className="contents">
                  <button
                    type="button"
                    data-cell={cell}
                    tabIndex={isSelected ? 0 : -1}
                    disabled={paused}
                    aria-label={paused ? `Row ${row + 1}, column ${col + 1}` : cellLabel(game, cell, conflict)}
                    onClick={() => onSelect(cell)}
                    className={cn(
                      'relative flex items-center justify-center border-border text-xl leading-none outline-none sm:text-3xl',
                      'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset',
                      col < 8 && 'border-r',
                      row < 8 && 'border-b',
                      (col === 2 || col === 5) && 'border-r-2 border-r-foreground/50',
                      (row === 2 || row === 5) && 'border-b-2 border-b-foreground/50',
                      paused
                        ? 'bg-card'
                        : isSelected
                          ? 'bg-sky-200 dark:bg-sky-800'
                          : conflict
                            ? 'bg-red-100 dark:bg-red-950/70'
                            : sameDigit
                              ? 'bg-sky-100 dark:bg-sky-950'
                              : peer
                                ? 'bg-neutral-100 dark:bg-neutral-800/60'
                                : 'bg-card hover:bg-muted/60',
                      given ? 'font-semibold text-foreground' : 'text-sky-700 dark:text-sky-300',
                      conflict && !given && 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {paused ? null : digit ? (
                      digit
                    ) : notes[cell] ? (
                      <span aria-hidden className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-0.5 sm:p-1">
                        {DIGITS.map((d) => (
                          <span
                            key={d}
                            className={cn(
                              'flex items-center justify-center text-[0.6rem] leading-none text-muted-foreground sm:text-sm',
                              d === selectedDigit && 'font-bold text-sky-700 dark:text-sky-300',
                            )}
                          >
                            {hasNote(notes[cell], d) ? d : ''}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {paused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/70 backdrop-blur-sm">
          <p className="text-lg font-medium">Paused</p>
          <Button onClick={onResume}>
            <Play data-icon="inline-start" />
            Resume
          </Button>
        </div>
      )}
    </div>
  )
}
