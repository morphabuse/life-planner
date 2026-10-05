// Подсказка по сну перед сменой. Возвращает строки текста — без React,
// чтобы логику было легко читать и проверять отдельно от вёрстки.
import type { ShiftsData } from '../../types'
import { addDays, formatDayShort } from '../../utils/date'
import { endsNextDay, minutesToTime, timeToMinutes, formatTime } from '../../utils/shiftTime'

// Начало смены в это время или позже — «поздняя» смена, перед ней нужен дневной сон.
const LATE_START = 20 * 60 // 20:00
const DAY_SLEEP_MINUTES = 3 * 60 // 3 часа = 2 цикла по 90 минут
const WAKE_BEFORE_MINUTES = 2 * 60 // подъём за 2 часа до начала смены
const FALL_ASLEEP_MINUTES = 15 // лечь на 15 минут раньше — время на засыпание
const NIGHT_SLEEP_BEFORE = '23:45–9:00' // обычный ночной сон накануне
// Если смена накануне заканчивается в это время или позже — она «съела» всю ночь.
const NIGHT_IS_TAKEN_FROM = 6 * 60 // 06:00

export function sleepTips(shiftDate: string, data: ShiftsData): string[] {
  const entry = data.days[shiftDate]
  if (entry?.status !== 'shift') return []

  const start = timeToMinutes(entry.time.start)
  const isLate = start >= LATE_START
  const tips: string[] = []

  // 1. Ночь перед сменой — зависит от того, была ли смена накануне.
  const dayBefore = addDays(shiftDate, -1)
  const prev = data.days[dayBefore]
  const prevOvernight = prev?.status === 'shift' && endsNextDay(prev.time) ? prev : null

  if (prevOvernight && timeToMinutes(prevOvernight.time.end) >= NIGHT_IS_TAKEN_FROM) {
    // «Вторая ночь подряд»: накануне смена до утра — ночного сна не будет.
    tips.push(
      `Накануне, ${formatDayShort(dayBefore)}, — тоже смена (${formatTime(prevOvernight.time)}), ` +
        'обычного ночного сна перед этой сменой не будет — отоспись после неё.',
    )
  } else if (prevOvernight) {
    // Смена накануне кончилась глубокой ночью (например, 17:00–01:00).
    tips.push(
      `Накануне смена до ${prevOvernight.time.end} — после неё сразу спать, встать не раньше 9:00–10:00.`,
    )
  } else if (isLate) {
    tips.push(`Накануне, ${formatDayShort(dayBefore)}: ночной сон ${NIGHT_SLEEP_BEFORE}.`)
  } else {
    tips.push('Ночью перед сменой выспаться: встать не раньше 9:00–10:00.')
  }

  // 2. Дневной сон — только перед поздней сменой.
  if (isLate) {
    // Считаем назад от начала смены: подъём → начало сна → когда лечь.
    const wake = start - WAKE_BEFORE_MINUTES
    const sleepStart = wake - DAY_SLEEP_MINUTES
    const lieDown = sleepStart - FALL_ASLEEP_MINUTES
    tips.push(
      `В день смены: лечь ${minutesToTime(lieDown)}, сон ${minutesToTime(sleepStart)}–${minutesToTime(wake)} ` +
        '(3 часа, 2 цикла по 90 мин), подъём за 2 часа до начала.',
    )
  } else {
    tips.push('Смена начинается до 20:00 — дневной сон не нужен.')
  }

  return tips
}
