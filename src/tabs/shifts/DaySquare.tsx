// Квадратик дня — один вид для календаря «Смен», мини-недели на «Сегодня» и серии смен.
//   отработал       — заливка акцентом
//   запланирована   — контур акцентом
//   не вышел        — коралловый со значком ✕ (не только цветом)
//   отгул / выходной — свои приглушённые цвета
//   сегодня         — белая обводка
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { DayMark } from './schedule'
import styles from './DaySquare.module.css'

interface Props {
  mark: DayMark | null
  isToday?: boolean
  selected?: boolean
  size?: 'sm' | 'md' // sm — маленький квадратик серии, md — клетка календаря (тянется по ширине)
  label: string // для программ чтения с экрана: «5 октября: Отработал» ('' — только картинка)
  onClick?: () => void // если есть — квадратик становится кнопкой
  children?: ReactNode // число, подпись
}

export function DaySquare({ mark, isToday, selected, size = 'md', label, onClick, children }: Props) {
  const classes = [
    styles.square,
    styles[size],
    mark && styles[mark],
    isToday && styles.today,
    selected && styles.selected,
    onClick && styles.clickable,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {children}
      {mark === 'missed' && (
        <X className={styles.cross} size={size === 'sm' ? 12 : 14} strokeWidth={3} aria-hidden="true" />
      )}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} aria-label={label} aria-pressed={selected}>
        {content}
      </button>
    )
  }
  // Пустая подпись — квадратик просто картинка (например, в легенде рядом с текстом).
  if (!label) {
    return (
      <span className={classes} aria-hidden="true">
        {content}
      </span>
    )
  }
  return (
    <span className={classes} role="img" aria-label={label} title={label}>
      {content}
    </span>
  )
}
