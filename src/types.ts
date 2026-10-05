// Общие типы данных проекта.

// Идентификаторы вкладок. Строковый union-тип: TypeScript не даст
// случайно написать несуществующую вкладку, например 'weak'.
export type TabId = 'today' | 'money' | 'week' | 'shifts' | 'habits'

// ---------- Копилка ----------

// Цель накоплений.
export interface SavingsGoal {
  title: string // например «Турция»
  targetAmount: number // целевая сумма в рублях
  targetMonth: string // месяц цели в формате 'YYYY-MM', например '2027-08'
}

// Одна запись копилки: пополнение (amount > 0) или снятие (amount < 0).
export interface Deposit {
  id: string // уникальный id, нужен React для списков и для удаления
  date: string // дата в формате 'YYYY-MM-DD'
  amount: number // сумма в рублях со знаком: +5000 — пополнение, −1500 — снятие
  // Ключ операции из выписки накопительного счёта ('счёт|документ|дата время';
  // у старых записей — 'документ|дата время'), если запись добавлена из выписки.
  // Нужен, чтобы не добавить её дважды.
  importKey?: string
}

// Данные копилки (часть вкладки «Деньги»).
export interface SavingsData {
  goal: SavingsGoal
  deposits: Deposit[]
}

// ---------- Деньги ----------

// Распределение зарплаты по конвертам, в процентах (в сумме 100).
export interface SalarySplit {
  life: number // жизнь
  turkey: number // Турция (копилка)
  clothes: number // одежда
}

export interface MoneySettings {
  split: SalarySplit
  shiftPay: number // сколько я получаю за смену, ₽
  limits: Record<string, number> // лимиты трат внутри конверта «жизнь»: { 'Кафе': 2000, ... }
  customCategories: string[] // свои категории, добавленные вручную
}

// Операция из выписки карты.
export interface Transaction {
  // 'номер счёта|номер документа|ГГГГ-ММ-ДД ЧЧ:ММ:СС' — защита от дублей.
  // Номер счёта нужен: перевод между своими счетами есть в обеих выписках
  // с тем же документом и временем. У старых операций (без account) — без счёта.
  id: string
  account?: string // номер лицевого счёта из шапки выписки (20 цифр)
  date: string // 'YYYY-MM-DD'
  time: string // 'HH:MM:SS'
  doc: string // номер документа
  purpose: string // назначение платежа
  amount: number // в КОПЕЙКАХ со знаком: +123456 = +1 234.56 ₽ (целые числа — без ошибок округления)
}

export interface MoneyData {
  settings: MoneySettings
  transactions: Transaction[]
  // Запомненные правила «магазин → категория». Ключ — назначение платежа без цифр.
  rules: Record<string, string>
  // Запомненные счета: номер лицевого счёта → тип и что о нём известно из выписки.
  // Так при следующей загрузке тип выписки не надо угадывать.
  accounts: Record<string, AccountInfo>
}

// Тип выписки (и счёта): карта (основной счёт) или накопительный (копилка).
export type StatementKind = 'card' | 'savings'

export interface AccountInfo {
  kind: StatementKind
  periodEnd?: string // 'YYYY-MM-DD' — по какую дату загружена последняя выписка
  // «Исходящий остаток» последней выписки накопительного — для сверки с копилкой.
  balance?: { date: string; amount: number } // amount — в рублях
}

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
