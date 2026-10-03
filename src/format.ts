/** 75 → "1:15", 3725 → "1:02:05". */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

export const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)
