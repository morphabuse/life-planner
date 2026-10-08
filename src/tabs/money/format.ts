// Форматирование чисел и дат для показа на экране.

const moneyFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

// 200000 → «200 000 ₽»
export function formatMoney(amount: number): string {
  return moneyFormat.format(amount)
}

const kopFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// С копейками, если они есть: 1234.5 → «1 234,50 ₽», 350 → «350 ₽». Для операций из выписки.
export function formatMoneyExact(amount: number): string {
  return Number.isInteger(amount) ? moneyFormat.format(amount) : kopFormat.format(amount)
}

// Число с обязательным знаком: +1 234 ₽ / −350 ₽.
export function formatSigned(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : ''
  return sign + formatMoneyExact(Math.abs(amount))
}

// Склонение по числу: plural(92, 'смена', 'смены', 'смен') → 'смены'.
// Правило русского языка: 1, 21, 31… — первая форма; 2–4, 22–24… — вторая;
// 0, 5–20, 25–30… — третья (11–14 — всегда третья).
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

// '2026-10-05' → '05.10' — для подписи «считается с 05.10».
export function sinceLabel(from: string): string {
  return `считается с ${from.slice(8, 10)}.${from.slice(5, 7)}`
}

// '2026-10-08T12:21' → '08.10, 12:21' — для подписи «сверено 08.10, 12:21».
export function formatStamp(stamp: string): string {
  return `${stamp.slice(8, 10)}.${stamp.slice(5, 7)}, ${stamp.slice(11, 16)}`
}

// '2026-10-04' → '04.10.2026'
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}

// '2027-08' → 'август 2027 г.'
export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })
}
