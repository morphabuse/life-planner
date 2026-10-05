// Логика вкладки «Сегодня». Своих расчётов почти нет — собираем готовое
// из «Смен», «Недели» и «Денег», чтобы ничего не дублировать.
import type { MoneyData, SavingsData, ShiftTime, ShiftsData } from '../../types'
import { addDays } from '../../utils/date'
import { findNextShift, getEntry } from '../shifts/schedule'
import { calcSummary } from '../money/savingsMath'
import { shiftsToGoal } from '../money/moneyLogic'

// Что показать про смену.
export type ShiftFocus =
  | { kind: 'shift'; date: string; when: 'today' | 'tomorrow'; time: ShiftTime } // смена сегодня или завтра
  | { kind: 'later'; date: string } // сегодня и завтра смен нет, ближайшая позже
  | { kind: 'none' } // смен впереди не отмечено

export function shiftFocus(today: string, shifts: ShiftsData): ShiftFocus {
  const candidates = [
    { date: today, when: 'today' as const },
    { date: addDays(today, 1), when: 'tomorrow' as const },
  ]
  for (const { date, when } of candidates) {
    const entry = getEntry(date, shifts)
    if (entry?.status === 'shift') return { kind: 'shift', date, when, time: entry.time }
  }
  const next = findNextShift(addDays(today, 2), shifts)
  return next ? { kind: 'later', date: next } : { kind: 'none' }
}

// Данные для строки «Турция: X из Y ₽ · N смен до цели».
export interface MoneyLine {
  title: string // название цели («Турция»)
  saved: number
  target: number
  shiftsLeft: number | null // null — посчитать нельзя (на Турцию 0 %) или цель достигнута
}

export function moneyLine(savings: SavingsData, money: MoneyData, today: Date): MoneyLine {
  const summary = calcSummary(savings.goal, savings.deposits, today)
  return {
    title: savings.goal.title,
    saved: summary.saved,
    target: savings.goal.targetAmount,
    shiftsLeft: summary.left > 0 ? shiftsToGoal(summary.left, money.settings) : null,
  }
}
