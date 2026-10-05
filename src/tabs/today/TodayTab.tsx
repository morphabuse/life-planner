// Вкладка «Сегодня» — главное на один экран. Порядок:
//   статус дня → план сна (если смена сегодня/завтра) → прогноз Турции одной фразой
//   и «можно потратить» → напоминания (непереведённые доли дохода) → задачи →
//   привычки и лучшая серия → мини-неделя пн–вс со сменами.
// На компьютере две колонки (слева день и деньги, справа задачи, привычки и неделя) —
// на 1280×800 без прокрутки; на телефоне — одна колонка в этом порядке.
// Своих данных нет: задачи, привычки и отметки «Перевёл» меняем в общих данных,
// смены только читаем.
import { useEffect, useState } from 'react'
import type { EnvelopeKind, HabitsData, MoneyData, WeekData } from '../../types'
import { loadWeek, saveWeek } from '../../storage/weekStorage'
import { loadShifts } from '../../storage/shiftsStorage'
import { loadMoney, saveMoney } from '../../storage/moneyStorage'
import { loadHabits, saveHabits } from '../../storage/habitsStorage'
import { formatDayLong, todayIso } from '../../utils/date'
import { addTask, toggleTask } from '../week/weekLogic'
import { turkeyForecast } from '../money/turkeyLogic'
import { bestStreak, shiftFocus, todayStatus } from './todayLogic'
import { TodayStatusCard } from './TodayStatusCard'
import { TodayMoneyCard } from './TodayMoneyCard'
import { TodayTasksCard } from './TodayTasksCard'
import { TodayHabitsCard } from './TodayHabitsCard'
import { TodayWeekStrip } from './TodayWeekStrip'
import { dayStreak, isMarked, shiftStreak, toggleMark } from '../habits/habitsLogic'
import styles from './TodayTab.module.css'

export function TodayTab() {
  const [today] = useState(todayIso)
  const [week, setWeek] = useState<WeekData>(loadWeek)
  const [shifts] = useState(loadShifts)
  const [money, setMoney] = useState<MoneyData>(loadMoney)
  const [habits, setHabits] = useState<HabitsData>(loadHabits)

  useEffect(() => saveWeek(week), [week])
  useEffect(() => saveHabits(habits), [habits])
  useEffect(() => saveMoney(money), [money])

  // Галочка в напоминании = отметка «Перевёл» (та же, что во вкладке «Деньги»).
  function markTransferred(shiftDate: string, kind: EnvelopeKind) {
    setMoney((prev) => ({
      ...prev,
      transfers: { ...prev.transfers, [shiftDate]: { ...prev.transfers[shiftDate], [kind]: true } },
    }))
  }

  const title = formatDayLong(today)

  return (
    <section className={styles.today}>
      <h2 className={styles.title}>{title[0].toUpperCase() + title.slice(1)}</h2>

      <div className={styles.grid}>
        <div className={styles.column}>
          <TodayStatusCard status={todayStatus(today, shifts)} focus={shiftFocus(today, shifts)} shifts={shifts} />
          <TodayMoneyCard
            money={money}
            forecast={turkeyForecast(money, shifts, today)}
            today={today}
            onTransferred={markTransferred}
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
            best={bestStreak(habits, shifts, today)}
            onToggle={(id) => setHabits((prev) => toggleMark(prev, id, today))}
          />
          <TodayWeekStrip today={today} shifts={shifts} />
        </div>
      </div>
    </section>
  )
}
