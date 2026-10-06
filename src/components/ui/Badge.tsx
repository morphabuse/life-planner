// Плашка-чип и цветная точка статуса.
// Тона статусов совпадают с DayStatus из «Смен»: shift / missed / leave / off.
// Пропуски и перерасход показываем не только цветом: у тона missed сам ставится значок ✕,
// у danger — «!» (если не передан свой значок).
import type { ReactNode } from 'react'
import { CircleAlert, X } from 'lucide-react'
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

// Значок по умолчанию для «плохих» тонов.
const DEFAULT_ICON: Partial<Record<BadgeTone, ReactNode>> = {
  missed: <X size={12} strokeWidth={3} />,
  danger: <CircleAlert size={12} strokeWidth={2.5} />,
}

export function Badge({ tone = 'neutral', icon, children }: BadgeProps) {
  const shown = icon ?? DEFAULT_ICON[tone]
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      {shown && (
        <span className={styles.icon} aria-hidden="true">
          {shown}
        </span>
      )}
      {children}
    </span>
  )
}

// Маленький кружок цвета статуса — для легенды и кнопок выбора статуса.
export function StatusDot({ tone }: { tone: BadgeTone }) {
  return <span className={`${styles.dot} ${styles[tone]}`} aria-hidden="true" />
}
