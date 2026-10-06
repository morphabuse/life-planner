// Логика «Денег». Без React — только чистые функции.
// Суммы операций и остатков хранятся в копейках (целые), наружу для показа отдаём рубли.
//
// Как устроены деньги:
//   карта (основной счёт)  — на неё приходит доход за смены, с неё траты;
//   счета-конверты «Жизнь», «Турция», «Одежда и уход» — после каждого дохода
//   на них переводятся доли (по умолчанию 50/40/10).
import type {
  AccountKind,
  BalanceKind,
  EnvelopeKind,
  MoneyData,
  MoneySettings,
  SalarySplit,
  Transaction,
} from '../../types'
import { merchantKey } from '../../utils/statementText'
import { legacyOperationKey, operationKey } from '../../utils/operationKey'
import { addDays } from '../../utils/date'

// Ключ магазина живёт в utils (он нужен и хранилищу), здесь — для удобства импорта.
export { merchantKey }

// ---------- Счета ----------

export const ACCOUNT_LABELS: Record<AccountKind, string> = {
  card: 'Карта',
  life: 'Жизнь',
  turkey: 'Турция',
  clothes: 'Одежда и уход',
  other: 'Другой (не учитывать)',
}

export const ENVELOPES: EnvelopeKind[] = ['life', 'turkey', 'clothes']

// «Переведи X на …» — названия счетов в винительном падеже.
export const ENVELOPE_TO: Record<EnvelopeKind, string> = { life: 'Жизнь', turkey: 'Турцию', clothes: 'Одежду и уход' }
export const BALANCE_KINDS: BalanceKind[] = ['card', 'life', 'turkey', 'clothes']

// Какой это счёт для операции. Старые операции без номера счёта — с карты.
export function kindOf(tx: Transaction, money: Pick<MoneyData, 'accounts'>): AccountKind {
  if (!tx.account) return 'card'
  return money.accounts[tx.account]?.kind ?? 'card'
}

function cardTransactions(money: MoneyData): Transaction[] {
  return money.transactions.filter((t) => kindOf(t, money) === 'card')
}

// ---------- Категории ----------

export const CATEGORY_INCOME = 'Доход: склад'
export const CATEGORY_TRANSFER = 'Перевод между счетами' // не трата и не доход
export const CATEGORY_INTEREST = 'Проценты' // проценты банка: не зарплата и не трата
export const CATEGORY_CLOTHES = 'Одежда и уход' // одежда, косметика, барбершоп — со счёта «Одежда и уход»
export const CATEGORY_OTHER = 'Прочее'

// Категории, которые не входят в траты.
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
  // Барбершоп и косметика.
  { pattern: /BARBER|БАРБЕР|GOLDAPPLE|ZOLOTOE YABLOKO|LETU|ЛЭТУАЛЬ|RIVGOSH|РИВ ГОШ/iu, category: CATEGORY_CLOTHES },
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

// Категории трат — на них можно ставить лимиты.
export function spendingCategories(money: MoneyData): string[] {
  return allCategories(money).filter((c) => !NOT_SPENDING.has(c))
}

// ---------- Месяц ----------

