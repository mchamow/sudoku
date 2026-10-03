import { expect, it } from 'vitest'
import { capitalize, formatTime } from './format'

it('formats seconds as m:ss or h:mm:ss', () => {
  expect(formatTime(0)).toBe('0:00')
  expect(formatTime(75)).toBe('1:15')
  expect(formatTime(3725)).toBe('1:02:05')
})

it('capitalizes a word', () => {
  expect(capitalize('hard')).toBe('Hard')
})
