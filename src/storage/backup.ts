// Бэкап всех данных приложения: сборка JSON-файла, проверка и восстановление.
// Здесь нет React и нет работы с файлами — только данные.
// Скачивание и выбор файла делает компонент BackupControls.
import type { HabitsData, MoneyData, SavingsData, ShiftsData, WeekData } from '../types'
import { todayIso } from '../utils/date'
import { loadSavings, saveSavings } from './savingsStorage'
import { loadMoney, saveMoney } from './moneyStorage'
import { loadShifts, saveShifts } from './shiftsStorage'
import { loadWeek, saveWeek } from './weekStorage'
import { loadHabits, saveHabits } from './habitsStorage'
import { migrateLegacyShifts } from './shiftsMigration'
import {
  isAccounts,
  isDeposit,
  isHabitsData,
  isLegacyShiftsData,
  isMoneyData,
  isObject,
  isSavingsGoal,
  isShiftsData,
  isWeekData,
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
const BACKUP_VERSION = 8

// Бэкап после чтения и проверки.
export interface BackupFile {
  app: typeof APP_ID
  version: number // версия файла, из которого прочитано (1–8)
  exportedAt: string // момент создания, ISO-строка: '2026-10-04T19:30:00.000Z'
  savings: SavingsData
  // Части, которых не было в старых версиях. Если поля нет (undefined),
  // при восстановлении текущие данные этой части не трогаем.
  shifts?: ShiftsData // нет в v1
  week?: WeekData // нет в v1–v3
  money?: MoneyData // нет в v1–v4
  habits?: HabitsData // нет в v1–v6
}

// Собирает бэкап из всех данных в хранилище.
export function createBackup(): BackupFile {
  return {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    savings: loadSavings(),
    shifts: loadShifts(),
    week: loadWeek(),
    money: loadMoney(),
    habits: loadHabits(),
  }
}

// Имя файла с сегодняшней датой: planner-backup-2026-10-04.json
export function backupFileName(): string {
  return `planner-backup-${todayIso()}.json`
}

// Записывает данные из бэкапа в хранилище (текущие данные заменяются).
export function applyBackup(backup: BackupFile): void {
  saveSavings(backup.savings)
  if (backup.shifts) saveShifts(backup.shifts)
  if (backup.week) saveWeek(backup.week)
  if (backup.money) saveMoney(backup.money)
  if (backup.habits) saveHabits(backup.habits)
}

// Текст для вопроса перед загрузкой: что именно заменится.
export function describeBackup(backup: BackupFile): string {
  const replaced = 'Текущие данные будут заменены, отменить это нельзя.'
  // Чего нет в старых версиях — то останется как есть.
  switch (backup.version) {
    case 1:
      return 'Это бэкап старого формата: в нём только копилка. Копилка будет заменена, смены, задачи недели, выписки, настройки денег, привычки и итоги недель останутся как есть.'
    case 2:
      return (
        'Это бэкап старого формата: график 2/2 из него будет превращён в отмеченные смены 22:00–10:00 на год вперёд. ' +
        `Задач недели, выписок, настроек денег и привычек в нём нет (итоги недель тоже останутся как есть) — они останутся как есть. ${replaced}`
      )
    case 3:
      return `В этом бэкапе нет задач недели, выписок, настроек денег, привычек и итогов недель — они останутся как есть. ${replaced}`
    case 4:
      return `В этом бэкапе нет выписок, настроек денег, привычек и итогов недель — они останутся как есть. ${replaced}`
    case 5:
      return `В этом бэкапе нет запомненных счетов выписок, привычек и итогов недель — они останутся как есть. ${replaced}`
    case 6:
      return `В этом бэкапе нет привычек и итогов недель — они останутся как есть. ${replaced}`
    case 7:
      return `В этом бэкапе нет итогов недель — они останутся как есть. ${replaced}`
    default:
      return replaced
  }
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

  // Копилка есть во всех версиях.
  if (!isObject(parsed.savings)) {
    throw new Error('В бэкапе нет данных копилки.')
  }
  if (!isSavingsGoal(parsed.savings.goal)) {
    throw new Error('Цель копилки в бэкапе повреждена.')
  }
  const deposits = parsed.savings.deposits
  if (!Array.isArray(deposits) || !deposits.every(isDeposit)) {
    throw new Error('Список пополнений в бэкапе повреждён.')
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
    shifts = { days: parsed.shifts.days }
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

  // Деньги — с v5.
  let money: MoneyData | undefined
  if (version >= 5) {
    if (!isMoneyData(parsed.money)) {
      throw new Error('Данные денег (выписки, настройки) в бэкапе повреждены.')
    }
    money = {
      settings: parsed.money.settings,
      transactions: parsed.money.transactions,
      rules: parsed.money.rules,
      // Счетов нет в v5 — тогда оставляем запомненные сейчас.
      accounts: isAccounts(parsed.money.accounts) ? parsed.money.accounts : loadMoney().accounts,
    }
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
  return {
    app: APP_ID,
    version,
    exportedAt: parsed.exportedAt,
    savings: { goal: parsed.savings.goal, deposits },
    shifts,
    week,
    money,
    habits,
  }
}
