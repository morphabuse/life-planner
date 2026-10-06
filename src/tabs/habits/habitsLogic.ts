// Логика привычек. Без React — только чистые функции.
import type { HabitsData, ShiftsData } from '../../types'
import { addDays } from '../../utils/date'
import { weekStartOf } from '../week/weekLogic'
import { plural } from '../money/format'

// Id автопривычки «Смены без пропусков». Она не хранится, а считается из «Смен».
export const AUTO_SHIFTS_ID = 'auto:shifts'
export const AUTO_SHIFTS_NAME = 'Смены без пропусков'

// Сколько недель показывает сетка.
export const GRID_WEEKS = 8

// ---------- Отметки ----------

export function isMarked(data: HabitsData, habitId: string, date: string): boolean {
  return (data.marks[habitId] ?? []).includes(date)
}

// Ставит или снимает отметку. Возвращает новые данные (старые не меняем).
export function toggleMark(data: HabitsData, habitId: string, date: string): HabitsData {
  const dates = data.marks[habitId] ?? []
  const next = dates.includes(date) ? dates.filter((d) => d !== date) : [...dates, date].sort()
  return { ...data, marks: { ...data.marks, [habitId]: next } }
}

// ---------- Список привычек ----------

export function addHabit(data: HabitsData, name: string, id: string): HabitsData {
  return { ...data, habits: [...data.habits, { id, name, archived: false }] }
}

export function renameHabit(data: HabitsData, id: string, name: string): HabitsData {
  return { ...data, habits: data.habits.map((h) => (h.id === id ? { ...h, name } : h)) }
}

export function setArchived(data: HabitsData, id: string, archived: boolean): HabitsData {
  return { ...data, habits: data.habits.map((h) => (h.id === id ? { ...h, archived } : h)) }
}

// ---------- Серии ----------

export interface Streak {
  current: number // текущая серия
  record: number // самая длинная серия за всё время
}

// Обычная привычка: серия — дни подряд с отметкой.
// Если сегодня ещё не отмечено, серия, которая тянется со вчера, жива — день ещё не кончился.
// Если не отмечено ни сегодня, ни вчера — серия 0 («начни новую серию»).
export function dayStreak(dates: string[], today: string): Streak {
  const set = new Set(dates.filter((d) => d <= today)) // будущие дни не считаем
  let day = set.has(today) ? today : addDays(today, -1)
  let current = 0
  while (set.has(day)) {
    current++
    day = addDays(day, -1)
  }

  // Рекорд: идём по отсортированным датам и считаем отрезки «день за днём».
  let record = 0
  let run = 0
  let prev: string | null = null
  for (const date of [...set].sort()) {
    run = prev !== null && addDays(prev, 1) === date ? run + 1 : 1
    record = Math.max(record, run)
    prev = date
  }
  return { current, record: Math.max(record, current) }
}

// Автопривычка «Смены без пропусков»: серия — смены подряд без «не вышел».
// Дни без смены серию не прерывают. Смена сегодня ещё не прошла — её не считаем,
// а «не вышел» сегодня уже считается пропуском.
export function shiftStreak(shifts: ShiftsData, today: string): Streak {
  const events = Object.entries(shifts.days)
    .filter(([date, e]) => (e.status === 'shift' && date < today) || (e.status === 'missed' && date <= today))
    .sort(([a], [b]) => a.localeCompare(b))

  let run = 0
  let record = 0
  for (const [, e] of events) {
    run = e.status === 'shift' ? run + 1 : 0
    record = Math.max(record, run)
  }
  return { current: run, record }
}

// Отработанные смены — это «отмеченные дни» автопривычки (для сетки и итогов недели).
export function workedShiftDates(shifts: ShiftsData, today: string): string[] {
  return Object.entries(shifts.days)
    .filter(([date, e]) => e.status === 'shift' && date < today)
    .map(([date]) => date)
}

// Подпись серии. Без «провалов»: если серия прервалась — просто «Начни новую серию».
export function streakText(streak: Streak, unit: 'day' | 'shift'): string {
  const word = (n: number) =>
    unit === 'day' ? plural(n, 'день', 'дня', 'дней') : plural(n, 'смена', 'смены', 'смен')
  const record = streak.record > 0 ? ` · рекорд ${streak.record} ${word(streak.record)}` : ''
  if (streak.current === 0) return `Начни новую серию${record}`
  return `Серия: ${streak.current} ${word(streak.current)}${record}`
}

// ---------- Сетка за 8 недель ----------

export interface GridCell {
  date: string
  future: boolean // день ещё не наступил — пустая клетка
}

// 8 недель × 7 дней: колонки — недели (последняя — текущая), строки — дни с понедельника.
export function gridDays(today: string): GridCell[] {
  const start = addDays(weekStartOf(today), -7 * (GRID_WEEKS - 1))
  return Array.from({ length: GRID_WEEKS * 7 }, (_, i) => {
    const date = addDays(start, i)
    return { date, future: date > today }
  })
}

// Сколько дней из списка попадает в промежуток [from, to] — для итога недели.
export function countInRange(dates: string[], from: string, to: string): number {
  return dates.filter((d) => d >= from && d <= to).length
}

// ---------- Полоска серии смен ----------

// Сколько последних дней показывать в полоске «Смены без пропусков» (2 недели).
export const SHIFT_STRIP_DAYS = 14

// Последние n дней, заканчивая сегодняшним: [сегодня − (n−1), …, сегодня].
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)))
}
