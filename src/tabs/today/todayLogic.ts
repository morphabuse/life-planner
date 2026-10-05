// Логика вкладки «Сегодня». Своих расчётов почти нет — собираем готовое
// из «Смен», «Недели» и «Денег», чтобы ничего не дублировать.
import type { ShiftsData } from '../../types'
import { addDays } from '../../utils/date'
import { findNextShift, getEntry } from '../shifts/schedule'

// Что показать про смену.
export type ShiftFocus =
  | { kind: 'shift'; date: string; when: 'today' | 'tomorrow' } // смена сегодня или завтра
  | { kind: 'later'; date: string } // сегодня и завтра смен нет, ближайшая позже
  | { kind: 'none' } // смен впереди не отмечено

export function shiftFocus(today: string, shifts: ShiftsData): ShiftFocus {
  const candidates = [
    { date: today, when: 'today' as const },
    { date: addDays(today, 1), when: 'tomorrow' as const },
  ]
  for (const { date, when } of candidates) {
    const entry = getEntry(date, shifts)
    if (entry?.status === 'shift') return { kind: 'shift', date, when }
  }
  const next = findNextShift(addDays(today, 2), shifts)
  return next ? { kind: 'later', date: next } : { kind: 'none' }
}
