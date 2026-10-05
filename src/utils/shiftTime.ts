// Время смены: значения по умолчанию, быстрые варианты и форматирование.
// Лежит в utils, потому что нужно и хранилищу (миграция), и вкладке.
import type { ShiftTime } from '../types'

export const DEFAULT_SHIFT_TIME: ShiftTime = { start: '22:00', end: '10:00' }

// Быстрые варианты в панели правки дня.
export const TIME_PRESETS: ShiftTime[] = [
  DEFAULT_SHIFT_TIME,
  { start: '17:00', end: '01:00' },
  { start: '17:00', end: '10:00' },
]

const MINUTES_IN_DAY = 24 * 60

// '22:30' → 1350 (минут от полуночи)
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// 1350 → '22:30'. Отрицательные и большие значения «заворачиваются» в сутки:
// -60 → '23:00', 1500 → '01:00'.
export function minutesToTime(minutes: number): string {
  const m = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// Заканчивается ли смена на следующий день.
export function endsNextDay(time: ShiftTime): boolean {
  return timeToMinutes(time.end) <= timeToMinutes(time.start)
}

export function sameTime(a: ShiftTime, b: ShiftTime): boolean {
  return a.start === b.start && a.end === b.end
}

// { start: '22:00', end: '10:00' } → '22:00–10:00'
export function formatTime(time: ShiftTime): string {
  return `${time.start}–${time.end}`
}

// Коротко для календаря: '22:00–10:00' → '22–10', '17:30–02:00' → '17:30–02'
export function formatTimeShort(time: ShiftTime): string {
  const short = (t: string) => (t.endsWith(':00') ? t.slice(0, 2) : t)
  return `${short(time.start)}–${short(time.end)}`
}
