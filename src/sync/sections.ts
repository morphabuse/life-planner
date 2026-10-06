// Разделы данных для облака. В облаке строка пользователя хранит данные в формате бэкапа,
// разложенные по разделам: деньги, смены, неделя, привычки, настройки (настройки денег).
// Здесь — как собрать разделы из данных устройства и как записать разделы из облака обратно.
import type { HabitsData, MoneyData, MoneySettings, ShiftsData, WeekData } from '../types'
import { loadMoney, saveMoney } from '../storage/moneyStorage'
import { loadShifts, saveShifts } from '../storage/shiftsStorage'
import { loadWeek, saveWeek } from '../storage/weekStorage'
import { loadHabits, saveHabits } from '../storage/habitsStorage'
import { APP_ID, BACKUP_VERSION, parseBackupData } from '../storage/backup'
import type { SectionId } from '../storage/syncStorage'

export interface Sections {
  money: Omit<MoneyData, 'settings'>
  shifts: ShiftsData
  week: WeekData
  habits: HabitsData
  settings: MoneySettings
}

// Какие разделы хранятся под ключом localStorage (настройки лежат внутри «Денег»).
export const KEY_SECTIONS: Record<string, SectionId[]> = {
  'planner.money': ['money', 'settings'],
  'planner.shifts': ['shifts'],
  'planner.week': ['week'],
  'planner.habits': ['habits'],
}

// Все разделы с этого устройства — через те же функции загрузки, что у вкладок.
export function readLocalSections(): Sections {
  const { settings, ...money } = loadMoney()
  return { money, settings, shifts: loadShifts(), week: loadWeek(), habits: loadHabits() }
}

// JSON с ключами по алфавиту: база (jsonb) возвращает ключи в своём порядке,
// а отпечаток должен зависеть только от содержимого.
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

// Короткий отпечаток содержимого (хеш cyrb53): одинаковые данные — одинаковый отпечаток.
// Нужен, чтобы понять «раздел меняли с последней синхронизации» без хранения второй копии данных.
export function hashOf(value: unknown): string {
  const text = stableJson(value)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

// Есть ли на устройстве свои данные (настройки и привычки по умолчанию не считаются).
export function hasData(s: Partial<Sections>): boolean {
  const m = s.money
  return Boolean(
    (m &&
      (m.transactions.length > 0 ||
        Object.keys(m.manualIncome).length > 0 ||
        Object.keys(m.accounts).length > 0 ||
        Object.keys(m.manualBalances).length > 0)) ||
      (s.shifts && Object.keys(s.shifts.days).length > 0) ||
      (s.week && (Object.keys(s.week.tasks).length > 0 || Object.keys(s.week.reviews).length > 0)) ||
      (s.habits && Object.values(s.habits.marks).some((dates) => dates.length > 0)),
  )
}

// Короткое описание данных — для вопроса «какие оставить».
export function describe(s: Partial<Sections>): string {
  const parts: string[] = []
  if (s.money) parts.push(`операций: ${s.money.transactions.length}`)
  if (s.money) parts.push(`доходов вручную: ${Object.keys(s.money.manualIncome).length}`)
  if (s.shifts) parts.push(`отмеченных дней: ${Object.keys(s.shifts.days).length}`)
  if (s.week) parts.push(`дней с задачами: ${Object.keys(s.week.tasks).length}`)
  if (s.habits) parts.push(`отметок привычек: ${Object.values(s.habits.marks).reduce((n, d) => n + d.length, 0)}`)
  return parts.join(', ')
}

// Проверяет разделы из облака тем же кодом, что бэкап (parseBackupData), и приводит
// к «нашему» виду. Испорченный раздел — ошибка (ничего не запишем). Возвращает только
// разделы из remote; недостающие для проверки части берутся с устройства.
export function parseRemoteSections(remote: Partial<Record<SectionId, unknown>>): Partial<Sections> {
  const local = readLocalSections()
  const pick = (id: SectionId): unknown => (remote[id] != null ? remote[id] : local[id])
  const money = pick('money')
  const backup = parseBackupData({
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    money: typeof money === 'object' && money !== null ? { ...money, settings: pick('settings') } : money,
    shifts: pick('shifts'),
    week: pick('week'),
    habits: pick('habits'),
  })
  const result: Partial<Sections> = {}
  if (backup.money) {
    const { settings, ...rest } = backup.money
    if (remote.money != null) result.money = rest
    if (remote.settings != null) result.settings = settings
  }
  if (remote.shifts != null) result.shifts = backup.shifts
  if (remote.week != null) result.week = backup.week
  if (remote.habits != null) result.habits = backup.habits
  return result
}

// Записывает на устройство разделы из облака (уже проверенные). Остальные не трогаем.
// Возвращает разделы устройства после записи — для отпечатков.
export function applyRemoteSections(remote: Partial<Sections>): Sections {
  if (remote.money || remote.settings) {
    const current = loadMoney()
    saveMoney({ ...current, ...remote.money, settings: remote.settings ?? current.settings })
  }
  if (remote.shifts) saveShifts(remote.shifts)
  if (remote.week) saveWeek(remote.week)
  if (remote.habits) saveHabits(remote.habits)
  return readLocalSections()
}
