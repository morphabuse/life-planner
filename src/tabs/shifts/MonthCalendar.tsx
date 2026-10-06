// Календарь одного месяца: дни-квадраты по отметкам из «Смен», по клику день выбирается.
import type { ShiftsData } from '../../types'
import { daysInMonth, formatDayShort, makeIso, weekdayMondayFirst } from '../../utils/date'
import { MARK_LABELS, dayMark } from './schedule'
import { DaySquare } from './DaySquare'
import styles from './ShiftsTab.module.css'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface Props {
  year: number
  monthIndex: number // 0–11
  data: ShiftsData
  today: string
  selected: string | null
  onSelect: (date: string) => void
}

export function MonthCalendar({ year, monthIndex, data, today, selected, onSelect }: Props) {
  // Сколько пустых клеток перед 1-м числом (неделя начинается с понедельника).
  const emptyBefore = weekdayMondayFirst(makeIso(year, monthIndex, 1))
  // Массив дат месяца: ['2026-10-01', '2026-10-02', …]
  const dates = Array.from({ length: daysInMonth(year, monthIndex) }, (_, i) =>
    makeIso(year, monthIndex, i + 1),
  )

  return (
    <div className={styles.calendar}>
      {WEEKDAYS.map((name) => (
        <div key={name} className={styles.weekday}>
          {name}
        </div>
      ))}

      {Array.from({ length: emptyBefore }, (_, i) => (
        <div key={`empty-${i}`} />
      ))}

      {dates.map((date, i) => {
        const mark = dayMark(date, data, today)
        // Подпись для программ чтения с экрана: «5 октября: Отработал»
        const label = `${formatDayShort(date)}: ${mark ? MARK_LABELS[mark] : 'не отмечен'}`
        return (
          <DaySquare
            key={date}
            mark={mark}
            isToday={date === today}
            selected={date === selected}
            label={label}
            onClick={() => onSelect(date)}
          >
            <span className={styles.dayNumber}>{i + 1}</span>
            {mark && <span className={styles.dayTag}>{MARK_LABELS[mark]}</span>}
          </DaySquare>
        )
      })}
    </div>
  )
}
