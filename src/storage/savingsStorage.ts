// Хранение данных вкладки «Копилка».
import type { SavingsData } from '../types'
import { readJson, writeJson } from './localStore'

// Ключ в localStorage. Префикс planner. — чтобы не путаться с чужими данными.
const KEY = 'planner.savings'

// Данные по умолчанию — при самом первом запуске.
export const DEFAULT_SAVINGS: SavingsData = {
  goal: { title: 'Турция', targetAmount: 200000, targetMonth: '2027-08' },
  deposits: [],
}

export function loadSavings(): SavingsData {
  // Partial — потому что в хранилище могут оказаться неполные данные.
  const stored = readJson<Partial<SavingsData>>(KEY, {})
  return {
    // Недостающие поля цели берём из значений по умолчанию.
    goal: { ...DEFAULT_SAVINGS.goal, ...stored.goal },
    deposits: Array.isArray(stored.deposits) ? stored.deposits : [],
  }
}

export function saveSavings(data: SavingsData): void {
  writeJson(KEY, data)
}
