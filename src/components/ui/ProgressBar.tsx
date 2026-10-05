// Полоса прогресса 0–100 %.
// tone="danger" — для превышения (лимит, конверт ушёл в минус).
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  value: number // 0–100
  label: string // для программ чтения с экрана: «Прогресс копилки»
  tone?: 'accent' | 'danger'
}

export function ProgressBar({ value, label, tone = 'accent' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <div className={`${styles.fill} ${styles[tone]}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}
