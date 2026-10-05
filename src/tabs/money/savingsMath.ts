// Расчёты для копилки. Здесь нет React — только чистые функции,
// поэтому их легко проверить и переиспользовать.
import type { Deposit, SavingsGoal } from '../../types'

export interface SavingsSummaryData {
  saved: number // сколько отложено
  left: number // сколько осталось (не меньше 0)
  percent: number // прогресс от 0 до 100
  monthsLeft: number // сколько ежемесячных взносов осталось
  perMonth: number | null // сколько откладывать в месяц; null — если срок вышел
}

// Сколько месяцев от текущего до месяца цели.
// Текущий месяц считается, месяц цели — нет: к поездке деньги уже должны быть.
// Пример: сегодня октябрь 2026, цель август 2027 → 10 (окт…июль).
export function monthsUntil(targetMonth: string, today: Date): number {
  const [year, month] = targetMonth.split('-').map(Number)
  const target = year * 12 + (month - 1)
  const current = today.getFullYear() * 12 + today.getMonth()
  return target - current
}

export function calcSummary(
  goal: SavingsGoal,
  deposits: Deposit[],
  today: Date,
): SavingsSummaryData {
  // Пополнения с плюсом, снятия с минусом. Копейки (проценты) округляем до копейки,
  // иначе сумма дробных чисел даёт «20069.049999…».
  const saved = Math.round(deposits.reduce((sum, d) => sum + d.amount, 0) * 100) / 100
  const left = Math.max(0, goal.targetAmount - saved)
  const percent =
    goal.targetAmount > 0 ? Math.min(100, Math.max(0, (saved / goal.targetAmount) * 100)) : 0
  const monthsLeft = monthsUntil(goal.targetMonth, today)
  // Округляем вверх, чтобы точно успеть.
  const perMonth = monthsLeft > 0 ? Math.ceil(left / monthsLeft) : null

  return { saved, left, percent, monthsLeft, perMonth }
}
