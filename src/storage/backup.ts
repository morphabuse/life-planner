// Бэкап всех данных приложения: сборка JSON-файла, проверка и восстановление.
// Здесь нет React и нет работы с файлами — только данные.
// Скачивание и выбор файла делает компонент BackupControls.
import type { HabitsData, MoneyData, ShiftsData, WeekData } from '../types'
import { todayIso } from '../utils/date'
import { loadMoney, normalizeMoney, saveMoney } from './moneyStorage'
import { loadShifts, saveShifts } from './shiftsStorage'
import { loadWeek, saveWeek } from './weekStorage'
import { loadHabits, saveHabits } from './habitsStorage'
import { migrateLegacyShifts } from './shiftsMigration'
import {
  isHabitsData,
  isLegacyShiftsData,
  isObject,
  isShiftsData,
  isTransaction,
  isWeekData,
  toDayEntry,
} from './validators'

// Метка «это бэкап именно нашего приложения».
const APP_ID = 'life-planner'

// Версия формата.
// v1 — только копилка.
// v2 — копилка + смены в старом формате (дата первой смены + правки).
// v3 — копилка + смены в новом формате (отмеченные дни со временем).
// v4 — копилка + смены + задачи недели.
// v5 — + деньги (настройки, операции из выписок, правила категорий).
// v6 — + запомненные счета выписок (тип, период, остаток); в копилке бывают снятия (минус).
// v7 — + привычки (список и отметки).
// v8 — + итоги недель («Что получилось» / «Что мешало») в данных недели.
// v9 — копилки больше нет: деньги со счетами-конвертами (Жизнь, Турция, Одежда и уход),
//      доходами за смены, отметками «Перевёл», введёнными остатками; цель — в настройках денег.
const BACKUP_VERSION = 9

// Бэкап после чтения и проверки.
export interface BackupFile {
  app: typeof APP_ID
  version: number // версия файла, из которого прочитано (1–9)
  exportedAt: string // момент создания, ISO-строка: '2026-10-04T19:30:00.000Z'
  // Части, которых не было в старых версиях. Если поля нет (undefined),
  // при восстановлении текущие данные этой части не трогаем.
  money?: MoneyData // нет в v1–v4
  shifts?: ShiftsData // нет в v1
  week?: WeekData // нет в v1–v3
  habits?: HabitsData // нет в v1–v6
}

// Собирает бэкап из всех данных в хранилище.
export function createBackup(): BackupFile {
  return {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    money: loadMoney(),
    shifts: loadShifts(),
    week: loadWeek(),
    habits: loadHabits(),
  }
}

// Имя файла с сегодняшней датой: planner-backup-2026-10-04.json
export function backupFileName(): string {
  return `planner-backup-${todayIso()}.json`
}

// Записывает данные из бэкапа в хранилище (текущие данные заменяются).
export function applyBackup(backup: BackupFile): void {
  if (backup.money) saveMoney(backup.money)
  if (backup.shifts) saveShifts(backup.shifts)
  if (backup.week) saveWeek(backup.week)
  if (backup.habits) saveHabits(backup.habits)
}

// Текст для вопроса перед загрузкой: что именно заменится.
export function describeBackup(backup: BackupFile): string {
  const replaced = 'Текущие данные будут заменены, отменить это нельзя.'
  // Чего нет в старых версиях — то останется как есть.
  const missing: string[] = []
  if (!backup.money || backup.version < 5) missing.push('выписок и настроек денег')
  if (!backup.shifts) missing.push('смен')
  if (!backup.week) missing.push('задач недели')
  if (!backup.habits) missing.push('привычек')
  let text = ''
  if (backup.version < 9) {
    text +=
      'Это бэкап старого формата: записи копилки из него не переносятся (её заменил счёт «Турция»), ' +
      'берётся только сумма цели. '
  }
  if (backup.version === 2) text += 'График 2/2 из него станет отмеченными сменами на год вперёд. '
  // Время смен в старых бэкапах было — при загрузке оно просто отбрасывается.
  if (missing.length > 0) text += `В нём нет ${missing.join(', ')} — они останутся как есть. `
  if (backup.version < 8 && backup.week) text += 'Итоги недель тоже останутся как есть. '
  return text + (backup.version === 1 ? 'Ничего, кроме цели, не изменится.' : replaced)
}

