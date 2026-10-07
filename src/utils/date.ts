// Общие функции для работы с датами (нужны в разных частях приложения).
// Даты везде хранятся строками 'YYYY-MM-DD' — их легко сохранять в JSON и сравнивать.

const DAY_MS = 24 * 60 * 60 * 1000

// 5 → '05'
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// 'YYYY-MM-DD' → миллисекунды полуночи этого дня по UTC.
// Считаем в UTC специально: в местном времени из-за перехода на летнее время
// в сутках бывает 23 или 25 часов, и деление на DAY_MS давало бы сбой.
function isoToUtcMs(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

// Сегодняшняя дата в формате 'YYYY-MM-DD' по местному времени.
// (toISOString() не подходит: он даёт дату по UTC, и ночью может «уехать» на день.)
export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// Собирает 'YYYY-MM-DD' из года, месяца (0–11, как в Date) и дня.
export function makeIso(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

// Сдвигает дату на n дней (n может быть отрицательным).
export function addDays(iso: string, n: number): string {
  const d = new Date(isoToUtcMs(iso) + n * DAY_MS)
  return makeIso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// Сдвигает дату на n месяцев. Если такого числа в месяце нет (31 января + 1 месяц),
// берётся последний день месяца (28/29 февраля).
export function addMonths(iso: string, n: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const total = year * 12 + (month - 1) + n
  const y = Math.floor(total / 12)
  const m = total % 12
  return makeIso(y, m, Math.min(day, daysInMonth(y, m)))
}

// Сколько дней от from до to (to раньше from — получится отрицательное число).
export function daysBetween(from: string, to: string): number {
  return Math.round((isoToUtcMs(to) - isoToUtcMs(from)) / DAY_MS)
}

// Сколько дней в месяце. Трюк: «нулевой» день следующего месяца — это последний день текущего.
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

// Название месяца с годом: (2026, 9) → 'Октябрь 2026'. monthIndex — 0–11.
export function formatMonthTitle(year: number, monthIndex: number): string {
  const text = new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('ru-RU', {
    month: 'long',
    timeZone: 'UTC',
  })
  return `${text[0].toUpperCase()}${text.slice(1)} ${year}`
}

// День недели, где понедельник = 0, …, воскресенье = 6 (в Date воскресенье = 0).
export function weekdayMondayFirst(iso: string): number {
  return (new Date(isoToUtcMs(iso)).getUTCDay() + 6) % 7
}

// '2026-10-06' → 'вторник, 6 октября'
export function formatDayLong(iso: string): string {
  return new Date(isoToUtcMs(iso)).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

// '2026-10-06' → '6 октября'
export function formatDayShort(iso: string): string {
  return new Date(isoToUtcMs(iso)).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

// Подпись диапазона дат (например, недели):
//   один месяц        → '5–11 октября 2026'
//   разные месяцы     → '28 сентября – 4 октября 2026'
//   разные годы       → '28 декабря 2026 – 3 января 2027'
export function formatDateRange(from: string, to: string): string {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number)
  const [toYear, toMonth] = to.split('-').map(Number)
  if (fromYear !== toYear) {
    return `${formatDayShort(from)} ${fromYear} – ${formatDayShort(to)} ${toYear}`
  }
  if (fromMonth !== toMonth) {
    return `${formatDayShort(from)} – ${formatDayShort(to)} ${toYear}`
  }
  return `${fromDay}–${formatDayShort(to)} ${toYear}`
}
