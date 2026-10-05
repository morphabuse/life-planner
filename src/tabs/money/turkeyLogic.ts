// Турция: прогресс и прогноз «Успеваю ли». Без React — только чистые функции.
//
// Прогресс = насколько вырос остаток счёта «Турция» с даты старта (проценты банка — тоже в плюс)
// + доли «Турция», отмеченные «Перевёл», которые выписка (или введённый остаток) ещё не видит.
import type { MoneyData, ShiftsData } from '../../types'
import { addDays, daysBetween } from '../../utils/date'
import { balanceOf, coverage, envelopeIncomes, splitIncome, turkeyPerShift } from './moneyLogic'
import { formatMoney, plural } from './format'

// Если с даты старта прошло меньше — темп берём по плану, а не по факту.
export const MIN_DATA_DAYS = 14
// Темп по факту — за последние 4 недели.
const TEMPO_WINDOW_DAYS = 28
const DAYS_PER_MONTH = 365.25 / 12
// Запас меньше этой доли цели — «впритык».
const TIGHT_SHARE = 0.05

// Сколько добавилось на «Турцию» за дни [from, to] включительно, в копейках.
export function turkeyAdded(money: MoneyData, from: string, to: string): number {
  const before = balanceOf(money, 'turkey', addDays(from, -1))?.kop ?? 0
  const after = balanceOf(money, 'turkey', to)?.kop ?? 0
  // Отмеченные «Перевёл» доли, которых ещё нет в данных счёта (деньги пришли позже, чем
  // кончается выписка или чем введён остаток).
  const known = coverage(money, 'turkey') ?? ''
  let pending = 0
  for (const income of envelopeIncomes(money)) {
    const date = income.paidDate
    if (date < from || date > to || date <= known) continue
    if (money.transfers[income.shiftDate]?.turkey) {
      pending += splitIncome(income.amountKop, money.settings.split).turkey
    }
  }
  return after - before + pending
}

export interface TurkeyProgress {
  saved: number // ₽, накоплено с даты старта
  target: number // ₽
  left: number // ₽, не меньше 0
  percent: number // 0–100
  asOf: string | null // по какую дату известен остаток счёта «Турция»
}

export function turkeyProgress(money: MoneyData, today: string): TurkeyProgress {
  const { goal } = money.settings
  const saved = today < goal.start ? 0 : turkeyAdded(money, goal.start, today) / 100
  const left = Math.max(0, goal.amount - saved)
  const percent = goal.amount > 0 ? Math.min(100, Math.max(0, (saved / goal.amount) * 100)) : 0
  return { saved, target: goal.amount, left, percent, asOf: coverage(money, 'turkey') }
}

export type Verdict = 'ok' | 'tight' | 'short'

export interface TurkeyForecast {
  progress: TurkeyProgress
  perWeek: number // ₽ в неделю на Турцию
  tempoSource: 'actual' | 'plan' // по последним 4 неделям или по плану («уточнится»)
  futureShifts: number // сколько отмеченных смен впереди учтено
  horizon: string | null // до какой даты смены отмечены (дальше — по темпу)
  projected: number // ₽, сколько ещё добавится до срока
  total: number // ₽, сколько будет к сроку
  margin: number // ₽, запас (минус — не хватит)
  verdict: Verdict
  extraShiftsPerMonth: number | null // при нехватке — сколько смен в месяц добавить
  daysLeft: number
}

// Прогноз к сроку цели:
//   1) темп: средняя сумма в Турцию за неделю за последние 4 недели. Если данных меньше
//      2 недель — по плану: процент Турции × цена смены × смен в месяц;
//   2) впереди: отмеченные в «Сменах» будущие смены (за которые ещё нет дохода) — каждая
//      по доле Турции от цены смены; «не вышел», отгул и выходной ничего не дают.
//      После последнего отмеченного дня — по темпу;
//   3) итог = накоплено + впереди; сравниваем с целью.
// Пропуски («не вышел») снижают прогноз: в прошлом — меньше дохода и ниже темп,
// в будущем — такой день не считается сменой.
export function turkeyForecast(money: MoneyData, shifts: ShiftsData, today: string): TurkeyForecast {
  const { goal, split, shiftPay, shiftsPerMonth } = money.settings
  const progress = turkeyProgress(money, today)
  const daysLeft = Math.max(0, daysBetween(today, goal.deadline))

  // 1. Темп.
  const sinceStart = today < goal.start ? 0 : daysBetween(goal.start, today) + 1
  let perWeek: number
  let tempoSource: TurkeyForecast['tempoSource']
  if (sinceStart >= MIN_DATA_DAYS) {
    const from = sinceStart > TEMPO_WINDOW_DAYS ? addDays(today, -(TEMPO_WINDOW_DAYS - 1)) : goal.start
    const days = daysBetween(from, today) + 1
    perWeek = (turkeyAdded(money, from, today) / 100 / days) * 7
    tempoSource = 'actual'
  } else {
    perWeek = ((((shiftPay * split.turkey) / 100) * shiftsPerMonth) / DAYS_PER_MONTH) * 7
    tempoSource = 'plan'
  }

  // 2. Отмеченные дни впереди (до срока).
  const paid = new Set(envelopeIncomes(money).map((i) => i.shiftDate))
  let horizon: string | null = null
  let futureShifts = 0
  for (const [date, entry] of Object.entries(shifts.days)) {
    if (date < today || date > goal.deadline) continue
    if (horizon === null || date > horizon) horizon = date
    if (entry.status === 'shift' && !paid.has(date)) futureShifts++
  }
  const perShift = turkeyPerShift(money.settings)
  const afterHorizonDays = horizon ? Math.max(0, daysBetween(horizon, goal.deadline)) : daysLeft
  const projected = daysLeft > 0 ? futureShifts * perShift + (perWeek / 7) * afterHorizonDays : 0

  // 3. Итог.
  const total = progress.saved + projected
  const margin = total - goal.amount
  let verdict: Verdict
  if (margin < 0) verdict = 'short'
  else if (margin < goal.amount * TIGHT_SHARE) verdict = 'tight'
  else verdict = 'ok'

  let extraShiftsPerMonth: number | null = null
  if (verdict === 'short' && perShift > 0) {
    const months = Math.max(1, daysLeft / DAYS_PER_MONTH)
    extraShiftsPerMonth = Math.ceil(-margin / perShift / months)
  }

  return {
    progress,
    perWeek,
    tempoSource,
    futureShifts,
    horizon,
    projected,
    total,
    margin,
    verdict,
    extraShiftsPerMonth,
    daysLeft,
  }
}

// Округление для фразы «запас ~N ₽»: крупные суммы — до тысяч, мелкие — до сотен.
export function roughly(amount: number): number {
  const abs = Math.abs(amount)
  const step = abs >= 10000 ? 1000 : 100
  return Math.round(abs / step) * step
}

// Прогноз одной фразой:
//   успеваю        → «Успеваешь, запас ~N ₽»
//   запас < 5 %    → «Впритык, запас ~N ₽»
//   не успеваю     → «Не хватит ~N ₽ — это +K смен в месяц»
export function forecastText(f: TurkeyForecast): string {
  if (f.verdict === 'ok') return `Успеваешь, запас ~${formatMoney(roughly(f.margin))}`
  if (f.verdict === 'tight') return `Впритык, запас ~${formatMoney(roughly(f.margin))}`
  const text = `Не хватит ~${formatMoney(roughly(f.margin))}`
  const k = f.extraShiftsPerMonth
  return k ? `${text} — это +${k} ${plural(k, 'смена', 'смены', 'смен')} в месяц` : text
}
