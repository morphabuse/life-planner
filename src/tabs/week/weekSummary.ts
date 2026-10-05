// Итог недели: собираем цифры из «Смен», «Денег», задач и привычек.
// Своих расчётов почти нет — вызываем логику других вкладок, ничего не дублируем.
import type { Deposit, HabitsData, MoneyData, ShiftsData, WeekData } from '../../types'
import { incomeBetween, missedCost } from '../money/moneyLogic'
import {
  AUTO_SHIFTS_NAME,
  countInRange,
  dayStreak,
  shiftStreak,
  workedShiftDates,
} from '../habits/habitsLogic'
import type { Streak } from '../habits/habitsLogic'
import { weekDates } from './weekLogic'

export interface HabitWeek {
  name: string
  days: number // сколько раз отмечено за неделю (для смен — сколько смен отработано)
  streak: Streak
  unit: 'day' | 'shift'
}

export interface WeekSummary {
  worked: number // отработано смен (прошедшие дни)
  missed: number // «не вышел»
  earned: number // отработано × цена смены, ₽
  lost: { total: number; turkey: number } // цена пропусков, ₽
  income: number // доход «Доход: склад» по выписке за неделю, ₽
  saved: number // пополнения копилки минус снятия за неделю, ₽
  tasksDone: number
  tasksTotal: number
  habits: HabitWeek[]
}

export function weekSummary(
  monday: string,
  today: string,
  data: { week: WeekData; shifts: ShiftsData; money: MoneyData; deposits: Deposit[]; habits: HabitsData },
): WeekSummary {
  const dates = weekDates(monday)
  const from = dates[0]
  const to = dates[6]
  const inWeek = (date: string) => date >= from && date <= to

  // Смены: прошедшие смены — отработаны; «не вышел» по сегодня — пропуск.
  let worked = 0
  let missed = 0
  for (const [date, entry] of Object.entries(data.shifts.days)) {
    if (!inWeek(date)) continue
    if (entry.status === 'shift' && date < today) worked++
    if (entry.status === 'missed' && date <= today) missed++
  }

  const tasks = dates.flatMap((d) => data.week.tasks[d] ?? [])
  const saved = data.deposits.filter((d) => inWeek(d.date)).reduce((s, d) => s + d.amount, 0)

  const habits: HabitWeek[] = data.habits.habits
    .filter((h) => !h.archived)
    .map((h) => {
      const marks = data.habits.marks[h.id] ?? []
      return { name: h.name, days: countInRange(marks, from, to), streak: dayStreak(marks, today), unit: 'day' }
    })
  habits.push({
    name: AUTO_SHIFTS_NAME,
    days: countInRange(workedShiftDates(data.shifts, today), from, to),
    streak: shiftStreak(data.shifts, today),
    unit: 'shift',
  })

  return {
    worked,
    missed,
    earned: worked * data.money.settings.shiftPay,
    lost: missedCost(missed, data.money.settings),
    income: incomeBetween(data.money, from, to),
    saved: Math.round(saved * 100) / 100,
    tasksDone: tasks.filter((t) => t.done).length,
    tasksTotal: tasks.length,
    habits,
  }
}
