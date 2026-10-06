// Мини-неделя пн–вс: квадраты дней как в календаре «Смен», сегодня в белой рамке.
import type { ShiftsData } from '../../types'
import { Card } from '../../components/ui'
import { formatDayShort } from '../../utils/date'
import { MARK_LABELS, dayMark, getEntry } from '../shifts/schedule'
import { DaySquare } from '../shifts/DaySquare'
import { weekDates, weekStartOf } from '../week/weekLogic'
import { plural } from '../money/format'
import styles from './TodayTab.module.css'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function TodayWeekStrip({ today, shifts }: { today: string; shifts: ShiftsData }) {
  const dates = weekDates(weekStartOf(today))
  const count = dates.filter((d) => getEntry(d, shifts)?.status === 'shift').length

  return (
    <Card compact title="Неделя" subtitle={count > 0 ? `${count} ${plural(count, 'смена', 'смены', 'смен')}` : 'Смен на этой неделе нет'}>
      <ol className={styles.week}>
        {dates.map((date, i) => {
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
    </Card>
  )
}
