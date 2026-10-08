// Когда последний раз сверял остатки: «сверено 08.10, 12:21». Если больше 7 дней
// (или ещё ни разу) — мягкая плашка «Давно не сверял — Сверить».
// compact — для «Сегодня»: только текст (подзаголовок карточки, рядом в шапке уже есть
// кнопка «Сверить»), без отдельной плашки — экран «Сегодня» должен влезать целиком.
import type { BalanceKind, MoneyData } from '../../../types'
import { RECONCILE_STALE_DAYS, lastReconciledAt } from '../moneyLogic'
import { formatStamp } from '../format'
import { daysSinceStamp } from '../../../utils/date'
import { ReconcileButton } from './ReconcileButton'
import styles from '../MoneyTab.module.css'

interface Props {
  money: MoneyData
  today: string
  now: string // 'YYYY-MM-DDTHH:MM'
  onSave: (balances: Partial<Record<BalanceKind, number>>) => void
  compact?: boolean
}

export function ReconcileStatus({ money, today, now, onSave, compact }: Props) {
  const at = lastReconciledAt(money)
  const stale = at === null || daysSinceStamp(at, now) > RECONCILE_STALE_DAYS

  if (!stale) return <span className={styles.reconciledAt}>сверено {formatStamp(at)}</span>

  const text = at === null ? 'Остатки ещё не сверял' : 'Давно не сверял'
  if (compact) return <span className={styles.reconciledAt}>{text} — нажми «Сверить»</span>
  return (
    <div className={styles.stale} role="status">
      <span>{text}</span>
      <ReconcileButton money={money} today={today} onSave={onSave} variant="text" />
    </div>
  )
}
