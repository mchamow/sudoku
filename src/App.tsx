import { Pause, Play, Plus, Trophy } from 'lucide-react'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Board } from './Board'
import { Controls } from './Controls'
import { capitalize, formatTime } from './format'
import { newGame, sessionReducer, type Game, type SessionAction } from './game'
import { loadBest, loadGame, saveBest, saveGame } from './store'
import { CLUES, conflicts as findConflicts, DIFFICULTIES, digitCounts, generate, type Difficulty } from './sudoku'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const freshGame = (difficulty: Difficulty): Game => {
  const { puzzle, solution } = generate(difficulty)
  return newGame(difficulty, puzzle, solution)
}

const MOVES: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

export default function App() {
  const [{ game, best, result }, dispatch] = useReducer(sessionReducer, null, () => ({
    game: loadGame() ?? freshGame('easy'),
    best: loadBest(),
    result: null,
  }))
  const [choosing, setChoosing] = useState(false)

  const conflicts = useMemo(() => findConflicts(game.values), [game.values])
  const counts = useMemo(() => digitCounts(game.values), [game.values])

  useEffect(() => saveGame(game), [game])
  useEffect(() => saveBest(best), [best])

  // The clock runs while the board is visible and unsolved; hiding the tab pauses it.
  useEffect(() => {
    if (game.paused || game.won) return
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(id)
  }, [game.paused, game.won])
  useEffect(() => {
    const onHide = () => document.hidden && dispatch({ type: 'pause', paused: true })
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  const start = (difficulty: Difficulty) => {
    const { puzzle, solution } = generate(difficulty)
    dispatch({ type: 'new', difficulty, puzzle, solution })
    setChoosing(false)
  }

  const togglePause = () => dispatch({ type: 'pause', paused: !game.paused })
  const shortcuts = useRef(togglePause)
  useEffect(() => {
    shortcuts.current = togglePause
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]') || isTyping(event.target)) return
      let action: SessionAction | null = null
      const key = event.key.toLowerCase()
      if (event.ctrlKey || event.metaKey) {
        if (key === 'z') action = { type: event.shiftKey ? 'redo' : 'undo' }
        else if (key === 'y') action = { type: 'redo' }
      } else if (event.altKey) {
        return
      } else if (MOVES[event.key]) {
        const [rows, cols] = MOVES[event.key]
        action = { type: 'move', rows, cols }
      } else if (/^(Digit|Numpad)[1-9]$/.test(event.code) || /^[1-9]$/.test(event.key)) {
        // By physical key, so Shift+digit (which types "!", "@", …) still means the digit: as a note.
        const digit = Number(/[1-9]$/.test(event.code) ? event.code.at(-1) : event.key)
        action = { type: 'digit', digit, note: event.shiftKey || undefined }
      } else if (['Backspace', 'Delete', '0'].includes(event.key)) {
        action = { type: 'erase' }
      } else if (key === 'n') {
        action = { type: 'noteMode' }
      } else if (key === 'h') {
        action = { type: 'hint' }
      } else if (key === 'p') {
        event.preventDefault()
        return shortcuts.current()
      }
      if (!action) return
      event.preventDefault()
      dispatch(action)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <TooltipProvider>
      <main className="mx-auto flex min-h-svh max-w-[48.5rem] flex-col gap-5 px-4 py-6 sm:py-10">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Sudoku</h1>
            <Badge variant="secondary">{capitalize(game.difficulty)}</Badge>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span
              role="timer"
              aria-label="Time"
              className="min-w-12 text-right font-mono sm:text-lg tabular-nums text-muted-foreground"
            >
              {formatTime(game.elapsed)}
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={game.paused ? 'Resume' : 'Pause'}
                    disabled={game.won}
                    onClick={togglePause}
                  />
                }
              >
                {game.paused ? <Play /> : <Pause />}
              </TooltipTrigger>
              <TooltipContent>
                {game.paused ? 'Resume' : 'Pause'} <Kbd>P</Kbd>
              </TooltipContent>
            </Tooltip>
            <Button aria-label="New game" onClick={() => setChoosing(true)}>
              <Plus data-icon="inline-start" />
              New<span className="max-sm:sr-only"> game</span>
            </Button>
          </div>
        </header>

        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start md:justify-center">
          <Board
            game={game}
            conflicts={conflicts}
            onSelect={(cell) => dispatch({ type: 'select', cell })}
            onResume={() => dispatch({ type: 'pause', paused: false })}
          />
          <aside className="flex w-full max-w-lg flex-col gap-4 md:w-60">
            {game.won && (
              <p className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                <Trophy className="size-4" /> Solved in {formatTime(game.elapsed)}
              </p>
            )}
            <Controls game={game} counts={counts} dispatch={dispatch} />
            <dl className="hidden grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs text-muted-foreground md:grid">
              <dt><Kbd>1</Kbd>–<Kbd>9</Kbd></dt>
              <dd>Enter a digit</dd>
              <dt><Kbd>⇧</Kbd> + digit</dt>
              <dd>Toggle a note</dd>
              <dt><Kbd>←</Kbd><Kbd>↑</Kbd><Kbd>↓</Kbd><Kbd>→</Kbd></dt>
              <dd>Move</dd>
              <dt><Kbd>⌫</Kbd></dt>
              <dd>Erase</dd>
              <dt><Kbd>N</Kbd> <Kbd>H</Kbd> <Kbd>P</Kbd></dt>
              <dd>Notes, hint, pause</dd>
            </dl>
          </aside>
        </div>

        <footer className="mt-auto pt-4 text-center text-xs text-muted-foreground">
          Day 16 of{' '}
          <a className="underline underline-offset-4 hover:text-foreground" href="https://github.com/mchamow?tab=repositories">
            100 Days of React
          </a>
        </footer>
      </main>

      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New game</DialogTitle>
            <DialogDescription>Pick a difficulty. The current puzzle will be replaced.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {DIFFICULTIES.map((difficulty) => (
              <Button
                key={difficulty}
                variant="outline"
                className="h-auto justify-between py-3"
                onClick={() => start(difficulty)}
              >
                <span className="flex flex-col items-start">
                  <span className="text-base">{capitalize(difficulty)}</span>
                  <span className="text-xs font-normal text-muted-foreground">{CLUES[difficulty]} clues</span>
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {best[difficulty] === undefined ? 'Not solved yet' : `Best ${formatTime(best[difficulty])}`}
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={result !== null} onOpenChange={(open) => !open && dispatch({ type: 'dismiss' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solved!</DialogTitle>
            <DialogDescription>
              {capitalize(game.difficulty)} puzzle in {formatTime(game.elapsed)}
              {game.hints ? ` with ${game.hints} ${game.hints === 1 ? 'hint' : 'hints'}` : ' without hints'}.
            </DialogDescription>
          </DialogHeader>
          {result?.newBest && (
            <p className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
              <Trophy className="size-4" /> New best time for {game.difficulty}!
            </p>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                dispatch({ type: 'dismiss' })
                setChoosing(true)
              }}
            >
              New game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
