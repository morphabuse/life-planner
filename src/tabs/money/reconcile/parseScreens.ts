// Разбор текста, распознанного со скриншотов приложения Ozon Банка. Без React и без OCR —
// на вход строки текста, на выход суммы по счетам. Так логику легко проверить отдельно.
//
// Как выглядят экраны:
//   «Ваши накопления» — у каждого счёта сумма, а СТРОКОЙ НИЖЕ название:
//       1 234,56 ₽          7,19 ₽ • 12%      ← справа плашка процентов (её сумму не берём)
//       Одежда, уход за собой + 0,2…        ← в строке названия бывает «+ 0,15 ₽ сегодня»
//   Главный экран — наоборот, название СТРОКОЙ ВЫШЕ суммы:
//       Основной счёт
//       345,67 ₽
// Поэтому для найденного названия сумму ищем сначала НАД ним (до 2 строк: значок счёта
// OCR иногда читает как мусорную строку «ig] |» между суммой и названием), потом — ПОД ним.
// Сумму в самой строке названия не берём: там «+ 3,23 ₽ сегодня». И вообще суммы со знаком
// «+» — это прирост за день, а не остаток.
import type { BalanceKind, ReconcileName } from '../../../types'

// Сумма: «12 345,67 ₽», «234,56 ₽», «345,67 Р». Копейки обязательны — так не спутать
// с годами и процентами. Знак рубля OCR часто читает как «Р», «P» или «?» — он необязателен.
const AMOUNT = /(\d{1,3}(?:[   ]\d{3})+|\d+)[,.](\d{2})(?!\d)/g

// Все суммы в строке (кроме сумм со знаком «+»), в копейках, по порядку слева направо.
export function amountsIn(line: string): number[] {
  const result: number[] = []
  for (const match of line.matchAll(AMOUNT)) {
    if (/\+\s*$/.test(line.slice(0, match.index))) continue // «+ 0,15 ₽ сегодня» — прирост
    const rub = Number(match[1].replace(/[   ]/g, ''))
    result.push(rub * 100 + Number(match[2]))
  }
  return result
}

// Текст для сравнения: строчные буквы, «ё» → «е», только буквы и пробелы.
export function normalizeName(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Расстояние Левенштейна: сколько букв нужно поменять/вставить/удалить, чтобы из a получить b.
// Нужно, потому что OCR иногда путает буквы («Турцня» вместо «Турция»).
function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const saved = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = saved
    }
  }
  return prev[b.length]
}

// Похоже ли слово строки на слово названия: длинным словам прощаем одну ошибку.
function similarWord(word: string, target: string): boolean {
  if (word === target) return true
  return target.length >= 5 && Math.abs(word.length - target.length) <= 1 && editDistance(word, target) <= 1
}

// Есть ли название счёта в строке. Слова названия должны идти в строке подряд
// (служебные короткие слова вроде «за» не обязательны).
export function lineHasName(line: string, name: string): boolean {
  const words = normalizeName(line).split(' ')
  const target = normalizeName(name).split(' ').filter((w) => w.length >= 3)
  if (target.length === 0) return false
  for (let start = 0; start < words.length; start++) {
    let i = start
    let matched = 0
    for (const t of target) {
      // Пропускаем одно короткое слово («за», «и»), если оно стоит между словами названия.
      if (i < words.length && !similarWord(words[i], t) && words[i].length < 3) i++
      if (i < words.length && similarWord(words[i], t)) {
        matched++
        i++
      } else break
    }
    if (matched === target.length) return true
  }
  return false
}

// Что ввёл вручную: «1 234,56» / «1234.5» / «1234» → копейки. null — не число.
export function parseRubInput(text: string): number | null {
  const clean = text.replace(/[\s  ₽]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null
  return Math.round(Number(clean) * 100)
}

// Найденные суммы: счёт → копейки. Счета, которых нет в сопоставлении («скидка»), не попадают.
export type ScreenBalances = Partial<Record<BalanceKind, number>>

// Разбор текста одного или нескольких скриншотов. names — сопоставление из настроек.
// Если один счёт найден на нескольких скринах — берём первое найденное.
export function parseBalanceScreens(texts: string[], names: ReconcileName[]): ScreenBalances {
  const result: ScreenBalances = {}
  for (const text of texts) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    // Есть ли в строке название какого-нибудь счёта из сопоставления.
    const hasAnyName = (line: string) => names.some((n) => lineHasName(line, n.name))
    // Первая сумма в соседних строках: step = -1 — вверх, +1 — вниз. Не дальше 2 строк
    // и не дальше строки с названием другого счёта (там уже чужая сумма).
    const nearestAmount = (index: number, step: number): number | undefined => {
      for (let i = index + step, n = 0; n < 2 && i >= 0 && i < lines.length; i += step, n++) {
        if (hasAnyName(lines[i])) return undefined
        const kop = amountsIn(lines[i])[0]
        if (kop !== undefined) return kop
      }
      return undefined
    }
    lines.forEach((line, index) => {
      for (const { name, kind } of names) {
        if (result[kind] !== undefined || !lineHasName(line, name)) continue
        const kop = nearestAmount(index, -1) ?? nearestAmount(index, 1)
        if (kop !== undefined) result[kind] = kop
      }
    })
  }
  return result
}
