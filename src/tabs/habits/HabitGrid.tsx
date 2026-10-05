// Календарь-сетка за последние 8 недель: колонки — недели, строки — дни (Пн…Вс).
// Отмеченный день — акцентная клетка, неотмеченный — нейтральная (без красного).
import { formatDayShort } from '../../utils/date'
import { gridDays } from './habitsLogic'
import styles from './HabitsTab.module.css'

interface Props {
  today: string
  isDone: (date: string) => boolean
  // Если передано — клетку прошлого дня можно нажать, чтобы поставить/снять отметку.
  onToggle?: (date: string) => void
  label: string // для экранных чтецов: «Английский»
}

export function HabitGrid({ today, isDone, onToggle, label }: Props) {
  return (
    <div className={styles.grid} role="group" aria-label={`${label}: последние 8 недель`}>
      {gridDays(today).map(({ date, future }) => {
        const done = isDone(date)
        const classes = [
          styles.cell,
          done && styles.cellDone,
          future && styles.cellFuture,
          date === today && styles.cellToday,
        ]
          .filter(Boolean)
          .join(' ')
        const title = `${formatDayShort(date)}${done ? ': отмечено' : ''}`

        if (onToggle && !future) {
          return (
            <button
              key={date}
              type="button"
              className={classes}
              title={title}
              aria-label={title}
              aria-pressed={done}
              onClick={() => onToggle(date)}
            />
          )
        }
        return <span key={date} className={classes} title={future ? undefined : title} />
      })}
    </div>
  )
}
