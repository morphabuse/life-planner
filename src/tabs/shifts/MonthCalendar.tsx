// Календарь одного месяца: дни раскрашены по статусу, по клику день выбирается.
import type { DayStatus, ShiftsData } from '../../types'
import { daysInMonth, formatDayShort, makeIso, weekdayMondayFirst } from '../../utils/date'
import { STATUS_LABELS } from './schedule'
import styles from './ShiftsTab.module.css'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// Класс ячейки для каждого статуса (цвета — из токенов --status-*).
const STATUS_CLASS: Record<DayStatus, string> = {
  shift: styles.dayShift,
  missed: styles.dayMissed,
  leave: styles.dayLeave,
  off: styles.dayOff,
}

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
        const entry = data.days[date]
        const classes = [
          styles.day,
          entry && STATUS_CLASS[entry.status],
          date === today && styles.today,
          date === selected && styles.selected,
        ]
          .filter(Boolean)
          .join(' ')

        // Подпись для программ чтения с экрана: «5 октября: Смена»
        let label = `${formatDayShort(date)}: `
        label += entry ? STATUS_LABELS[entry.status] : 'не отмечен'

        return (
          <button
            key={date}
            type="button"
            className={classes}
            onClick={() => onSelect(date)}
            aria-label={label}
            aria-pressed={date === selected}
          >
            <span className={styles.dayNumber}>{i + 1}</span>
            {entry && (
              <span className={styles.dayTag}>{STATUS_LABELS[entry.status].toLowerCase()}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
