// Подсказка по сну перед сменой. Возвращает строки текста — без React,
// чтобы логику было легко читать и проверять отдельно от вёрстки.
//
// Время смен не храним: смена всегда стандартная ночная, 22:00–10:00.
import type { ShiftsData } from '../../types'
import { addDays, formatDayShort } from '../../utils/date'

// Стандартная смена — для подписей.
export const SHIFT_HOURS = '22:00–10:00'
const NIGHT_SLEEP_BEFORE = '23:45–9:00' // обычный ночной сон накануне
// Дневной сон в день смены: 3 часа (2 цикла по 90 минут), подъём за 2 часа до начала (22:00),
// лечь на 15 минут раньше — время на засыпание.
const DAY_SLEEP = 'лечь 16:45, сон 17:00–20:00 (3 часа, 2 цикла по 90 мин), подъём за 2 часа до начала'

export function sleepTips(shiftDate: string, data: ShiftsData): string[] {
  if (data.days[shiftDate]?.status !== 'shift') return []

  const dayBefore = addDays(shiftDate, -1)
  const tips: string[] = []

  // 1. Ночь перед сменой. Если накануне тоже смена (до 10:00 этого дня) — ночного сна не будет.
  if (data.days[dayBefore]?.status === 'shift') {
    tips.push(
      `Вторая ночь подряд: накануне, ${formatDayShort(dayBefore)}, — тоже смена, ` +
        'обычного ночного сна перед этой сменой не будет — после утра отоспись.',
    )
  } else {
    tips.push(`Накануне, ${formatDayShort(dayBefore)}: ночной сон ${NIGHT_SLEEP_BEFORE}.`)
  }

  // 2. Дневной сон перед ночной сменой.
  tips.push(`В день смены: ${DAY_SLEEP}.`)
  return tips
}
