// Хранение данных вкладки «Смены».
import type { DayEntry, ShiftsData } from '../types'
import { todayIso } from '../utils/date'
import { readJson, writeJson } from './localStore'
import { migrateLegacyShifts } from './shiftsMigration'
import type { LegacyDayKind } from './shiftsMigration'
import { isDayEntry, isIsoDate, isLegacyDayKind, isObject } from './validators'

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
  const days: Record<string, DayEntry> = {}
  if (isObject(stored.days)) {
    for (const [date, entry] of Object.entries(stored.days)) {
      if (isIsoDate(date) && isDayEntry(entry)) days[date] = entry
    }
  }
  return { days }
}

export function saveShifts(data: ShiftsData): void {
  writeJson(KEY, data)
}
