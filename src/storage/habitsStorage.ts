// Хранение привычек.
import type { HabitsData } from '../types'
import { readJson, writeJson } from './localStore'
import { isHabit, isIsoDate, isObject } from './validators'

const KEY = 'planner.habits'

// Привычки при самом первом запуске.
export const DEFAULT_HABITS: HabitsData = {
  habits: [
    { id: 'code', name: '30 минут кода', archived: false },
    { id: 'english', name: 'Английский', archived: false },
    { id: 'bedtime', name: 'Лёг вовремя', archived: false },
  ],
  marks: {},
}

export function loadHabits(): HabitsData {
  const stored = readJson<unknown>(KEY, null)
  if (!isObject(stored) || !Array.isArray(stored.habits)) return DEFAULT_HABITS

  // Берём только то, что прошло проверку, — испорченные записи пропускаем.
  const habits = stored.habits.filter(isHabit)
  const marks: Record<string, string[]> = {}
  if (isObject(stored.marks)) {
    for (const [id, dates] of Object.entries(stored.marks)) {
      if (Array.isArray(dates)) marks[id] = dates.filter((d): d is string => isIsoDate(d))
    }
  }
  return { habits, marks }
}

export function saveHabits(data: HabitsData): void {
  writeJson(KEY, data)
}