// Читает текст файла и проверяет, что это правильный бэкап.
// Если что-то не так — бросает Error с понятным текстом для пользователя.
export function parseBackup(text: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Файл не похож на JSON — возможно, выбран не тот файл.')
  }

  if (!isObject(parsed) || parsed.app !== APP_ID) {
    throw new Error('Это не бэкап планировщика.')
  }
  const version = parsed.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > BACKUP_VERSION) {
    throw new Error(`Неподдерживаемая версия бэкапа: ${String(version)}.`)
  }
  if (typeof parsed.exportedAt !== 'string') {
    throw new Error('В бэкапе нет даты создания.')
  }

  // Копилка была в v1–v8. Из неё берём только цель (сумму и название).
  let legacyGoal: Record<string, unknown> | undefined
  if (version < 9) {
    if (!isObject(parsed.savings)) throw new Error('В бэкапе нет данных копилки.')
    if (isObject(parsed.savings.goal)) legacyGoal = parsed.savings.goal
  }

  // Деньги — с v5. Операции проверяем строго, остальное собирается с заменой испорченного.
  let money: MoneyData | undefined
  if (version >= 5) {
    const raw = parsed.money
    if (!isObject(raw) || !Array.isArray(raw.transactions) || !raw.transactions.every(isTransaction)) {
      throw new Error('Данные денег (выписки, настройки) в бэкапе повреждены.')
    }
    money = normalizeMoney(raw, legacyGoal)
    // Счетов нет в v5 — тогда оставляем запомненные сейчас.
    if (version === 5 && !isObject(raw.accounts)) money = { ...money, accounts: loadMoney().accounts }
  } else if (legacyGoal) {
    // В v1–v4 денег нет: переносим только цель в текущие настройки.
    const current = loadMoney()
    const goal = normalizeMoney({}, legacyGoal).settings.goal
    money = { ...current, settings: { ...current.settings, goal: { ...current.settings.goal, amount: goal.amount, title: goal.title } } }
  }

  // Смены: в v1 их нет, в v2 — старый формат (переводим в новый), с v3 — новый.
  let shifts: ShiftsData | undefined
  if (version === 2) {
    if (!isLegacyShiftsData(parsed.shifts)) {
      throw new Error('Данные смен в бэкапе повреждены.')
    }
    shifts = migrateLegacyShifts(parsed.shifts, todayIso())
  } else if (version >= 3) {
    if (!isShiftsData(parsed.shifts)) {
      throw new Error('Данные смен в бэкапе повреждены.')
    }
    // Время смены из старых бэкапов (v3–v9) отбрасываем — его больше нет.
    shifts = {
      days: Object.fromEntries(Object.entries(parsed.shifts.days).map(([date, entry]) => [date, toDayEntry(entry)])),
    }
  }

  // Задачи недели — с v4.
  let week: WeekData | undefined
  if (version >= 4) {
    if (!isWeekData(parsed.week)) {
      throw new Error('Задачи или итоги недели в бэкапе повреждены.')
    }
    // Итогов недель нет до v8 — тогда оставляем сохранённые сейчас, чтобы не потерять.
    const reviews = version >= 8 && isObject(parsed.week.reviews) ? parsed.week.reviews : loadWeek().reviews
    week = { tasks: parsed.week.tasks, reviews: reviews as WeekData['reviews'] }
  }

  // Привычки — с v7.
  let habits: HabitsData | undefined
  if (version >= 7) {
    if (!isHabitsData(parsed.habits)) {
      throw new Error('Привычки в бэкапе повреждены.')
    }
    habits = { habits: parsed.habits.habits, marks: parsed.habits.marks }
  }

  // Собираем объект заново только из известных полей — лишнее отбрасываем.
  return { app: APP_ID, version, exportedAt: parsed.exportedAt, money, shifts, week, habits }
}
