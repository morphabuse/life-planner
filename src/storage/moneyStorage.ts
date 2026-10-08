// Хранение данных «Денег»: настройки, операции из выписок, правила категорий, счета,
// доходы за смены, отметки «Перевёл», сверенные остатки.
import type {
  AccountInfo,
  BalanceKind,
  BalanceSnapshot,
  MoneyData,
  MoneySettings,
  ReconcileName,
  Reconciled,
  TransferMarks,
  TurkeyGoal,
} from '../types'
import { readJson, removeKey, writeJson } from './localStore'
import { removeLegacySavingsInterest, repairMoneyData } from './moneyMigration'
import {
  isIsoDate,
  isLimits,
  isObject,
  isPositiveNumber,
  isSalarySplit,
  isTransaction,
} from './validators'

const KEY = 'planner.money'
// Старая копилка (до настоящих счетов-конвертов). Из неё берём только цель.
const LEGACY_SAVINGS_KEY = 'planner.savings'

export const DEFAULT_GOAL: TurkeyGoal = {
  title: 'Турция',
  amount: 200000,
  start: '2026-10-05',
  deadline: '2027-07-31',
}

export const DEFAULT_MONEY_SETTINGS: MoneySettings = {
  split: { life: 50, turkey: 40, clothes: 10 },
  shiftPay: 5000,
  shiftsPerMonth: 15,
  goal: DEFAULT_GOAL,
  limits: { Кафе: 2000, Такси: 1000, Игры: 1500 },
  customCategories: [],
  // Как счета называются в приложении Ozon Банка (меняется в настройках).
  reconcileNames: [
    { name: 'Одежда, уход за собой', kind: 'clothes' },
    { name: 'свободные деньги', kind: 'life' },
    { name: 'Турция', kind: 'turkey' },
    { name: 'Основной счёт', kind: 'card' },
  ],
}

export function emptyMoney(): MoneyData {
  return {
    settings: DEFAULT_MONEY_SETTINGS,
    transactions: [],
    rules: {},
    accounts: {},
    manualIncome: {},
    transfers: {},
    reconciled: {},
  }
}

// Старое название категории одежды — в новой версии «Одежда и уход».
const OLD_CLOTHES = 'Одежда'
const NEW_CLOTHES = 'Одежда и уход'
const renameClothes = (c: string) => (c === OLD_CLOTHES ? NEW_CLOTHES : c)

function readGoal(value: unknown, legacyAmount?: number, legacyTitle?: string): TurkeyGoal {
  if (!isObject(value)) {
    return {
      ...DEFAULT_GOAL,
      ...(legacyAmount ? { amount: legacyAmount } : {}),
      ...(legacyTitle ? { title: legacyTitle } : {}),
    }
  }
  return {
    title: typeof value.title === 'string' && value.title.trim() ? value.title : DEFAULT_GOAL.title,
    amount: isPositiveNumber(value.amount) ? value.amount : DEFAULT_GOAL.amount,
    start: isIsoDate(value.start) ? value.start : DEFAULT_GOAL.start,
    deadline: isIsoDate(value.deadline) ? value.deadline : DEFAULT_GOAL.deadline,
  }
}

const BALANCE_KINDS = ['card', 'life', 'turkey', 'clothes'] as const
const isBalanceKind = (value: unknown): value is BalanceKind => BALANCE_KINDS.some((k) => k === value)

// 'YYYY-MM-DDTHH:MM' — момент сверки или отметки «Перевёл».
export function isStamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && isIsoDate(value.slice(0, 10))
}

function readReconcileNames(value: unknown): ReconcileName[] {
  if (!Array.isArray(value)) return DEFAULT_MONEY_SETTINGS.reconcileNames
  return value.filter(
    (n): n is ReconcileName => isObject(n) && typeof n.name === 'string' && n.name.trim() !== '' && isBalanceKind(n.kind),
  )
}

function isSnapshot(value: unknown): value is BalanceSnapshot {
  return isObject(value) && isIsoDate(value.date) && Number.isInteger(value.kop)
}

// Счёт: новый формат или старый ({ kind: 'card' | 'savings', balance: { date, amount ₽ } }).
// Старый «накопительный» — это был счёт «Турция».
function readAccount(value: unknown): AccountInfo | null {
  if (!isObject(value)) return null
  const kinds = ['card', 'life', 'turkey', 'clothes', 'other'] as const
  let kind = kinds.find((k) => k === value.kind)
  if (value.kind === 'savings') kind = 'turkey'
  if (!kind) return null
  const balances: BalanceSnapshot[] = Array.isArray(value.balances) ? value.balances.filter(isSnapshot) : []
  const old = value.balance
  if (isObject(old) && isIsoDate(old.date) && typeof old.amount === 'number' && Number.isFinite(old.amount)) {
    balances.push({ date: old.date, kop: Math.round(old.amount * 100) })
  }
  return {
    kind,
    periodStart: isIsoDate(value.periodStart) ? value.periodStart : undefined,
    periodEnd: isIsoDate(value.periodEnd) ? value.periodEnd : undefined,
    balances,
  }
}

