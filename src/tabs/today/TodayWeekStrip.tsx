// Мини-неделя пн–вс: квадраты дней как в календаре «Смен», сегодня в белой рамке.
// Показывается внутри карточки смены на «Сегодня».
import type { ShiftsData } from '../../types'
import { formatDayShort } from '../../utils/date'
import { MARK_LABELS, dayMark } from '../shifts/schedule'
import { DaySquare } from '../shifts/DaySquare'
import { weekDates, weekStartOf } from '../week/weekLogic'
import styles from './TodayTab.module.css'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function TodayWeekStrip({ today, shifts }: { today: string; shifts: ShiftsData }) {
  return (
    <ol className={styles.week} aria-label="Эта неделя">
      {weekDates(weekStartOf(today)).map((date, i) => {
        const mark = dayMark(date, shifts, today)
        return (
          <li key={date} className={styles.weekDay}>
            <span className={styles.weekName}>{WEEKDAYS[i]}</span>
            <DaySquare
              mark={mark}
              isToday={date === today}
              label={`${formatDayShort(date)}: ${mark ? MARK_LABELS[mark] : 'смены нет'}`}
            >
              <span className={styles.weekNumber}>{Number(date.slice(8))}</span>
            </DaySquare>
          </li>
        )
      })}
    </ol>
  )
}
