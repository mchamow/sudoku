import { Eraser, Lightbulb, Pencil, Redo2, Undo2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Action, Game } from './game'

type Props = {
  game: Game
  counts: number[]
  dispatch: (action: Action) => void
}

type ToolProps = {
  icon: LucideIcon
  label: string
  shortcut: ReactNode
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
}

function Tool({ icon: Icon, label, shortcut, onClick, disabled, pressed }: ToolProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={pressed ? 'default' : 'outline'}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
            className="h-auto flex-col gap-1 px-1 py-2 text-xs"
          />
        }
      >
        <Icon className="size-5!" />
        {label}
      </TooltipTrigger>
      <TooltipContent>
        {label} {shortcut}
      </TooltipContent>
    </Tooltip>
  )
}

export function Controls({ game, counts, dispatch }: Props) {
  const locked = game.paused || game.won
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid grid-cols-5 gap-1.5">
        <Tool
          icon={Undo2}
          label="Undo"
          shortcut={<Kbd>⌘Z</Kbd>}
          disabled={locked || !game.past.length}
          onClick={() => dispatch({ type: 'undo' })}
        />
        <Tool
          icon={Redo2}
          label="Redo"
          shortcut={<Kbd>⇧⌘Z</Kbd>}
          disabled={locked || !game.future.length}
          onClick={() => dispatch({ type: 'redo' })}
        />
        <Tool icon={Eraser} label="Erase" shortcut={<Kbd>⌫</Kbd>} disabled={locked} onClick={() => dispatch({ type: 'erase' })} />
        <Tool
          icon={Pencil}
          label="Notes"
          shortcut={<Kbd>N</Kbd>}
          pressed={game.noteMode}
          disabled={locked}
          onClick={() => dispatch({ type: 'noteMode' })}
        />
        <Tool icon={Lightbulb} label="Hint" shortcut={<Kbd>H</Kbd>} disabled={locked} onClick={() => dispatch({ type: 'hint' })} />
      </div>

      <div role="group" aria-label="Number pad" className="grid grid-cols-9 gap-1 md:grid-cols-3 md:gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
          const left = Math.max(0, 9 - counts[digit])
          return (
            <Button
              key={digit}
              variant="outline"
              aria-label={game.noteMode ? `Note ${digit}` : `Enter ${digit}`}
              disabled={locked || left === 0}
              onClick={() => dispatch({ type: 'digit', digit })}
              className={cn(
                'relative h-12 flex-col gap-0 px-0 text-xl md:h-16 md:text-2xl',
                game.noteMode && 'text-muted-foreground',
              )}
            >
              {digit}
              <span className="text-[0.65rem] leading-none font-normal text-muted-foreground tabular-nums" aria-hidden>
                {left}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
