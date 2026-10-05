// Вкладка «Сегодня» — главное на один экран: смена и сон, задачи, привычки, деньги.
// Данные других вкладок: задачи читаем и меняем (те же, что в «Неделе»),
// смены и деньги только читаем.
import { useEffect, useState } from 'react'
import type { HabitsData, WeekData } from '../../types'
import { loadWeek, saveWeek } from '../../storage/weekStorage'
import { loadShifts } from '../../storage/shiftsStorage'
import { loadMoney } from '../../storage/moneyStorage'
import { loadHabits, saveHabits } from '../../storage/habitsStorage'
import { formatDayLong, todayIso } from '../../utils/date'
import { addTask, toggleTask } from '../week/weekLogic'
import { formatMoney } from '../money/format'
import { turkeyForecast } from '../money/turkeyLogic'
import { ForecastPhrase } from '../money/ForecastPhrase'
import { shiftFocus } from './todayLogic'
import { TodayShiftCard } from './TodayShiftCard'
import { TodayTasksCard } from './TodayTasksCard'
import { TodayHabitsCard } from './TodayHabitsCard'
import { dayStreak, isMarked, shiftStreak, toggleMark } from '../habits/habitsLogic'
import styles from './TodayTab.module.css'

export function TodayTab() {
  const [today] = useState(todayIso)
  const [week, setWeek] = useState<WeekData>(loadWeek)
  const [shifts] = useState(loadShifts)
  const [money] = useState(loadMoney)
  const [habits, setHabits] = useState<HabitsData>(loadHabits)

  useEffect(() => {
    saveWeek(week)
  }, [week])

  useEffect(() => {
    saveHabits(habits)
  }, [habits])

  const title = formatDayLong(today)
  const forecast = turkeyForecast(money, shifts, today)

  return (
    <section className={styles.today}>
      <h2 className={styles.title}>{title[0].toUpperCase() + title.slice(1)}</h2>

      <div className={styles.grid}>
        <div className={styles.column}>
          <TodayShiftCard focus={shiftFocus(today, shifts)} shifts={shifts} />
          <div className={styles.moneyLine}>
            <span className={styles.moneyLabel}>{money.settings.goal.title}:</span> {formatMoney(forecast.progress.saved)} из{' '}
            {formatMoney(forecast.progress.target)}
            <ForecastPhrase forecast={forecast} />
          </div>
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
            onToggle={(id) => setHabits((prev) => toggleMark(prev, id, today))}
          />
        </div>
      </div>
    </section>
  )
}
