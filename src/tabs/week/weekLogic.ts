// Логика вкладки «Неделя». Без React — только чистые функции.
// Каждая функция изменения возвращает НОВЫЕ данные, исходные не трогает.
import type { Task, WeekData, WeekReview } from '../../types'
import { addDays, weekdayMondayFirst } from '../../utils/date'

// Понедельник той недели, в которую попадает date.
export function weekStartOf(date: string): string {
  return addDays(date, -weekdayMondayFirst(date))
}

// 7 дат недели, начиная с понедельника.
export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// Заменяет список задач дня. Пустой список убираем из данных совсем,
// чтобы в хранилище не копились пустые дни.
function withDayTasks(data: WeekData, date: string, list: Task[]): WeekData {
  const tasks = { ...data.tasks }
  if (list.length > 0) tasks[date] = list
  else delete tasks[date]
  return { ...data, tasks } // итоги недель (reviews) не трогаем
}

export function addTask(data: WeekData, date: string, task: Task): WeekData {
  return withDayTasks(data, date, [...(data.tasks[date] ?? []), task])
}

export function toggleTask(data: WeekData, date: string, id: string): WeekData {
  const list = (data.tasks[date] ?? []).map((t) => (t.id === id ? { ...t, done: !t.done } : t))
  return withDayTasks(data, date, list)
}

export function deleteTask(data: WeekData, date: string, id: string): WeekData {
  const list = (data.tasks[date] ?? []).filter((t) => t.id !== id)
  return withDayTasks(data, date, list)
}

// Сохраняет итог недели. Если оба поля пустые — убираем запись, чтобы не копились пустые недели.
export function setReview(data: WeekData, monday: string, review: WeekReview): WeekData {
  const reviews = { ...data.reviews }
  if (review.good || review.bad) reviews[monday] = review
  else delete reviews[monday]
  return { ...data, reviews }
}
