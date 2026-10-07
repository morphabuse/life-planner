// Сетка за последние 8 недель — обзор: колонки — недели, строки — дни (Пн…Вс).
// Отмеченный день — акцентная клетка, неотмеченный — нейтральная (без красного).
// Клетки мелкие, поэтому сами не нажимаются: нажатие на сетку открывает календарь
// месяца (onOpen), где у дней удобные крупные клетки.
import { formatDayShort } from '../../utils/date'
import { gridDays } from './habitsLogic'
import styles from './HabitsTab.module.css'

interface Props {
  today: string
  isDone: (date: string) => boolean
  onOpen?: () => void // если есть — сетка становится кнопкой «открыть календарь»
  label: string // для экранных чтецов: «Английский»
}

export function HabitGrid({ today, isDone, onOpen, label }: Props) {
  const cells = gridDays(today).map(({ date, future }) => {
    const done = isDone(date)
    const classes = [
      styles.cell,
      done && styles.cellDone,
      future && styles.cellFuture,
      date === today && styles.cellToday,
    ]
      .filter(Boolean)
      .join(' ')
    return <span key={date} className={classes} title={future ? undefined : `${formatDayShort(date)}${done ? ': отмечено' : ''}`} />
  })

  if (onOpen) {
    return (
      <button
        type="button"
        className={styles.gridButton}
        aria-label={`${label}: последние 8 недель. Открыть календарь, чтобы отметить дни`}
        onClick={onOpen}
      >
        <span className={styles.grid} aria-hidden="true">
          {cells}
        </span>
      </button>
    )
  }
  return (
    <div className={styles.grid} role="img" aria-label={`${label}: последние 8 недель`}>
      {cells}
    </div>
  )
}
