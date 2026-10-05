// Логика смен. Без React — только чистые функции,
// чтобы этим же пользовалась вкладка «Неделя» (подсветка дней со сменой).
import type { DayEntry, DayStatus, ShiftsData } from '../../types'
import { addDays, daysBetween } from '../../utils/date'

// Подписи статусов для интерфейса.
export const STATUS_LABELS: Record<DayStatus, string> = {
  shift: 'Смена',
  missed: 'Не вышел',
  leave: 'Отгул',
  off: 'Выходной',
}

// Максимум дней, которые помощник 2/2 заполняет за раз (защита от опечатки в годе).
export const FILL_MAX_DAYS = 366

export function getEntry(date: string, data: ShiftsData): DayEntry | undefined {
  return data.days[date]
}

export function isShiftDay(date: string, data: ShiftsData): boolean {
  return data.days[date]?.status === 'shift'
}

// Возвращает новые данные, где у дня date стоит entry (null — день очищен).
// Исходный объект не меняем — в React состояние только заменяют целиком.
export function setDay(data: ShiftsData, date: string, entry: DayEntry | null): ShiftsData {
  const days = { ...data.days }
  if (entry === null) delete days[date]
  else days[date] = entry
  return { days }
}

// Ближайшая смена начиная с fromDate (включительно), или null.
export function findNextShift(fromDate: string, data: ShiftsData): string | null {
  let best: string | null = null
  for (const [date, entry] of Object.entries(data.days)) {
    if (entry.status === 'shift' && date >= fromDate && (best === null || date < best)) {
      best = date
    }
  }
  return best
}

export interface FillResult {
  data: ShiftsData
  added: number // сколько смен поставлено
  skipped: number // сколько дней по схеме 2/2 пропущено, потому что уже были отмечены
}

// Помощник «Заполнить 2/2»: с from по to (включительно) — 2 дня смена, 2 дня пропуск.
// Ставит только смены и не трогает дни, которые уже отмечены.
export function fillTwoTwo(
  data: ShiftsData,
  from: string,
  to: string,
): FillResult {
  const days = { ...data.days }
  let added = 0
  let skipped = 0
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (daysBetween(from, date) % 4 >= 2) continue // 3-й и 4-й день цикла — выходные
    if (days[date]) {
      skipped++
    } else {
      days[date] = { status: 'shift' }
      added++
    }
  }
  return { data: { days }, added, skipped }
}

export interface MonthStats {
  worked: number // смены в прошедших днях
  planned: number // смены сегодня и дальше
  missed: number // «не вышел»
  leave: number // отгулы
}

// Итоги за месяц. monthIndex — 0–11.
export function monthStats(
  data: ShiftsData,
  year: number,
  monthIndex: number,
  today: string,
): MonthStats {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-` // '2026-10-'
  const stats: MonthStats = { worked: 0, planned: 0, missed: 0, leave: 0 }
  for (const [date, entry] of Object.entries(data.days)) {
    if (!date.startsWith(prefix)) continue
    if (entry.status === 'shift') {
      if (date < today) stats.worked++
      else stats.planned++
    } else if (entry.status === 'missed') stats.missed++
    else if (entry.status === 'leave') stats.leave++
  }
  return stats
}
