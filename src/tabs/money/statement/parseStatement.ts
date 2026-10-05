// Разбор текста выписки Ozon Банка. Без React и без PDF: на входе — строки текста
// (их достаёт pdfText.ts), на выходе — операции, итоги и результат сверки.
//
// Как выглядит строка таблицы в настоящей выписке Ozon (проверено на реальном PDF):
//   ДД.ММ.ГГГГ ЧЧ:ММ:СС  1393806949  Выплата процентов по   + 6.60 ₽   + 6.60 ₽
//                        4           счету 40817… за дату 03.10.2026.
// - сумма стоит в двух колонках (две одинаковые копии в строке);
// - длинный номер документа (11 цифр) переносится: последняя цифра — в начале 2-й строки;
// - назначение переносится на несколько строк, иногда посреди слова или даты;
// - внизу каждой страницы — номер страницы отдельной строкой.
import type { StatementKind } from '../../../types'
import { AMOUNT, NUMBER, joinLines, stripAmounts } from '../../../utils/statementText'

export type { StatementKind }

export interface StatementOperation {
  date: string // 'YYYY-MM-DD'
  time: string // 'HH:MM:SS'
  doc: string
  purpose: string
  amount: number // копейки со знаком
}

export interface StatementCheck {
  status: 'ok' | 'mismatch' | 'no-totals' | 'empty'
  message: string
}

export interface ParsedStatement {
  kind: StatementKind // тип выписки, определённый по содержимому
  account: string // номер лицевого счёта из шапки ('' — не нашёлся)
  periodEnd: string | null // 'YYYY-MM-DD' — конец периода выписки
  operations: StatementOperation[]
  creditKop: number // сумма зачислений по операциям
  debitKop: number // сумма списаний по операциям (положительное число)
  totalCreditKop: number | null // «Итого зачислений» из выписки
  totalDebitKop: number | null // «Итого списаний» из выписки
  openingKop: number | null // «Входящий остаток»
  closingKop: number | null // «Исходящий остаток» — сколько на счёте в конце периода
  unparsed: number // сколько операций не удалось разобрать (нет суммы)
  check: StatementCheck
}

// Метка «здесь кончилась страница» — её вставляет pdfText.ts между страницами.
export const PAGE_BREAK = '<<page-break>>'

// Начало операции: дата и время в начале строки.
const OP_START = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2}:\d{2})\s*(.*)$/u
// Строки, после которых список операций заканчивается.
const END_MARKER = /^(Итого|Исходящий остаток|Входящий остаток|Остаток на конец)/iu
// Слова шапки таблицы — она повторяется на каждой странице.
const HEADER_WORDS = ['Дата операции', 'Документ', 'Назначение платежа', 'Сумма операции', 'Сумма в валюте']
// Номер страницы — строка из одного короткого числа.
const PAGE_NUMBER = /^\d{1,3}$/u

// '1 234.56' → 123456 (копейки)
export function parseKop(text: string): number {
  const normalized = text.replace(/[   ]/g, '').replace(',', '.')
  return Math.round(Number(normalized) * 100)
}

// Мусор между операциями: шапка таблицы на новой странице, «Страница N из M».
function isNoise(line: string): boolean {
  if (/^Страница\s+\d+/iu.test(line)) return true
  if (/^\d+\s*(из|\/)\s*\d+$/u.test(line)) return true
  const headerHits = HEADER_WORDS.filter((w) => line.includes(w)).length
  return headerHits >= 2
}

// Ищет сумму в строке «Итого …» (или в следующей строке, если в этой числа нет).
function findTotal(lines: string[], label: RegExp): number | null {
  const index = lines.findIndex((l) => label.test(l))
  if (index === -1) return null
  for (const line of [lines[index], lines[index + 1] ?? '']) {
    // Берём ПОСЛЕДНЕЕ число в строке: перед ним могут быть даты периода.
    const numbers = [...line.replace(label, '').matchAll(new RegExp(NUMBER, 'gu'))]
    if (numbers.length > 0) return parseKop(numbers[numbers.length - 1][0])
  }
  return null
}

// Разбирает одну операцию — все её строки (первая начинается с даты и времени).
function parseOperation(chunk: string[]): StatementOperation | null {
  const m = OP_START.exec(chunk[0])
  if (!m) return null
  const [, dd, mm, yyyy, time, rest] = m
  const [doc = '', ...firstLineWords] = rest.split(/\s+/u)
  const continuation = chunk.slice(1)

  // Перенос номера документа: короткое число в начале 2-й строки — его хвост.
  let fullDoc = doc
  if (/^\d+$/u.test(doc) && continuation.length > 0) {
    const tail = /^(\d{1,3})(?:\s+|$)(.*)$/u.exec(continuation[0])
    if (tail) {
      fullDoc += tail[1]
      continuation[0] = tail[2]
    }
  }

  const text = joinLines([firstLineWords.join(' '), ...continuation.filter(Boolean)])

  // Сумма — последнее совпадение «± число ₽». Копий может быть несколько (две колонки сумм),
  // поэтому из назначения убираем ВСЕ.
  const amounts = [...text.matchAll(new RegExp(AMOUNT, 'gu'))]
  if (amounts.length === 0) return null
  const last = amounts[amounts.length - 1]
  const amount = (last[1] === '+' ? 1 : -1) * parseKop(last[2])

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time,
    doc: fullDoc,
    purpose: stripAmounts(text),
    amount,
  }
}

