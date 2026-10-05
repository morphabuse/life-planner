// Плашка-метка и цветная точка статуса.
// Тона статусов совпадают с DayStatus из «Смен»: shift / missed / leave / off.
import type { ReactNode } from 'react'
import styles from './Badge.module.css'

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'shift'
  | 'missed'
  | 'leave'
  | 'off'
  | 'danger'

interface BadgeProps {
  tone?: BadgeTone
  icon?: ReactNode
  children: ReactNode
}

export function Badge({ tone = 'neutral', icon, children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  )
}

// Маленький кружок цвета статуса — для легенды и кнопок выбора статуса.
export function StatusDot({ tone }: { tone: BadgeTone }) {
  return <span className={`${styles.dot} ${styles[tone]}`} aria-hidden="true" />
}
