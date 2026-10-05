// Вкладка «Неделя»: 7 дней с понедельника, задачи на каждый день,
// подсветка дней со сменой (данные смен только читаем).
import { useEffect, useState } from 'react'
import type { WeekData } from '../../types'
import { loadWeek, saveWeek } from '../../storage/weekStorage'
import { loadShifts } from '../../storage/shiftsStorage'
import { loadMoney } from '../../storage/moneyStorage'
import { loadHabits } from '../../storage/habitsStorage'
import { addDays, formatDateRange, todayIso, weekdayMondayFirst } from '../../utils/date'
import { getEntry } from '../shifts/schedule'
import { addTask, deleteTask, setReview, toggleTask, weekDates, weekStartOf } from './weekLogic'
import { weekSummary } from './weekSummary'
import { WeekReviewCard } from './WeekReviewCard'
import { DayCard } from './DayCard'
import { ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react'
import { Button } from '../../components/ui'
import styles from './WeekTab.module.css'

export function WeekTab() {
  const [data, setData] = useState<WeekData>(loadWeek)
  // Смены только читаем: вкладка пересоздаётся при каждом переключении,
  // поэтому здесь всегда свежие данные из «Смен».
  const [shifts] = useState(loadShifts)
  const [today] = useState(todayIso)
  // Понедельник показанной недели.
  const [monday, setMonday] = useState(() => weekStartOf(today))
  // Для итога недели: деньги и привычки только читаем.
  const [money] = useState(loadMoney)
  const [habits] = useState(loadHabits)
  // Итог недели показываем сам в воскресенье, в остальные дни — по кнопке.
  const [showReview, setShowReview] = useState(() => weekdayMondayFirst(today) === 6)

  useEffect(() => {
    saveWeek(data)
  }, [data])

  const thisMonday = weekStartOf(today)
  const dates = weekDates(monday)

  // Сколько задач выполнено за показанную неделю — для подписи под заголовком.
  const weekTasks = dates.flatMap((d) => data.tasks[d] ?? [])
  const doneCount = weekTasks.filter((t) => t.done).length

  return (
    <section className={styles.week}>
      <div className={styles.nav}>
        <div className={styles.headings}>
          <h2 className={styles.weekTitle}>{formatDateRange(dates[0], dates[6])}</h2>
          <p className={styles.caption}>
            {weekTasks.length > 0
              ? `Выполнено ${doneCount} из ${weekTasks.length}`
              : 'Задач на эту неделю пока нет'}
          </p>
        </div>
        <div className={styles.navButtons}>
          <Button
            size="sm"
            icon={<NotebookPen size={16} />}
            aria-pressed={showReview}
            onClick={() => setShowReview((v) => !v)}
          >
            Итог недели
          </Button>
          <Button
            variant="text"
            size="sm"
            onClick={() => setMonday(thisMonday)}
            disabled={monday === thisMonday}
          >
            Эта неделя
          </Button>
          <Button
            size="sm"
            iconOnly
            icon={<ChevronLeft size={16} />}
            onClick={() => setMonday((m) => addDays(m, -7))}
            aria-label="Предыдущая неделя"
          />
          <Button
            size="sm"
            iconOnly
            icon={<ChevronRight size={16} />}
            onClick={() => setMonday((m) => addDays(m, 7))}
            aria-label="Следующая неделя"
          />
        </div>
      </div>

      {/* Итог следует за выбранной неделей — так можно листать прошлые итоги. */}
      {showReview && (
        <WeekReviewCard
          summary={weekSummary(monday, today, { week: data, shifts, money, habits })}
          review={data.reviews[monday] ?? { good: '', bad: '' }}
          onChange={(review) => setData((prev) => setReview(prev, monday, review))}
          onClose={() => setShowReview(false)}
        />
      )}

      {dates.map((date) => (
        <DayCard
          key={date}
          date={date}
          isToday={date === today}
          shift={getEntry(date, shifts)}
          tasks={data.tasks[date] ?? []}
          onAdd={(text) =>
            setData((prev) => addTask(prev, date, { id: crypto.randomUUID(), text, done: false }))
          }
          onToggle={(id) => setData((prev) => toggleTask(prev, date, id))}
          onDelete={(id) => setData((prev) => deleteTask(prev, date, id))}
        />
      ))}
    </section>
  )
}
