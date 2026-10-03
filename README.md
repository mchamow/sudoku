# 🔢 Sudoku

[![Test and deploy](https://github.com/mchamow/sudoku/actions/workflows/deploy.yml/badge.svg)](https://github.com/mchamow/sudoku/actions/workflows/deploy.yml)

**Day 16 of [100 Days of React](https://github.com/mchamow?tab=repositories)**: Generated sudoku puzzles with notes, hints, undo and keyboard play.

**Live demo:** https://mchamow.github.io/sudoku/

## Features

- **Fresh puzzles every game**, generated in the browser at three difficulties: easy (38 clues), medium (30) and hard (24). Every puzzle has exactly one solution
- **Conflict highlighting**: a digit that clashes with another in its row, column or box turns red, and so does the cell it clashes with. The selected cell's row, column and box are shaded, and every copy of its digit is highlighted
- **Pencil notes**: switch to notes mode or hold <kbd>Shift</kbd> while typing a digit. Placing a digit clears it from the notes of every cell it can see
- **Undo and redo** for every digit, note and erase
- **Hints** fill in the answer for the selected cell, or for the first empty or wrong cell if the selected one is already right
- **Number pad** that shows how many of each digit are left to place
- **Timer** with pause, which hides the board. The clock also pauses when you switch tabs
- **Best time** for each difficulty, shown when you solve a puzzle and when you pick a new one
- **Keyboard play**: arrows move, <kbd>1</kbd>–<kbd>9</kbd> enter a digit, <kbd>Shift</kbd>+digit toggles a note, <kbd>Backspace</kbd>/<kbd>Delete</kbd> erase, <kbd>N</kbd> notes mode, <kbd>H</kbd> hint, <kbd>P</kbd> pause, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Z</kbd> undo, <kbd>Shift</kbd>+<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Z</kbd> or <kbd>Ctrl</kbd>+<kbd>Y</kbd> redo
- The game in progress and the best times are saved to `localStorage`. Corrupt or invalid saved data starts a new game
- Light and dark themes that follow the system, and a layout that works on a 360px phone

## Tech

React 19 · TypeScript · Vite · Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI) · lucide icons · Vitest + Testing Library · deployed to GitHub Pages with GitHub Actions.

The solver ([`src/sudoku.ts`](src/sudoku.ts)) is a backtracking search over bitmasks that always branches on the cell with the fewest candidates. It counts solutions up to a limit, which is how the generator checks uniqueness: it fills a random complete grid, then empties cells in random order and puts a digit back whenever removing it would allow a second solution. A puzzle takes a few milliseconds. All game rules (placing digits, notes, undo history, hints, the clock, winning) are one pure reducer in [`src/game.ts`](src/game.ts).

## Run locally

```bash
pnpm install
pnpm dev
pnpm test   # 75 unit and component tests (Vitest)
```
