// Мини-неделя пн–вс: дни окрашены по статусу из «Смен», сегодня выделено.
import type { DayStatus, ShiftsData } from '../../types'
import { Card } from '../../components/ui'
import { formatDayShort } from '../../utils/date'
import { STATUS_LABELS, getEntry } from '../shifts/schedule'
import { weekDates, weekStartOf } from '../week/weekLogic'
import { plural } from '../money/format'
import styles from './TodayTab.module.css'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const STATUS_CLASS: Record<DayStatus, string> = {
  shift: styles.dayShift,
  missed: styles.dayMissed,
  leave: styles.dayLeave,
  off: styles.dayOff,
}

export function TodayWeekStrip({ today, shifts }: { today: string; shifts: ShiftsData }) {
  const dates = weekDates(weekStartOf(today))
  const count = dates.filter((d) => getEntry(d, shifts)?.status === 'shift').length

  return (
    <Card compact title="Неделя" subtitle={count > 0 ? `${count} ${plural(count, 'смена', 'смены', 'смен')}` : 'Смен на этой неделе нет'}>
      <ol className={styles.week}>
        {dates.map((date, i) => {
          const entry = getEntry(date, shifts)
          const classes = [styles.weekDay, entry && STATUS_CLASS[entry.status], date === today && styles.weekToday]
            .filter(Boolean)
            .join(' ')
          return (
            <li
              key={date}
              className={classes}
              aria-label={`${formatDayShort(date)}: ${entry ? STATUS_LABELS[entry.status] : 'смены нет'}`}
            >
              <span className={styles.weekName}>{WEEKDAYS[i]}</span>
              <span className={styles.weekNumber}>{Number(date.slice(8))}</span>
              <span className={styles.weekTag}>{entry ? STATUS_LABELS[entry.status].toLowerCase() : ''}</span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
