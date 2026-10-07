// Календарь привычки за месяц — в нижней панели (телефон) или окне (компьютер).
// Открывается по нажатию на маленькую сетку за 8 недель. Здесь можно отметить
// прошлые дни (если забыл) и сегодня; будущие дни недоступны. Месяцы листаются стрелками.
import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Sheet } from '../../components/ui'
import { daysInMonth, formatDayShort, formatMonthTitle, makeIso, weekdayMondayFirst } from '../../utils/date'
import styles from './HabitsTab.module.css'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface Props {
  open: boolean
  onClose: () => void
  name: string
  subtitle: string // серия и рекорд
  today: string
  isDone: (date: string) => boolean
  onToggle: (date: string) => void
}

export function HabitMonthSheet({ open, onClose, name, subtitle, today, isDone, onToggle }: Props) {
  // Показанный месяц. При открытии — текущий.
  const [todayYear, todayMonth] = today.split('-').map(Number)
  const [view, setView] = useState({ year: todayYear, monthIndex: todayMonth - 1 })
  const isCurrentMonth = view.year === todayYear && view.monthIndex === todayMonth - 1

  // delta = -1 (назад) или +1 (вперёд). Дальше текущего месяца не листаем — там всё в будущем.
  function shiftMonth(delta: number) {
    setView((v) => {
      const total = v.year * 12 + v.monthIndex + delta
      return { year: Math.floor(total / 12), monthIndex: total % 12 }
    })
  }

  function handleClose() {
    setView({ year: todayYear, monthIndex: todayMonth - 1 }) // в следующий раз — снова текущий месяц
    onClose()
  }

  const emptyBefore = weekdayMondayFirst(makeIso(view.year, view.monthIndex, 1))
  const dates = Array.from({ length: daysInMonth(view.year, view.monthIndex) }, (_, i) =>
    makeIso(view.year, view.monthIndex, i + 1),
  )
  const doneCount = dates.filter((d) => d <= today && isDone(d)).length

  return (
    <Sheet open={open} onClose={handleClose} title={name} subtitle={subtitle}>
      <div className={styles.monthNav}>
        <Button
          size="lg"
          iconOnly
          icon={<ChevronLeft size={18} />}
          aria-label="Предыдущий месяц"
          onClick={() => shiftMonth(-1)}
        />
        <div className={styles.monthHeading}>
          <span className={styles.monthTitle}>{formatMonthTitle(view.year, view.monthIndex)}</span>
          <span className={styles.monthCount}>отмечено дней: {doneCount}</span>
        </div>
        <Button
          size="lg"
          iconOnly
          icon={<ChevronRight size={18} />}
          aria-label="Следующий месяц"
          disabled={isCurrentMonth}
          onClick={() => shiftMonth(1)}
        />
      </div>

      <div className={styles.month} role="group" aria-label={`${name}: ${formatMonthTitle(view.year, view.monthIndex)}`}>
        {WEEKDAYS.map((day) => (
          <span key={day} className={styles.monthWeekday}>
            {day}
          </span>
        ))}
        {Array.from({ length: emptyBefore }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {dates.map((date, i) => {
          const done = isDone(date)
          const future = date > today
          const classes = [styles.monthDay, done && styles.monthDayDone, date === today && styles.monthDayToday]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={date}
              type="button"
              className={classes}
              disabled={future}
              aria-pressed={done}
              aria-label={`${formatDayShort(date)}${done ? ': отмечено' : ''}${future ? ' (ещё не наступил)' : ''}`}
              onClick={() => onToggle(date)}
            >
              {i + 1}
              {done && <Check size={12} strokeWidth={3} aria-hidden="true" className={styles.monthCheck} />}
            </button>
          )
        })}
      </div>
      <p className={styles.monthHint}>Нажми на день, чтобы поставить или снять отметку. Будущие дни недоступны.</p>
    </Sheet>
  )
}
