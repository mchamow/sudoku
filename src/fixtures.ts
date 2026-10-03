import { parseGrid } from './sudoku'

// A well-known puzzle with a unique solution, for tests.
export const PUZZLE = parseGrid(`
  530070000 600195000 098000060
  800060003 400803001 700020006
  060000280 000419005 000080079`)
export const SOLUTION = parseGrid(`
  534678912 672195348 198342567
  859761423 426853791 713924856
  961537284 287419635 345286179`)
