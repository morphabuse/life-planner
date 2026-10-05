// Хранение данных вкладки «Неделя».
import type { Task, WeekData, WeekReview } from '../types'
import { readJson, writeJson } from './localStore'
import { isIsoDate, isObject, isTask, isWeekReview } from './validators'

const KEY = 'planner.week'

export function loadWeek(): WeekData {
  const stored = readJson<unknown>(KEY, null)
  const tasks: Record<string, Task[]> = {}
  if (isObject(stored) && isObject(stored.tasks)) {
    for (const [date, list] of Object.entries(stored.tasks)) {
      if (!isIsoDate(date) || !Array.isArray(list)) continue
      // Берём только правильные задачи — испорченные пропускаем.
      const valid = list.filter(isTask)
      if (valid.length > 0) tasks[date] = valid
    }
  }
  // Итоги недель — тоже только правильные.
  const reviews: Record<string, WeekReview> = {}
  if (isObject(stored) && isObject(stored.reviews)) {
    for (const [monday, review] of Object.entries(stored.reviews)) {
      if (isIsoDate(monday) && isWeekReview(review)) reviews[monday] = review
    }
  }
  return { tasks, reviews }
}

export function saveWeek(data: WeekData): void {
  writeJson(KEY, data)
}
