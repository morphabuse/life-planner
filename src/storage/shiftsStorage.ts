// Хранение данных вкладки «Смены».
import type { DayEntry, ShiftsData } from '../types'
import { todayIso } from '../utils/date'
import { readJson, writeJson } from './localStore'
import { migrateLegacyShifts } from './shiftsMigration'
import type { LegacyDayKind } from './shiftsMigration'
import { isDayEntry, isFillRecord, isIsoDate, isLegacyDayKind, isObject, toDayEntry, toFillRecord } from './validators'

const KEY = 'planner.shifts'

export function loadShifts(): ShiftsData {
  const stored = readJson<unknown>(KEY, null)
  if (!isObject(stored)) return { days: {} }

  // Старый формат (firstShiftDate + overrides) → переводим в новый
  // и сразу сохраняем, чтобы миграция случилась один раз.
  if (!('days' in stored)) {
    const firstShiftDate = isIsoDate(stored.firstShiftDate) ? stored.firstShiftDate : null
    const overrides: Record<string, LegacyDayKind> = {}
    if (isObject(stored.overrides)) {
      for (const [date, kind] of Object.entries(stored.overrides)) {
        if (isIsoDate(date) && isLegacyDayKind(kind)) overrides[date] = kind
      }
    }
    const migrated = migrateLegacyShifts({ firstShiftDate, overrides }, todayIso())
    saveShifts(migrated)
    return migrated
  }

  // Новый формат. Берём только записи, прошедшие проверку, — испорченные пропускаем.
  // Время смены (time) из старых записей отбрасываем и сразу сохраняем без него.
  const days: Record<string, DayEntry> = {}
  let hadTime = false
  if (isObject(stored.days)) {
    for (const [date, entry] of Object.entries(stored.days)) {
      if (!isIsoDate(date) || !isDayEntry(entry)) continue
      if ('time' in entry) hadTime = true
      days[date] = toDayEntry(entry)
    }
  }
  // Последнее заполнение 2/2 (для «Отменить»). Испорченную запись просто не берём.
  const data: ShiftsData = isFillRecord(stored.lastFill) ? { days, lastFill: toFillRecord(stored.lastFill) } : { days }
  if (hadTime) saveShifts(data)
  return data
}

export function saveShifts(data: ShiftsData): void {
  writeJson(KEY, data)
}