// Собирает данные «Денег» из чего угодно (localStorage, бэкап любой версии):
// правильные части берёт, испорченные заменяет значениями по умолчанию,
// старый формат переводит в новый. legacyGoal — цель из старой копилки.
export function normalizeMoney(stored: unknown, legacyGoal?: { title?: unknown; targetAmount?: unknown }): MoneyData {
  const base = emptyMoney()
  if (!isObject(stored)) {
    if (!legacyGoal) return base
    stored = {}
  }
  const raw = stored as Record<string, unknown>
  const s = isObject(raw.settings) ? raw.settings : {}
  // Старый формат — в настройках ещё нет цели.
  const isOld = !isObject(s.goal)

  const legacyAmount = isPositiveNumber(legacyGoal?.targetAmount) ? legacyGoal.targetAmount : undefined
  const legacyTitle = typeof legacyGoal?.title === 'string' ? legacyGoal.title : undefined

  let limits = isLimits(s.limits) ? s.limits : DEFAULT_MONEY_SETTINGS.limits
  let customCategories = Array.isArray(s.customCategories)
    ? s.customCategories.filter((c): c is string => typeof c === 'string' && c.trim() !== '')
    : []
  const rules: Record<string, string> = {}
  if (isObject(raw.rules)) {
    for (const [key, category] of Object.entries(raw.rules)) {
      if (typeof category === 'string' && category !== '') rules[key] = isOld ? renameClothes(category) : category
    }
  }
  if (isOld) {
    limits = Object.fromEntries(Object.entries(limits).map(([c, v]) => [renameClothes(c), v]))
    customCategories = [...new Set(customCategories.map(renameClothes))].filter((c) => c !== NEW_CLOTHES)
  }

  const settings: MoneySettings = {
    split: isSalarySplit(s.split) ? s.split : DEFAULT_MONEY_SETTINGS.split,
    shiftPay: isPositiveNumber(s.shiftPay) ? s.shiftPay : DEFAULT_MONEY_SETTINGS.shiftPay,
    shiftsPerMonth: isPositiveNumber(s.shiftsPerMonth) ? s.shiftsPerMonth : DEFAULT_MONEY_SETTINGS.shiftsPerMonth,
    goal: readGoal(s.goal, legacyAmount, legacyTitle),
    limits,
    customCategories,
    reconcileNames: readReconcileNames(s.reconcileNames),
  }

  const accounts: Record<string, AccountInfo> = {}
  if (isObject(raw.accounts)) {
    for (const [number, info] of Object.entries(raw.accounts)) {
      const account = readAccount(info)
      if (account) accounts[number] = account
    }
  }

  const manualIncome: Record<string, number> = {}
  if (isObject(raw.manualIncome)) {
    for (const [date, amount] of Object.entries(raw.manualIncome)) {
      if (isIsoDate(date) && isPositiveNumber(amount)) manualIncome[date] = amount
    }
  }

  const transfers: Record<string, TransferMarks> = {}
  if (isObject(raw.transfers)) {
    for (const [date, marks] of Object.entries(raw.transfers)) {
      if (!isIsoDate(date) || !isObject(marks)) continue
      const clean: TransferMarks = {}
      // Отметка — время, когда отметил, или true у старых отметок без времени.
      for (const kind of ['life', 'turkey', 'clothes'] as const) {
        const mark = marks[kind]
        if (mark === true || isStamp(mark)) clean[kind] = mark
      }
      transfers[date] = clean
    }
  }

  // Сверенные остатки. Старые «введённые вручную остатки» (manualBalances, только дата)
  // переносим сюда со временем 23:59: раньше считалось, что операции этого дня уже в остатке.
  const reconciled: Partial<Record<BalanceKind, Reconciled>> = {}
  if (isObject(raw.manualBalances)) {
    for (const kind of BALANCE_KINDS) {
      const value = raw.manualBalances[kind]
      if (isSnapshot(value)) reconciled[kind] = { at: `${value.date}T23:59`, kop: value.kop }
    }
  }
  if (isObject(raw.reconciled)) {
    for (const kind of BALANCE_KINDS) {
      const value = raw.reconciled[kind]
      if (isObject(value) && isStamp(value.at) && Number.isInteger(value.kop)) reconciled[kind] = { at: value.at, kop: value.kop as number }
    }
  }

  return {
    settings,
    transactions: Array.isArray(raw.transactions) ? raw.transactions.filter(isTransaction) : [],
    rules,
    accounts,
    manualIncome,
    transfers,
    reconciled,
  }
}

export function loadMoney(): MoneyData {
  const stored = readJson<unknown>(KEY, null)
  // Старая копилка: цель переносим в настройки «Денег», саму копилку убираем
  // (её записи заменены настоящим счётом «Турция»).
  const legacy = readJson<unknown>(LEGACY_SAVINGS_KEY, null)
  const legacyGoal = isObject(legacy) && isObject(legacy.goal) ? legacy.goal : undefined

  let data = normalizeMoney(stored, legacyGoal)
  let changed =
    legacy !== null ||
    (isObject(stored) && !isObject(isObject(stored.settings) ? stored.settings.goal : null)) ||
    (isObject(stored) && 'manualBalances' in stored) // старые введённые остатки → сверка

  // Старые операции чиним (подробности — в moneyMigration.ts):
  //   1) операции, загруженные старой версией разбора выписок;
  //   2) проценты накопительного, попавшие в операции карты.
  const repaired = repairMoneyData(data.transactions, data.rules)
  if (repaired) {
    data = { ...data, ...repaired }
    changed = true
  }
  const withoutInterest = removeLegacySavingsInterest(data.transactions, data.accounts)
  if (withoutInterest) {
    data = { ...data, ...withoutInterest }
    changed = true
  }
  // Сохраняем сразу — так миграция происходит один раз.
  if (changed && (isObject(stored) || legacy !== null)) {
    saveMoney(data)
    removeKey(LEGACY_SAVINGS_KEY)
  }
  return data
}

export function saveMoney(data: MoneyData): void {
  writeJson(KEY, data)
}