function formatKop(kop: number): string {
  return (kop / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽'
}

export function parseStatementLines(rawLines: string[]): ParsedStatement {
  const lines = rawLines
    .map((l) => (l === PAGE_BREAK ? l : l.replace(/\s+/gu, ' ').trim()))
    .filter(Boolean)
  const textLines = lines.filter((l) => l !== PAGE_BREAK)

  // 1. Режем текст на куски «одна операция = одна или несколько строк».
  const chunks: string[][] = []
  let current: string[] | null = null
  let pageStart = true // только что началась страница — сверху может быть номер страницы
  for (const line of lines) {
    if (line === PAGE_BREAK) {
      // Последняя строка страницы — номер страницы, к операции он не относится.
      if (current && current.length > 1 && PAGE_NUMBER.test(current[current.length - 1])) {
        current.pop()
      }
      pageStart = true
      continue
    }
    if (pageStart && PAGE_NUMBER.test(line)) continue
    pageStart = false

    if (OP_START.test(line)) {
      if (current) chunks.push(current)
      current = [line]
    } else if (current) {
      if (END_MARKER.test(line)) {
        chunks.push(current)
        current = null
      } else if (!isNoise(line)) {
        current.push(line) // продолжение назначения / хвост номера документа
      }
    }
  }
  if (current) chunks.push(current)

  // 2. Разбираем каждую операцию.
  const operations: StatementOperation[] = []
  let unparsed = 0
  for (const chunk of chunks) {
    const op = parseOperation(chunk)
    if (op) operations.push(op)
    else unparsed++
  }

  // 3. Итоги по операциям и из выписки.
  const creditKop = operations.filter((o) => o.amount > 0).reduce((s, o) => s + o.amount, 0)
  const debitKop = operations.filter((o) => o.amount < 0).reduce((s, o) => s - o.amount, 0)
  const totalCreditKop = findTotal(textLines, /Итого\s+зачислени[йя]/iu)
  const totalDebitKop = findTotal(textLines, /Итого\s+списани[йя]/iu)

  // 4. Сверка.
  let check: StatementCheck
  const problems: string[] = []
  if (totalCreditKop !== null && totalCreditKop !== creditKop) {
    problems.push(
      `зачисления по операциям ${formatKop(creditKop)}, а «Итого зачислений» ${formatKop(totalCreditKop)}`,
    )
  }
  if (totalDebitKop !== null && totalDebitKop !== debitKop) {
    problems.push(
      `списания по операциям ${formatKop(debitKop)}, а «Итого списаний» ${formatKop(totalDebitKop)}`,
    )
  }
  if (unparsed > 0) problems.push(`не удалось разобрать операций: ${unparsed}`)

  if (operations.length === 0) {
    check = { status: 'empty', message: 'В файле не нашлось ни одной операции. Это точно выписка Ozon Банка?' }
  } else if (problems.length > 0) {
    check = { status: 'mismatch', message: `Не сходится: ${problems.join('; ')}.` }
  } else if (totalCreditKop === null && totalDebitKop === null) {
    check = {
      status: 'no-totals',
      message: 'В выписке не нашлись строки «Итого зачислений / списаний» — сверить суммы не получилось.',
    }
  } else {
    check = {
      status: 'ok',
      message: `Суммы сходятся с итогами выписки: зачисления ${formatKop(creditKop)}, списания ${formatKop(debitKop)}.`,
    }
  }

  // 5. Шапка (до первой операции): номер счёта и период.
  const firstOp = textLines.findIndex((l) => OP_START.test(l))
  const header = firstOp === -1 ? textLines : textLines.slice(0, firstOp)
  const account = findAccount(header)
  const periodEnd = findPeriodEnd(header)

  return {
    kind: detectKind(operations, header),
    account,
    periodEnd,
    operations,
    creditKop,
    debitKop,
    totalCreditKop,
    totalDebitKop,
    openingKop: findTotal(textLines, /Входящий\s+остаток/iu),
    closingKop: findTotal(textLines, /Исходящий\s+остаток/iu),
    unparsed,
    check,
  }
}

// Тип выписки — по СОДЕРЖИМОМУ: в настоящих выписках Ozon шапки карты и накопительного
// одинаковые («Справка о движении средств»). У накопительного каждый день есть
// «Выплата процентов по счету», а покупок по карте нет. Запасной вариант — слово
// «накопительн» в шапке (бывает в других видах выписок). Можно поменять вручную.
export function detectKind(operations: StatementOperation[], header: string[]): StatementKind {
  const hasInterest = operations.some((o) => /Выплата процентов по сч[её]ту/iu.test(o.purpose))
  const hasCardPurchases = operations.some((o) => /Оплата товаров по карте/iu.test(o.purpose))
  if (hasInterest && !hasCardPurchases) return 'savings'
  if (header.some((l) => /накопительн/iu.test(l))) return 'savings'
  return 'card'
}

// «Номер лицевого счёта: № 40817810000000000000, открыт …» → '40817810000000000000'.
// В других видах выписок — «Выписка по счёту № 4081…».
function findAccount(header: string[]): string {
  for (const line of header) {
    const m = /сч[её]т[а-я]*:?\s*№\s*(\d{20})/iu.exec(line)
    if (m) return m[1]
  }
  return ''
}

// «Период выписки: 04.07.2026 – 04.10.2026» → '2026-10-04' (вторая дата).
function findPeriodEnd(header: string[]): string | null {
  for (const line of header) {
    if (!/^Период/iu.test(line)) continue
    const dates = [...line.matchAll(/(\d{2})\.(\d{2})\.(\d{4})/gu)]
    const last = dates[dates.length - 1]
    if (last) return `${last[3]}-${last[2]}-${last[1]}`
  }
  return null
}