// '2026-10-' — по этому префиксу отбираем даты месяца. monthIndex — 0–11.
export function monthPrefix(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-`
}

// С какого дня считать месяц. В месяце, где лежит дата старта, — с даты старта:
// доход до неё в конверты не идёт, значит и траты до неё сравнивать не с чем
// (иначе в октябре траты 1–4 числа давали ложный «перерасход»). В остальных месяцах — с 1-го.
// Возвращает дату 'YYYY-MM-DD' или null (весь месяц).
export function monthStart(money: MoneyData, prefix: string): string | null {
  const { start } = money.settings.goal
  return start.startsWith(prefix) ? start : null
}

// Траты с карты за месяц по категориям, в рублях. Считаем «чистыми»: списания минус
// поступления той же категории (возврат за покупку, человек вернул долг по СБП, кешбэк).
// Если поступлений больше, чем трат, категория даёт 0, а не минус.
// Доход, переводы между своими счетами и проценты — не траты.
// В месяце старта — только с даты старта (monthStart).
export function monthSpendingByCategory(money: MoneyData, prefix: string): Record<string, number> {
  const from = monthStart(money, prefix) ?? ''
  const netKop: Record<string, number> = {}
  for (const tx of cardTransactions(money)) {
    if (!tx.date.startsWith(prefix) || tx.date < from) continue
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

export interface CategorySpending {
  category: string
  spent: number // ₽
  limit: number | null // лимит в месяц, ₽ (null — без лимита)
  over: number // на сколько превышен (0 — не превышен)
}

// Траты месяца по категориям: сначала с лимитами (в порядке настройки), потом остальные
// по убыванию суммы.
export function categorySpending(money: MoneyData, prefix: string): CategorySpending[] {
  const spending = monthSpendingByCategory(money, prefix)
  const limited = Object.entries(money.settings.limits).map(([category, limit]) => {
    const spent = spending[category] ?? 0
    return { category, spent, limit, over: Math.max(0, spent - limit) }
  })
  const rest = Object.entries(spending)
    .filter(([category]) => !(category in money.settings.limits))
    .sort((a, b) => b[1] - a[1])
    .map(([category, spent]) => ({ category, spent, limit: null, over: 0 }))
  return [...limited, ...rest]
}

// ---------- Доход за смены ----------

// К какой смене относится платёж «Оплата за усл. по дог.».
// За смену приходят 2 платежа: аванс через 1–2 часа после начала (вечер дня D или ночь)
// и основная сумма около 12:00 следующего дня. Платежи с 18:00 дня D до 18:00 дня D+1
// относим к смене D: вечерний платёж — к смене этого дня, утренний и дневной — ко вчерашней.
export const SHIFT_PAYMENT_BOUNDARY = '18:00:00'

export function shiftDateOfPayment(date: string, time: string): string {
  return time >= SHIFT_PAYMENT_BOUNDARY ? date : addDays(date, -1)
}

// Платёж за смену: поступление на карту категории «Доход: склад».
function isIncomePayment(tx: Transaction, money: MoneyData): boolean {
  return tx.amount > 0 && kindOf(tx, money) === 'card' && categorize(tx, money.rules) === CATEGORY_INCOME
}

// Даты смен, за которые в этих операциях пришли деньги (для «отметить смену»).
export function incomeShiftDates(ops: Transaction[], money: MoneyData): string[] {
  const dates = new Set<string>()
  for (const tx of ops) if (isIncomePayment(tx, money)) dates.add(shiftDateOfPayment(tx.date, tx.time))
  return [...dates].sort()
}

// Сверка дохода смены: введённое вручную против выписки.
//   ok        — совпадает
//   statement — только по выписке (вручную не вводил)
//   manual    — только введено вручную (выписка ещё не пришла)
//   check     — расходится: «проверь»
export type IncomeStatus = 'ok' | 'statement' | 'manual' | 'check'

export interface ShiftIncome {
  shiftDate: string
  amountKop: number // итог: по выписке, если она есть, иначе введённое
  statementKop: number | null
  manualKop: number | null
  paidDate: string // когда пришли деньги: последний платёж по выписке; введённый вручную — дата смены
  status: IncomeStatus
}

// Все доходы за смены (по выписке карты + введённые вручную), по дате смены.
export function shiftIncomes(money: MoneyData): ShiftIncome[] {
  const fromStatement = new Map<string, { kop: number; paid: string }>()
  for (const tx of money.transactions) {
    if (!isIncomePayment(tx, money)) continue
    const shift = shiftDateOfPayment(tx.date, tx.time)
    const prev = fromStatement.get(shift)
    fromStatement.set(shift, {
      kop: (prev?.kop ?? 0) + tx.amount,
      paid: prev && prev.paid > tx.date ? prev.paid : tx.date,
    })
  }
  const dates = new Set([...fromStatement.keys(), ...Object.keys(money.manualIncome)])
  return [...dates].sort().map((shiftDate) => {
    const st = fromStatement.get(shiftDate)
    const manualRub = money.manualIncome[shiftDate]
    const manualKop = manualRub === undefined ? null : Math.round(manualRub * 100)
    const statementKop = st ? st.kop : null
    let status: IncomeStatus
    if (statementKop !== null && manualKop !== null) {
      // Вручную вводятся целые рубли — разница меньше рубля не считается.
      status = Math.abs(statementKop - manualKop) < 100 ? 'ok' : 'check'
    } else status = statementKop !== null ? 'statement' : 'manual'
    return {
      shiftDate,
      amountKop: statementKop ?? manualKop ?? 0,
      statementKop,
      manualKop,
      // Введённый вручную доход учитываем сразу (днём смены), чтобы «Перевёл» сразу шло в прогресс.
      paidDate: st ? st.paid : shiftDate,
      status,
    }
  })
}

// Доход за смены в промежутке дат смен [from, to] включительно, в рублях.
export function incomeBetween(money: MoneyData, from: string, to: string): number {
  return (
    shiftIncomes(money)
      .filter((i) => i.shiftDate >= from && i.shiftDate <= to)
      .reduce((s, i) => s + i.amountKop, 0) / 100
  )
}

// Доход за смены месяца (по дате смены), в рублях.
export function monthIncome(money: MoneyData, prefix: string): number {
  return (
    shiftIncomes(money)
      .filter((i) => i.shiftDate.startsWith(prefix))
      .reduce((s, i) => s + i.amountKop, 0) / 100
  )
}

// ---------- Доли дохода и переводы ----------

// Доли дохода по счетам, в копейках. «Жизнь» получает остаток от округления,
// чтобы сумма долей всегда равнялась доходу.
export function splitIncome(kop: number, split: SalarySplit): Record<EnvelopeKind, number> {
  const turkey = Math.round((kop * split.turkey) / 100)
  const clothes = Math.round((kop * split.clothes) / 100)
  return { life: kop - turkey - clothes, turkey, clothes }
}

// Доход, который делится по конвертам: только смены с даты старта (до неё — только аналитика).
export function envelopeIncomes(money: MoneyData): ShiftIncome[] {
  return shiftIncomes(money).filter((i) => i.shiftDate >= money.settings.goal.start && i.amountKop > 0)
}

export interface PendingTransfer {
  shiftDate: string
  kind: EnvelopeKind
  kop: number
}

// Доли дохода, которые ещё не отмечены «Перевёл» (для напоминаний).
export function pendingTransfers(money: MoneyData): PendingTransfer[] {
  const result: PendingTransfer[] = []
  for (const income of envelopeIncomes(money)) {
    const shares = splitIncome(income.amountKop, money.settings.split)
    const marks = money.transfers[income.shiftDate] ?? {}
    for (const kind of ENVELOPES) {
      if (shares[kind] > 0 && !marks[kind]) result.push({ shiftDate: income.shiftDate, kind, kop: shares[kind] })
    }
  }
  return result
}

const OWN_TRANSFER = /Перевод собственных средств/iu

export interface TransferCheck {
  // none        — выписки этого счёта нет
  // before      — выписка кончается раньше старта, сверять нечего
  // ok / short  — переведено сколько положено / меньше
  status: 'none' | 'before' | 'ok' | 'short'
  until: string | null // по какую дату сверено (конец выписки счёта)
  owedKop: number // положено перевести (доля доходов с даты старта по конец выписки)
  sentKop: number // пришло на счёт переводами с даты старта
}

// Сверка по выпискам: переводы на счёт-конверт против положенной доли доходов.
export function transferCheck(money: MoneyData, kind: EnvelopeKind): TransferCheck {
  const { start } = money.settings.goal
  const numbers = Object.entries(money.accounts)
    .filter(([, info]) => info.kind === kind && info.periodEnd)
    .map(([number]) => number)
  const until = numbers.reduce<string | null>((max, n) => {
    const end = money.accounts[n].periodEnd ?? ''
    return max === null || end > max ? end : max
  }, null)
  if (until === null) return { status: 'none', until: null, owedKop: 0, sentKop: 0 }
  if (until < start) return { status: 'before', until, owedKop: 0, sentKop: 0 }

  // Положено: доли доходов, деньги за которые пришли до конца выписки счёта.
  let owedKop = 0
  for (const income of envelopeIncomes(money)) {
    if (income.paidDate <= until) owedKop += splitIncome(income.amountKop, money.settings.split)[kind]
  }
  // Переведено: входящие «Переводы собственных средств» на этот счёт.
  let sentKop = 0
  for (const tx of money.transactions) {
    if (tx.account && numbers.includes(tx.account) && tx.amount > 0 && tx.date >= start && tx.date <= until && OWN_TRANSFER.test(tx.purpose)) {
      sentKop += tx.amount
    }
  }
  // Меньше рубля — округление, не недоперевод.
  return { status: owedKop - sentKop >= 100 ? 'short' : 'ok', until, owedKop, sentKop }
}

// ---------- Остатки на счетах ----------

// Остаток одного счёта на конец дня date, в копейках. Берём ближайший известный остаток
// из выписки (до этой даты или, если нет, после) и добавляем/вычитаем операции между ними.
// null — о счёте ничего не известно.
function accountBalanceAt(money: MoneyData, number: string, date: string): number | null {
  const info = money.accounts[number]
  if (!info) return null
  const ops = money.transactions.filter((t) => t.account === number)
  const sumOps = (from: string, to: string) =>
    ops.filter((t) => t.date > from && t.date <= to).reduce((s, t) => s + t.amount, 0)

  const snaps = [...info.balances].sort((a, b) => a.date.localeCompare(b.date))
  const before = snaps.filter((s) => s.date <= date).at(-1)
  if (before) return before.kop + sumOps(before.date, date)
  const after = snaps.find((s) => s.date > date)
  if (after) return after.kop - sumOps(date, after.date)
  if (ops.length > 0) return sumOps('', date)
  return null
}

// До какой даты известно о счетах этого вида: конец выписки или дата введённого остатка.
export function coverage(money: MoneyData, kind: BalanceKind): string | null {
  let latest = ''
  for (const info of Object.values(money.accounts)) {
    if (info.kind !== kind) continue
    if (info.periodEnd && info.periodEnd > latest) latest = info.periodEnd
    for (const s of info.balances) if (s.date > latest) latest = s.date
  }
  const manual = money.manualBalances[kind]
  if (manual && manual.date > latest) latest = manual.date
  return latest || null
}

export interface KindBalance {
  kop: number
  asOf: string // по какую дату известно
  manual: boolean // введено вручную (а не из выписки)
}

// Остаток на счетах этого вида на конец дня date. Введённый вручную остаток главнее
// выписки, если он новее; операции после него (из следующих выписок) прибавляются.
export function balanceOf(money: MoneyData, kind: BalanceKind, date: string): KindBalance | null {
  const numbers = Object.entries(money.accounts)
    .filter(([, info]) => info.kind === kind)
    .map(([number]) => number)

  let kop = 0
  let known = false
  let statementLatest = ''
  for (const number of numbers) {
    const b = accountBalanceAt(money, number, date)
    if (b !== null) {
      kop += b
      known = true
    }
    const info = money.accounts[number]
    if (info.periodEnd && info.periodEnd > statementLatest) statementLatest = info.periodEnd
    for (const s of info.balances) if (s.date > statementLatest) statementLatest = s.date
  }

  const manual = money.manualBalances[kind]
  if (manual && (!known || (manual.date >= statementLatest && manual.date <= date))) {
    const later = money.transactions
      .filter((t) => kindOf(t, money) === kind && t.date > manual.date && t.date <= date)
      .reduce((s, t) => s + t.amount, 0)
    return { kop: manual.kop + later, asOf: manual.date > date ? date : manual.date, manual: true }
  }
  if (!known) return null
  return { kop, asOf: statementLatest && statementLatest < date ? statementLatest : date, manual: false }
}

// «Можно потратить» = остаток «Жизнь» + карта.
export function spendable(money: MoneyData, today: string) {
  const life = balanceOf(money, 'life', today)
  const card = balanceOf(money, 'card', today)
  if (!life && !card) return null
  return { rub: ((life?.kop ?? 0) + (card?.kop ?? 0)) / 100, life, card }
}

// ---------- Аналитика месяца ----------

export interface MonthAnalytics {
  income: number // доход за смены месяца, ₽
  shifts: number // сколько смен с доходом
  lifePlanned: number // доля «Жизнь» от дохода, ₽
  lifeSpent: number // траты с карты, кроме «Одежды и ухода», ₽
  clothesPlanned: number
  clothesSpent: number // траты категории «Одежда и уход», ₽
  from: string | null // месяц старта: доход и траты считаются с этой даты (null — весь месяц)
}

export function monthAnalytics(money: MoneyData, prefix: string): MonthAnalytics {
  // В месяце старта и доход, и траты — с даты старта, чтобы сравнивать одно и то же время.
  const from = monthStart(money, prefix)
  const incomes = shiftIncomes(money).filter((i) => i.shiftDate.startsWith(prefix) && i.shiftDate >= (from ?? ''))
  const income = incomes.reduce((s, i) => s + i.amountKop, 0) / 100
  const spending = monthSpendingByCategory(money, prefix)
  const clothesSpent = spending[CATEGORY_CLOTHES] ?? 0
  const lifeSpent = Object.entries(spending)
    .filter(([category]) => category !== CATEGORY_CLOTHES)
    .reduce((s, [, v]) => s + v, 0)
  const { split } = money.settings
  return {
    income,
    shifts: incomes.length,
    lifePlanned: (income * split.life) / 100,
    lifeSpent,
    clothesPlanned: (income * split.clothes) / 100,
    clothesSpent,
    from,
  }
}

// ---------- Смены и деньги ----------

// Сколько с одной смены уходит на Турцию (по плановой цене смены), ₽.
export function turkeyPerShift(settings: MoneySettings): number {
  return (settings.shiftPay * settings.split.turkey) / 100
}

// «До цели N смен» = остаток цели / (процент Турции × цена смены).
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

// Средний доход за смену по факту (доход / отработанные смены).
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

// Добавляет операции из выписки. Уже загруженную операцию (тот же ключ)
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

// ---------- «Данные по …» ----------

// По какую дату есть данные по карте: конец периода последней выписки карты
// или дата последней операции. null — данных нет.
export function dataUntil(money: MoneyData): string | null {
  let latest = ''
  for (const info of Object.values(money.accounts)) {
    if (info.kind === 'card' && info.periodEnd && info.periodEnd > latest) latest = info.periodEnd
  }
  for (const t of cardTransactions(money)) if (t.date > latest) latest = t.date
  return latest || null
}

// Последний месяц, в котором есть операции по карте или доход за смену.
// Его показываем при открытии, чтобы не попадать на пустой месяц.
export function latestDataMonth(money: MoneyData): { year: number; monthIndex: number } | null {
  let latest = ''
  for (const t of cardTransactions(money)) if (t.date > latest) latest = t.date
  for (const date of Object.keys(money.manualIncome)) if (date > latest) latest = date
  if (!latest) return null
  return { year: Number(latest.slice(0, 4)), monthIndex: Number(latest.slice(5, 7)) - 1 }
}
