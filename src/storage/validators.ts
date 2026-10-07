// Проверки формата данных. Нужны там, где данные приходят «снаружи»:
// из файла бэкапа или из localStorage (его мог испортить кто угодно).
//
// Функции вида `value is X` — «охранники типа»: если вернули true,
// TypeScript дальше считает, что value имеет тип X.
import type {
  DayEntry,
  Habit,
  HabitsData,
  SalarySplit,
  Transaction,
  ShiftsData,
  FillRecord,
  Task,
  WeekData,
  WeekReview,
} from '../types'
import type { LegacyDayKind, LegacyShiftsData } from './shiftsMigration'

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// ---------- Привычки ----------

export function isHabit(value: unknown): value is Habit {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    value.id !== '' &&
    typeof value.name === 'string' &&
    value.name.trim() !== '' &&
    typeof value.archived === 'boolean'
  )
}

export function isHabitsData(value: unknown): value is HabitsData {
  if (!isObject(value) || !Array.isArray(value.habits) || !value.habits.every(isHabit)) return false
  if (!isObject(value.marks)) return false
  return Object.values(value.marks).every(
    (dates) => Array.isArray(dates) && dates.every((d) => isIsoDate(d)),
  )
}

export function isPositiveNumber(value: unknown): value is number {
  // Number.isFinite отсекает NaN и Infinity.
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

// Строка вида 'YYYY-MM-DD'.
export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

// ---------- Деньги ----------

// Неотрицательное число (проценты, лимиты могут быть 0).
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isSalarySplit(value: unknown): value is SalarySplit {
  return (
    isObject(value) &&
    isNonNegativeNumber(value.life) &&
    isNonNegativeNumber(value.turkey) &&
    isNonNegativeNumber(value.clothes) &&
    value.life + value.turkey + value.clothes === 100
  )
}

// Объект вида { 'строка': число ≥ 0 }.
export function isLimits(value: unknown): value is Record<string, number> {
  return isObject(value) && Object.values(value).every(isNonNegativeNumber)
}

export function isTransaction(value: unknown): value is Transaction {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    value.id !== '' &&
    isIsoDate(value.date) &&
    typeof value.time === 'string' &&
    /^\d{2}:\d{2}:\d{2}$/.test(value.time) &&
    typeof value.doc === 'string' &&
    (value.account === undefined || typeof value.account === 'string') &&
    typeof value.purpose === 'string' &&
    Number.isInteger(value.amount) // копейки — целое число
  )
}

// ---------- Неделя ----------

export function isTask(value: unknown): value is Task {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    value.id !== '' &&
    typeof value.text === 'string' &&
    value.text.trim() !== '' &&
    typeof value.done === 'boolean'
  )
}

export function isWeekReview(value: unknown): value is WeekReview {
  return isObject(value) && typeof value.good === 'string' && typeof value.bad === 'string'
}

// Итоги недель (reviews) появились в бэкапе v8 — в старых данных их может не быть.
export function isWeekData(value: unknown): value is Omit<WeekData, 'reviews'> & { reviews?: unknown } {
  if (!isObject(value) || !isObject(value.tasks)) return false
  const tasksOk = Object.entries(value.tasks).every(
    ([date, list]) => isIsoDate(date) && Array.isArray(list) && list.every(isTask),
  )
  if (!tasksOk) return false
  if (value.reviews === undefined) return true
  return (
    isObject(value.reviews) &&
    Object.entries(value.reviews).every(([monday, review]) => isIsoDate(monday) && isWeekReview(review))
  )
}

// ---------- Смены: текущий формат ----------

// День смен. Старые записи могут содержать время (time) — оно больше не нужно и отбрасывается
// при загрузке (toDayEntry), поэтому здесь его не проверяем.
export function isDayEntry(value: unknown): value is DayEntry {
  return (
    isObject(value) &&
    (value.status === 'shift' || value.status === 'missed' || value.status === 'leave' || value.status === 'off')
  )
}

// Только статус — без старого поля time.
export function toDayEntry(entry: DayEntry): DayEntry {
  return { status: entry.status }
}

// Запись о последнем заполнении 2/2 (lastFill).
export function isFillRecord(value: unknown): value is FillRecord {
  return (
    isObject(value) &&
    isIsoDate(value.from) &&
    isIsoDate(value.to) &&
    Array.isArray(value.dates) &&
    value.dates.every(isIsoDate)
  )
}

// Только нужные поля записи — лишнее отбрасываем.
export function toFillRecord(fill: FillRecord): FillRecord {
  return { from: fill.from, to: fill.to, dates: [...fill.dates] }
}

export function isShiftsData(value: unknown): value is ShiftsData {
  if (!isObject(value) || !isObject(value.days)) return false
  // Object.entries даёт пары [ключ, значение] — проверяем каждый день.
  return Object.entries(value.days).every(([date, entry]) => isIsoDate(date) && isDayEntry(entry))
}

// ---------- Смены: старый формат (бэкап v2 и localStorage до миграции) ----------

export function isLegacyDayKind(value: unknown): value is LegacyDayKind {
  return value === 'shift' || value === 'off' || value === 'leave'
}

export function isLegacyShiftsData(value: unknown): value is LegacyShiftsData {
  if (!isObject(value)) return false
  if (value.firstShiftDate !== null && !isIsoDate(value.firstShiftDate)) return false
  if (!isObject(value.overrides)) return false
  return Object.entries(value.overrides).every(
    ([date, kind]) => isIsoDate(date) && isLegacyDayKind(kind),
  )
}
