// Общие типы данных проекта.

// Идентификаторы вкладок. Строковый union-тип: TypeScript не даст
// случайно написать несуществующую вкладку, например 'weak'.
export type TabId = 'today' | 'money' | 'week' | 'shifts' | 'habits'

// ---------- Деньги ----------

// Цель «Турция»: прогресс — рост остатка счёта «Турция» с даты старта.
export interface TurkeyGoal {
  title: string // «Турция»
  amount: number // целевая сумма, ₽
  start: string // 'YYYY-MM-DD' — с этого дня считается прогресс (старт с 0 ₽)
  deadline: string // 'YYYY-MM-DD' — к этому дню деньги должны быть
}

// Распределение каждого дохода по счетам-конвертам, в процентах (в сумме 100).
export interface SalarySplit {
  life: number // счёт «Жизнь»
  turkey: number // счёт «Турция»
  clothes: number // счёт «Одежда и уход»
}

export interface MoneySettings {
  split: SalarySplit
  shiftPay: number // сколько я получаю за смену, ₽ (для плана и прогноза)
  shiftsPerMonth: number // сколько смен в месяц по плану (для прогноза, пока мало данных)
  goal: TurkeyGoal
  limits: Record<string, number> // лимиты трат по категориям: { 'Кафе': 2000, ... }
  customCategories: string[] // свои категории, добавленные вручную
}

// Операция из выписки (любого учитываемого счёта: карты или конверта).
export interface Transaction {
  // 'номер счёта|номер документа|ГГГГ-ММ-ДД ЧЧ:ММ:СС' — защита от дублей.
  // Номер счёта нужен: перевод между своими счетами есть в обеих выписках
  // с тем же документом и временем. У старых операций (без account) — без счёта.
  id: string
  account?: string // номер лицевого счёта (20 цифр); нет — старая операция карты
  date: string // 'YYYY-MM-DD'
  time: string // 'HH:MM:SS'
  doc: string // номер документа
  purpose: string // назначение платежа
  amount: number // в КОПЕЙКАХ со знаком: +123456 = +1 234.56 ₽ (целые числа — без ошибок округления)
}

// Какой это счёт. Конверты — настоящие накопительные счета.
//   card    — основной счёт с картой: с него траты, на него приходит доход
//   life / turkey / clothes — счета «Жизнь», «Турция», «Одежда и уход»
//   other   — другой счёт, не учитываем (переводы с него и так видны на карте)
export type AccountKind = 'card' | 'life' | 'turkey' | 'clothes' | 'other'

// Счета, у которых считаем остаток (всё, кроме «другого»).
export type BalanceKind = Exclude<AccountKind, 'other'>

// Конверты: на какие счета делится каждый доход.
export type EnvelopeKind = 'life' | 'turkey' | 'clothes'

// Остаток на счёте на КОНЕЦ дня date, в копейках.
export interface BalanceSnapshot {
  date: string // 'YYYY-MM-DD'
  kop: number
}

export interface AccountInfo {
  kind: AccountKind
  periodStart?: string // 'YYYY-MM-DD' — с какой даты есть выписки этого счёта
  periodEnd?: string // 'YYYY-MM-DD' — по какую дату есть выписки
  // Остатки из выписок: «Входящий остаток» (на конец дня перед периодом) и «Исходящий».
  balances: BalanceSnapshot[]
}

// Отметки «Перевёл» для дохода смены: какие доли уже переведены на свои счета.
export type TransferMarks = Partial<Record<EnvelopeKind, boolean>>

export interface MoneyData {
  settings: MoneySettings
  transactions: Transaction[]
  // Запомненные правила «магазин → категория». Ключ — назначение платежа без цифр.
  rules: Record<string, string>
  // Запомненные счета: номер лицевого счёта → какой это счёт и что известно из выписок.
  accounts: Record<string, AccountInfo>
  // «Получил за смену» вручную: дата смены → сумма, ₽. Выписка карты потом сверяет.
  manualIncome: Record<string, number>
  // Галочки «Перевёл»: дата смены → какие доли её дохода переведены.
  transfers: Record<string, TransferMarks>
  // Остатки, введённые вручную (когда выписки нет или она старая).
  manualBalances: Partial<Record<BalanceKind, BalanceSnapshot>>
}

// Тип выписки, определённый по её содержимому: карта или накопительный счёт.
// Это только подсказка — какой именно это счёт, выбираю я, и сайт запоминает.
export type StatementKind = 'card' | 'savings'

// ---------- Смены ----------

// Статус дня: смена, «не вышел» (смена была, но я не пошёл), отгул, выходной.
export type DayStatus = 'shift' | 'missed' | 'leave' | 'off'

// Время смены в формате 'HH:MM'.
// Если end меньше или равно start — смена заканчивается на следующий день (22:00–10:00).
export interface ShiftTime {
  start: string
  end: string
}

// Отмеченный день. Это «объединение» (union) двух вариантов:
// у смены и «не вышел» есть время, у отгула и выходного — нет.
// TypeScript по полю status сам понимает, есть ли у записи time.
export type DayEntry =
  | { status: 'shift' | 'missed'; time: ShiftTime }
  | { status: 'leave' | 'off' }

// ---------- Неделя ----------

// Одна задача дня.
export interface Task {
  id: string
  text: string
  done: boolean // выполнена или нет
}

// Всё, что хранится для вкладки «Неделя»: задачи по датам.
// Привязка к дате (а не к «понедельнику вообще») — у каждой недели свои задачи.
export interface WeekData {
  tasks: Record<string, Task[]> // { '2026-10-05': [{ id, text, done }, ...], ... }
  // Итоги недель: понедельник недели → два поля «Что получилось» / «Что мешало».
  reviews: Record<string, WeekReview>
}

export interface WeekReview {
  good: string // что получилось
  bad: string // что мешало
}

// ---------- Привычки ----------

export interface Habit {
  id: string
  name: string
  archived: boolean // в архиве — не показывается на «Сегодня» и в списке, отметки сохраняются
}

// Всё, что хранится для привычек. Автопривычка «Смены без пропусков» не хранится —
// она считается из «Смен».
export interface HabitsData {
  habits: Habit[]
  marks: Record<string, string[]> // id привычки → отмеченные даты 'YYYY-MM-DD'
}

// ---------- Смены (продолжение) ----------

// Всё, что хранится для вкладки «Смены»: отмеченные дни.
// Неотмеченный день = смены нет.
export interface ShiftsData {
  days: Record<string, DayEntry> // { '2026-10-05': { status: 'shift', time: {...} }, ... }
}
