// Хранение данных «Денег»: настройки, операции из выписок, правила категорий, счета,
// доходы за смены, отметки «Перевёл», введённые остатки.
import type {
  AccountInfo,
  BalanceKind,
  BalanceSnapshot,
  MoneyData,
  MoneySettings,
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
}

export function emptyMoney(): MoneyData {
  return {
    settings: DEFAULT_MONEY_SETTINGS,
    transactions: [],
    rules: {},
    accounts: {},
    manualIncome: {},
    transfers: {},
    manualBalances: {},
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
      for (const kind of ['life', 'turkey', 'clothes'] as const) if (marks[kind] === true) clean[kind] = true
      transfers[date] = clean
    }
  }

  const manualBalances: Partial<Record<BalanceKind, BalanceSnapshot>> = {}
  if (isObject(raw.manualBalances)) {
    for (const kind of ['card', 'life', 'turkey', 'clothes'] as const) {
      const value = raw.manualBalances[kind]
      if (isSnapshot(value)) manualBalances[kind] = value
    }
  }

  return {
    settings,
    transactions: Array.isArray(raw.transactions) ? raw.transactions.filter(isTransaction) : [],
    rules,
    accounts,
    manualIncome,
    transfers,
    manualBalances,
  }
}

export function loadMoney(): MoneyData {
  const stored = readJson<unknown>(KEY, null)
  // Старая копилка: цель переносим в настройки «Денег», саму копилку убираем
  // (её записи заменены настоящим счётом «Турция»).
  const legacy = readJson<unknown>(LEGACY_SAVINGS_KEY, null)
  const legacyGoal = isObject(legacy) && isObject(legacy.goal) ? legacy.goal : undefined

  let data = normalizeMoney(stored, legacyGoal)
  let changed = legacy !== null || (isObject(stored) && !isObject(isObject(stored.settings) ? stored.settings.goal : null))

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
