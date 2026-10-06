// Серия смен — 14 квадратиков за последние 2 недели (сегодня справа, в белой рамке).
// Вид квадратика — тот же, что в календаре «Смен»: отработал — заливка, смена впереди —
// контур, «не вышел» — коралловый со значком ✕.
import type { ShiftsData } from '../../types'
import { formatDayShort } from '../../utils/date'
import { MARK_LABELS, dayMark } from '../shifts/schedule'
import { DaySquare } from '../shifts/DaySquare'
import { SHIFT_STRIP_DAYS, lastDays } from './habitsLogic'
import styles from './HabitsTab.module.css'

export function ShiftStreakStrip({ shifts, today }: { shifts: ShiftsData; today: string }) {
  return (
    <ol className={styles.strip} aria-label="Смены за последние 2 недели">
      {lastDays(today, SHIFT_STRIP_DAYS).map((date) => {
        const mark = dayMark(date, shifts, today)
        return (
          <li key={date}>
            <DaySquare
              size="sm"
              mark={mark}
              isToday={date === today}
              label={`${formatDayShort(date)}: ${mark ? MARK_LABELS[mark] : 'смены нет'}`}
            />
          </li>
        )
      })}
    </ol>
  )
}
