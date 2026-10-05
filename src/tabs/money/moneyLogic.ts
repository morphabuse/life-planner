// Логика «Денег». Без React — только чистые функции.
// Суммы операций хранятся в копейках (целые), наружу для показа отдаём рубли.
import type { AccountInfo, Deposit, MoneyData, MoneySettings, Transaction } from '../../types'
import { merchantKey } from '../../utils/statementText'
import { legacyOperationKey, operationKey } from '../../utils/operationKey'

// Ключ магазина живёт в utils (он нужен и хранилищу), здесь — для удобства импорта.
export { merchantKey }

// ---------- Категории ----------

export const CATEGORY_INCOME = 'Доход: склад'
export const CATEGORY_TRANSFER = 'Перевод между счетами' // не трата и не доход
export const CATEGORY_INTEREST = 'Проценты' // проценты банка: не зарплата и не трата
export const CATEGORY_CLOTHES = 'Одежда' // списывается из конверта «одежда»
export const CATEGORY_OTHER = 'Прочее'

// Категории, которые не входят в траты конвертов.
const NOT_SPENDING = new Set([CATEGORY_INCOME, CATEGORY_TRANSFER, CATEGORY_INTEREST])

export const BUILTIN_CATEGORIES = [
  'Продукты',
  'Кафе',
  'Такси',
  'Проезд',
  'Игры',
  CATEGORY_CLOTHES,
  CATEGORY_OTHER,
  CATEGORY_INCOME,
  CATEGORY_TRANSFER,
  CATEGORY_INTEREST,
]

// Встроенные правила «назначение платежа → категория». Проверяются по порядку,
// первое совпадение побеждает (поэтому YANDEX*…*EDA стоит раньше YANDEX*…*GO).
// Флаги: i — без учёта регистра, u — нормальная работа с кириллицей.
const BUILTIN_RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /YANDEX\*(?:.*\*)?EDA/iu, category: 'Кафе' },
  { pattern: /YANDEX\*.*\*GO\b/iu, category: 'Такси' },
  // Без \b в конце: в выписке бывает «ETK31.RU», «OOO ETK 940», «OOO GPP 73».
  { pattern: /\b(?:AVTOMIG|ETK|GPP)/iu, category: 'Проезд' },
  { pattern: /BURGER|БУРГЕР|VKUSNOITOCHKA|SHAVERMA/iu, category: 'Кафе' },
  { pattern: /MAGNIT|KRASNOE|Тандер|EVROPA|LINIYA/iu, category: 'Продукты' },
  { pattern: /МОБИ\.ДЕНЬГИ|МУРМАНСКИЙ РАСЧ[ЕЁ]ТНЫЙ|DUKPEJ/iu, category: 'Игры' },
  { pattern: /Оплата за усл\. по дог\./iu, category: CATEGORY_INCOME },
  { pattern: /Перевод собственных средств/iu, category: CATEGORY_TRANSFER },
  { pattern: /(?:Выплата|Начисление) процентов/iu, category: CATEGORY_INTEREST },
]

// Категория операции: сначала твоё правило для магазина, потом встроенные, иначе «Прочее».
export function categorize(tx: Transaction, rules: Record<string, string>): string {
  const own = rules[merchantKey(tx.purpose)]
  if (own) return own
  const builtin = BUILTIN_RULES.find((r) => r.pattern.test(tx.purpose))
  return builtin ? builtin.category : CATEGORY_OTHER
}

// Все категории для выпадающего списка: встроенные + свои + встречающиеся в правилах и лимитах.
export function allCategories(money: MoneyData): string[] {
  const set = new Set([
    ...BUILTIN_CATEGORIES,
    ...money.settings.customCategories,
    ...Object.values(money.rules),
    ...Object.keys(money.settings.limits),
  ])
  return [...set]
}

// Категории трат конверта «жизнь» — на них можно ставить лимиты.
export function lifeCategories(money: MoneyData): string[] {
  return allCategories(money).filter((c) => !NOT_SPENDING.has(c) && c !== CATEGORY_CLOTHES)
}

// ---------- Месяц ----------

