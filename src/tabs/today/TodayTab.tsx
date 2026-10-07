// Вкладка «Сегодня» — главное на один экран. Порядок:
//   смена: статус дня, «X / Y смен за неделю» и мини-неделя → прогноз Турции одной фразой,
//   «можно потратить» и «Получил за смену» → напоминания (непереведённые доли дохода) →
//   задачи → привычки и лучшая серия.
// На компьютере две колонки (слева смена и деньги, справа задачи и привычки) —
// на 1280×800 без прокрутки; на телефоне — одна колонка в этом порядке.
// Своих данных нет: задачи, привычки, доход и отметки «Перевёл» меняем в общих данных
// через логику других вкладок. Смены только читаем — кроме одного случая: ввёл доход
// за неотмеченный день — он отмечается «Смена» (как во вкладке «Деньги»).
import { useEffect, useState } from 'react'
import type { EnvelopeKind, HabitsData, MoneyData, ShiftsData, WeekData } from '../../types'
import { loadWeek, saveWeek } from '../../storage/weekStorage'
import { loadShifts, saveShifts } from '../../storage/shiftsStorage'
import { loadMoney, saveMoney } from '../../storage/moneyStorage'
import { loadHabits, saveHabits } from '../../storage/habitsStorage'
import { formatDayLong, todayIso } from '../../utils/date'
import { addTask, toggleTask } from '../week/weekLogic'
import { turkeyForecast } from '../money/turkeyLogic'
import { addManualIncome, defaultIncomeShiftDate, markShiftsByIncome, toggleTransfer } from '../money/moneyLogic'
import { bestStreak, shiftFocus, todayStatus, weekShiftStats } from './todayLogic'
import { TodayStatusCard } from './TodayStatusCard'
import { TodayMoneyCard } from './TodayMoneyCard'
import { TodayTasksCard } from './TodayTasksCard'
import { TodayHabitsCard } from './TodayHabitsCard'
import { dayStreak, isMarked, shiftStreak, toggleMark } from '../habits/habitsLogic'
import styles from './TodayTab.module.css'

export function TodayTab() {
  const [today] = useState(todayIso)
  const [week, setWeek] = useState<WeekData>(loadWeek)
  const [shifts, setShifts] = useState<ShiftsData>(loadShifts)
  const [money, setMoney] = useState<MoneyData>(loadMoney)
  const [habits, setHabits] = useState<HabitsData>(loadHabits)

  useEffect(() => saveWeek(week), [week])
  useEffect(() => saveHabits(habits), [habits])
  useEffect(() => saveMoney(money), [money])
  useEffect(() => saveShifts(shifts), [shifts])

  // «Получил за смену» — та же логика, что во вкладке «Деньги» (moneyLogic.ts).
  function addIncome(shiftDate: string, rub: number) {
    setMoney((prev) => addManualIncome(prev, shiftDate, rub))
    setShifts((prev) => markShiftsByIncome(prev, [shiftDate]).shifts)
  }

  // Галочка «Перевёл» — та же отметка, что во вкладке «Деньги».
  function handleToggleTransfer(shiftDate: string, kind: EnvelopeKind) {
    setMoney((prev) => toggleTransfer(prev, shiftDate, kind))
  }

  const title = formatDayLong(today)

  return (
    <section className={styles.today}>
      <h2 className={styles.title}>{title[0].toUpperCase() + title.slice(1)}</h2>

      <div className={styles.grid}>
        <div className={styles.column}>
          <TodayStatusCard
            status={todayStatus(today, shifts)}
            focus={shiftFocus(today, shifts)}
            week={weekShiftStats(today, shifts)}
            today={today}
            shifts={shifts}
          />
          <TodayMoneyCard
            money={money}
            forecast={turkeyForecast(money, shifts, today)}
            today={today}
            incomeDate={defaultIncomeShiftDate(money, shifts, today)}
            onAddIncome={addIncome}
            onToggleTransfer={handleToggleTransfer}
          />
        </div>

        <div className={styles.column}>
          <TodayTasksCard
            tasks={week.tasks[today] ?? []}
            onAdd={(text) =>
              setWeek((prev) => addTask(prev, today, { id: crypto.randomUUID(), text, done: false }))
            }
            onToggle={(id) => setWeek((prev) => toggleTask(prev, today, id))}
          />
          <TodayHabitsCard
            habits={habits.habits.filter((h) => !h.archived)}
            isDoneToday={(id) => isMarked(habits, id, today)}
            streakOf={(id) => dayStreak(habits.marks[id] ?? [], today)}
            shiftStreak={shiftStreak(shifts, today)}
            shifts={shifts}
            today={today}
            best={bestStreak(habits, shifts, today)}
            onToggle={(id) => setHabits((prev) => toggleMark(prev, id, today))}
          />
        </div>
      </div>
    </section>
  )
}
