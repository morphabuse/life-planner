// Логика вкладки «Сегодня». Своих расчётов почти нет — собираем готовое
// из «Смен», «Недели», «Привычек» и «Денег», чтобы ничего не дублировать.
import type { DayStatus, HabitsData, ShiftsData } from '../../types'
import { addDays } from '../../utils/date'
import { findNextShift, getEntry } from '../shifts/schedule'
import { AUTO_SHIFTS_NAME, dayStreak, shiftStreak } from '../habits/habitsLogic'

// Что дальше со сменами — для подзаголовка статуса дня.
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
    if (getEntry(date, shifts)?.status === 'shift') return { kind: 'shift', date, when }
  }
  const next = findNextShift(addDays(today, 2), shifts)
  return next ? { kind: 'later', date: next } : { kind: 'none' }
}

// Статус сегодняшнего дня (null — день не отмечен, смены нет).
export function todayStatus(today: string, shifts: ShiftsData): DayStatus | null {
  return getEntry(today, shifts)?.status ?? null
}

// Лучшая текущая серия среди привычек (включая автопривычку «Смены без пропусков»).
// null — ни одной живой серии.
export interface BestStreak {
  name: string
  current: number
  unit: 'day' | 'shift'
}

export function bestStreak(habits: HabitsData, shifts: ShiftsData, today: string): BestStreak | null {
  let best: BestStreak | null = null
  for (const habit of habits.habits) {
    if (habit.archived) continue
    const { current } = dayStreak(habits.marks[habit.id] ?? [], today)
    if (current > 0 && (!best || current > best.current)) best = { name: habit.name, current, unit: 'day' }
  }
  const shiftsRun = shiftStreak(shifts, today).current
  if (shiftsRun > 0 && (!best || shiftsRun > best.current)) {
    best = { name: AUTO_SHIFTS_NAME, current: shiftsRun, unit: 'shift' }
  }
  return best
}
