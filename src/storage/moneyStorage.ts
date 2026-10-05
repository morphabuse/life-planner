// Хранение данных «Денег»: настройки, операции из выписок, правила категорий.
// (Копилка хранится отдельно — в savingsStorage, ключ planner.savings.)
import type { AccountInfo, MoneyData, MoneySettings, Transaction } from '../types'
import { readJson, writeJson } from './localStore'
import { removeLegacySavingsInterest, repairMoneyData } from './moneyMigration'
import {
  isAccountInfo,
  isLimits,
  isMoneySettings,
  isObject,
  isPositiveNumber,
  isSalarySplit,
  isTransaction,
} from './validators'

const KEY = 'planner.money'

export const DEFAULT_MONEY_SETTINGS: MoneySettings = {
  split: { life: 50, turkey: 40, clothes: 10 },
  shiftPay: 5000,
  limits: { Кафе: 2000, Такси: 1000, Игры: 1500 },
  customCategories: [],
}

export function loadMoney(): MoneyData {
  const stored = readJson<unknown>(KEY, null)
  if (!isObject(stored)) {
    return { settings: DEFAULT_MONEY_SETTINGS, transactions: [], rules: {}, accounts: {} }
  }

  // Настройки: если весь объект правильный — берём его, иначе собираем по частям,
  // заменяя испорченные части значениями по умолчанию.
  let settings = DEFAULT_MONEY_SETTINGS
  if (isMoneySettings(stored.settings)) {
    settings = stored.settings
  } else if (isObject(stored.settings)) {
    const s = stored.settings
    settings = {
      split: isSalarySplit(s.split) ? s.split : DEFAULT_MONEY_SETTINGS.split,
      shiftPay: isPositiveNumber(s.shiftPay) ? s.shiftPay : DEFAULT_MONEY_SETTINGS.shiftPay,
      limits: isLimits(s.limits) ? s.limits : DEFAULT_MONEY_SETTINGS.limits,
      customCategories: Array.isArray(s.customCategories)
        ? s.customCategories.filter((c): c is string => typeof c === 'string' && c.trim() !== '')
        : [],
    }
  }

  const transactions: Transaction[] = Array.isArray(stored.transactions)
    ? stored.transactions.filter(isTransaction)
    : []

  const rules: Record<string, string> = {}
  if (isObject(stored.rules)) {
    for (const [key, category] of Object.entries(stored.rules)) {
      if (typeof category === 'string' && category !== '') rules[key] = category
    }
  }

  const accounts: Record<string, AccountInfo> = {}
  if (isObject(stored.accounts)) {
    for (const [number, info] of Object.entries(stored.accounts)) {
      if (isAccountInfo(info)) accounts[number] = info
    }
  }

  // Старые данные чиним и сразу сохраняем — так починка происходит один раз
  // (подробности — в moneyMigration.ts):
  //   1) операции, загруженные старой версией разбора выписок;
  //   2) проценты накопительного, попавшие в операции карты.
  let data: MoneyData = { settings, transactions, rules, accounts }
  let changed = false
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
  if (changed) saveMoney(data)
  return data
}

export function saveMoney(data: MoneyData): void {
  writeJson(KEY, data)
}