// '2026-10-' — по этому префиксу отбираем даты месяца. monthIndex — 0–11.
export function monthPrefix(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-`
}

function inMonth(date: string, prefix: string): boolean {
  return date.startsWith(prefix)
}

// Доход за месяц в рублях: только «Доход: склад» с плюсом.
export function monthIncome(money: MoneyData, prefix: string): number {
  let kop = 0
  for (const tx of money.transactions) {
    if (inMonth(tx.date, prefix) && tx.amount > 0 && categorize(tx, money.rules) === CATEGORY_INCOME) {
      kop += tx.amount
    }
  }
  return kop / 100
}

// Доход «Доход: склад» за промежуток дат [from, to] включительно, в рублях (для итога недели).
export function incomeBetween(money: MoneyData, from: string, to: string): number {
  let kop = 0
  for (const tx of money.transactions) {
    if (tx.date >= from && tx.date <= to && tx.amount > 0 && categorize(tx, money.rules) === CATEGORY_INCOME) {
      kop += tx.amount
    }
  }
  return kop / 100
}

// Траты за месяц по категориям, в рублях. Считаем «чистыми»: списания минус поступления
// той же категории (возврат за покупку, человек вернул долг по СБП, кешбэк).
// Если поступлений больше, чем трат, категория даёт 0, а не минус.
// Доход, переводы между своими счетами и проценты — не траты.
export function monthSpendingByCategory(money: MoneyData, prefix: string): Record<string, number> {
  const netKop: Record<string, number> = {}
  for (const tx of money.transactions) {
    if (!inMonth(tx.date, prefix)) continue
    const category = categorize(tx, money.rules)
    if (NOT_SPENDING.has(category)) continue
    netKop[category] = (netKop[category] ?? 0) - tx.amount
  }
  const result: Record<string, number> = {}
  for (const [category, kop] of Object.entries(netKop)) {
    if (kop > 0) result[category] = kop / 100
  }
  return result
}

// ---------- Конверты ----------

export interface Envelope {
  planned: number // положено по правилу распределения
  used: number // потрачено (жизнь, одежда) или отложено (Турция)
  left: number // остаток = положено − использовано (может быть < 0)
}

export interface Envelopes {
  income: number
  life: Envelope
  turkey: Envelope
  clothes: Envelope
}

export function calcEnvelopes(money: MoneyData, deposits: Deposit[], prefix: string): Envelopes {
  const income = monthIncome(money, prefix)
  const { split } = money.settings
  const spending = monthSpendingByCategory(money, prefix)

  const clothesSpent = spending[CATEGORY_CLOTHES] ?? 0
  // Всё, кроме одежды, — из конверта «жизнь».
  const lifeSpent = Object.entries(spending)
    .filter(([category]) => category !== CATEGORY_CLOTHES)
    .reduce((sum, [, value]) => sum + value, 0)
  // Конверт «Турция» связан с копилкой: «отложено» = пополнения копилки за месяц.
  const saved = deposits.filter((d) => inMonth(d.date, prefix)).reduce((s, d) => s + d.amount, 0)

  const envelope = (percent: number, used: number): Envelope => {
    const planned = (income * percent) / 100
    return { planned, used, left: planned - used }
  }

  return {
    income,
    life: envelope(split.life, lifeSpent),
    turkey: envelope(split.turkey, saved),
    clothes: envelope(split.clothes, clothesSpent),
  }
}

// ---------- Лимиты ----------

export interface LimitUsage {
  category: string
  limit: number
  spent: number
  over: number // на сколько превышен (0 — не превышен)
}

export function calcLimits(money: MoneyData, prefix: string): LimitUsage[] {
  const spending = monthSpendingByCategory(money, prefix)
  return Object.entries(money.settings.limits).map(([category, limit]) => {
    const spent = spending[category] ?? 0
    return { category, limit, spent, over: Math.max(0, spent - limit) }
  })
}

// ---------- Смены и деньги ----------

// Сколько с одной смены уходит на Турцию.
export function turkeyPerShift(settings: MoneySettings): number {
  return (settings.shiftPay * settings.split.turkey) / 100
}

// «До Турции осталось N смен» = остаток цели / (процент Турции × цена смены).
// null — посчитать нельзя (на Турцию 0 %).
export function shiftsToGoal(leftRub: number, settings: MoneySettings): number | null {
  const perShift = turkeyPerShift(settings)
  if (perShift <= 0) return null
  return Math.ceil(leftRub / perShift)
}

// Цена пропусков: всего и сколько из этого недополучила Турция.
export function missedCost(missed: number, settings: MoneySettings) {
  const total = missed * settings.shiftPay
  return { total, turkey: (total * settings.split.turkey) / 100 }
}

// Средний доход за смену по факту (доход из выписки / отработанные смены).
export function averagePerShift(income: number, worked: number): number | null {
  return worked > 0 && income > 0 ? income / worked : null
}

// ---------- Импорт выписок ----------

export { operationKey }

// Операция из выписки (ещё без id). account — номер счёта из шапки ('' — неизвестен).
export type IncomingOperation = Omit<Transaction, 'id'>

// Операции выписки с номером её счёта — он входит в ключ операции.
// Все места импорта берут операции только отсюда, чтобы ключи везде совпадали.
export function statementOperations(statement: {
  account: string
  operations: Omit<IncomingOperation, 'account'>[]
}): IncomingOperation[] {
  return statement.operations.map((o) => ({ ...o, account: statement.account || undefined }))
}

export interface MergeResult {
  transactions: Transaction[]
  added: number // новых операций
  updated: number // уже были, но разобраны иначе (например, после исправления разбора) — обновлены
  duplicates: number // уже были и совпадают — пропущены
}

// Добавляет операции из выписки карты. Уже загруженную операцию (тот же ключ)
// не дублирует, а заменяет свежей версией — так повторная загрузка той же выписки
// чинит операции, если разбор был улучшен.
//
// Миграция старых данных: операции, сохранённые до появления номера счёта в ключе,
// лежат под ключом 'документ|дата время'. Если пришла та же операция уже со счётом —
// старая запись заменяется новой (это может быть и копия из выписки накопительного,
// по ошибке загруженной как карта, — тогда у неё был другой знак, и он исправится).
export function mergeTransactions(existing: Transaction[], incoming: IncomingOperation[]): MergeResult {
  const byId = new Map(existing.map((t) => [t.id, t]))
  let added = 0
  let updated = 0
  let duplicates = 0
  const seen = new Set<string>() // защита от повторов внутри одной выписки
  for (const op of incoming) {
    const id = operationKey(op)
    if (seen.has(id)) continue
    seen.add(id)

    let old = byId.get(id)
    const legacyId = legacyOperationKey(op)
    if (!old && legacyId !== id) {
      const legacy = byId.get(legacyId)
      if (legacy && !legacy.account) {
        old = legacy
        byId.delete(legacyId) // переезжает под новый ключ
      }
    }

    const fresh: Transaction = { id, ...op }
    if (!old) added++
    else if (old.purpose !== fresh.purpose || old.amount !== fresh.amount) updated++
    else duplicates++
    byId.set(id, fresh)
  }
  return { transactions: [...byId.values()], added, updated, duplicates }
}

// Миграция при загрузке выписки накопительного: в старых данных среди операций карты
// могут лежать его операции (раньше тип выписки угадывался неправильно, и она
// загружалась как карта). Узнаём их по старому ключу без счёта и той же сумме со знаком
// и убираем. Копия с карты (тот же ключ, другой знак) остаётся.
export function removeSavingsCopies(
  transactions: Transaction[],
  savingsOps: IncomingOperation[],
): { transactions: Transaction[]; removed: number } {
  const copies = new Set(savingsOps.map((op) => `${legacyOperationKey(op)}|${op.amount}`))
  const kept = transactions.filter((t) => t.account || !copies.has(`${t.id}|${t.amount}`))
  return { transactions: kept, removed: transactions.length - kept.length }
}

export interface PiggyCandidate {
  key: string
  date: string
  amount: number // рубли со знаком: + пополнение / проценты, − снятие
  kind: 'transfer' | 'withdrawal' | 'interest' // перевод на счёт, снятие со счёта, проценты
  already: boolean // уже есть в копилке
}

// Выписка счёта копилки (накопительного): что идёт в копилку —
// входящие «Переводы собственных средств» (пополнение), исходящие (снятие, с минусом)
// и проценты, начисленные на этот счёт.
export function piggyCandidates(ops: IncomingOperation[], deposits: Deposit[]): PiggyCandidate[] {
  // Старые записи копилки хранят ключ без счёта — узнаём и их.
  const imported = new Set(deposits.map((d) => d.importKey).filter(Boolean))
  const result: PiggyCandidate[] = []
  for (const op of ops) {
    let kind: PiggyCandidate['kind'] | null = null
    if (/Перевод собственных средств/iu.test(op.purpose)) {
      kind = op.amount > 0 ? 'transfer' : 'withdrawal'
    } else if (op.amount > 0 && /(?:Выплата|Начисление) процентов|Капитализация/iu.test(op.purpose)) {
      kind = 'interest'
    }
    if (!kind) continue
    const key = operationKey(op)
    const already = imported.has(key) || imported.has(legacyOperationKey(op))
    result.push({ key, date: op.date, amount: op.amount / 100, kind, already })
  }
  return result
}

// ---------- Счета и «данные по …» ----------

// Остаток на накопительных счетах по последним выпискам (сумма по всем таким счетам).
// null — ни одной выписки накопительного с «Исходящим остатком» ещё не загружено.
export function savingsBalance(accounts: Record<string, AccountInfo>): { amount: number; date: string } | null {
  let amount = 0
  let date = ''
  for (const info of Object.values(accounts)) {
    if (info.kind !== 'savings' || !info.balance) continue
    amount += info.balance.amount
    if (info.balance.date > date) date = info.balance.date
  }
  return date ? { amount, date } : null
}

// По какую дату есть данные: конец периода последней выписки карты
// или дата последней операции, если периода нет. null — данных нет.
export function dataUntil(money: MoneyData, deposits: Deposit[]): string | null {
  let latest = ''
  for (const info of Object.values(money.accounts)) {
    if (info.periodEnd && info.periodEnd > latest) latest = info.periodEnd
  }
  for (const t of money.transactions) if (t.date > latest) latest = t.date
  if (!latest) for (const d of deposits) if (d.date > latest) latest = d.date
  return latest || null
}

// Последний месяц, в котором есть операции по карте или записи копилки.
// Его показываем при открытии вкладки, чтобы не попадать на пустой текущий месяц.
export function latestDataMonth(money: MoneyData, deposits: Deposit[]): { year: number; monthIndex: number } | null {
  let latest = ''
  for (const t of money.transactions) if (t.date > latest) latest = t.date
  for (const d of deposits) if (d.date > latest) latest = d.date
  if (!latest) return null
  return { year: Number(latest.slice(0, 4)), monthIndex: Number(latest.slice(5, 7)) - 1 }
}
