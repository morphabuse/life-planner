// Миграция смен со старого формата на новый.
//
// Старый формат (до гибкого графика): дата первой смены + ручные правки,
// а сам график 2/2 вычислялся «на лету» и был бесконечным.
// Новый формат: просто список отмеченных дней.
import type { DayEntry, ShiftsData } from '../types'
import { addDays, daysBetween } from '../utils/date'

export type LegacyDayKind = 'shift' | 'off' | 'leave'

export interface LegacyShiftsData {
  firstShiftDate: string | null
  overrides: Record<string, LegacyDayKind>
}

// Старый автографик был бесконечным, а новые данные — конечный список дней.
// Поэтому переносим его от первой смены до «сегодня + год». Дальше —
// кнопкой «Заполнить 2/2».
export const MIGRATION_DAYS_AHEAD = 365

export function migrateLegacyShifts(legacy: LegacyShiftsData, today: string): ShiftsData {
  const days: Record<string, DayEntry> = {}
  const first = legacy.firstShiftDate

  // 1. Дни автографика 2/2 → отмеченные смены.
  //    Выходные по автографику не записываем: неотмеченный день и так = «смены нет».
  if (first) {
    // Если первая смена в будущем — год считаем от неё.
    const until = addDays(first > today ? first : today, MIGRATION_DAYS_AHEAD)
    // Даты 'YYYY-MM-DD' можно сравнивать как строки — порядок совпадает с календарным.
    for (let date = first; date <= until; date = addDays(date, 1)) {
      if (daysBetween(first, date) % 4 < 2) {
        days[date] = { status: 'shift' }
      }
    }
  }

  // 2. Ручные правки переносим поверх — они были важнее автографика.
  for (const [date, kind] of Object.entries(legacy.overrides)) {
    days[date] = { status: kind }
  }

  return { days }
}
