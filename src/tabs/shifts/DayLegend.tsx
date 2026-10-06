// Легенда к квадратикам дней: те же квадратики, что в календаре, и подписи.
import type { DayMark } from './schedule'
import { MARK_LABELS } from './schedule'
import { DaySquare } from './DaySquare'
import styles from './ShiftsTab.module.css'

const MARKS: DayMark[] = ['worked', 'planned', 'missed', 'leave', 'off']

export function DayLegend() {
  return (
    <ul className={styles.legend} aria-label="Обозначения">
      {MARKS.map((mark) => (
        <li key={mark}>
          <DaySquare mark={mark} size="sm" label="" />
          {MARK_LABELS[mark]}
        </li>
      ))}
    </ul>
  )
}
