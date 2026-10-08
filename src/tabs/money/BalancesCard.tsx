// «Можно потратить» = остаток «Жизнь» + карта, и остатки всех четырёх счетов.
// Главный источник остатков — сверка по скриншоту банка («Сверить»); от неё остаток
// считается дальше (+ операции, доходы и «Перевёл» после сверки). Без сверки — по выпискам.
import { Card } from '../../components/ui'
import type { BalanceKind, MoneyData } from '../../types'
import { ACCOUNT_LABELS, BALANCE_KINDS, balanceOf, spendable } from './moneyLogic'
import type { KindBalance } from './moneyLogic'
import { formatDate, formatMoneyExact, formatSigned, formatStamp } from './format'
import { ReconcileButton } from './reconcile/ReconcileButton'
import { ReconcileStatus } from './reconcile/ReconcileStatus'
import styles from './MoneyTab.module.css'

interface Props {
  money: MoneyData
  today: string
  now: string // 'YYYY-MM-DDTHH:MM' — для «давно не сверял»
  onReconcile: (balances: Partial<Record<BalanceKind, number>>) => void // копейки
}

// Подпись, откуда остаток.
function source(b: KindBalance | null): string {
  if (!b) return 'нет данных'
  if (b.reconciledAt) {
    const base = `сверено ${formatStamp(b.reconciledAt)}`
    return b.sinceKop !== 0 ? `${base}, после: ${formatSigned(b.sinceKop / 100)}` : base
  }
  if (b.onlyPending) return 'выписки нет — отмечено «Перевёл»'
  const base = `по выписке на ${formatDate(b.asOf)}`
  // Отмеченные «Перевёл» доли, которых выписка ещё не видит, уже прибавлены к остатку.
  return b.pendingKop > 0 ? `${base} + ${formatMoneyExact(b.pendingKop / 100)} «Перевёл»` : base
}

export function BalancesCard({ money, today, now, onReconcile }: Props) {
  const total = spendable(money, today)
  const balances = Object.fromEntries(BALANCE_KINDS.map((k) => [k, balanceOf(money, k, today)])) as Record<
    BalanceKind,
    KindBalance | null
  >

  return (
    <Card
      title="Можно потратить"
      subtitle="Остаток «Жизнь» + карта"
      actions={<ReconcileButton money={money} today={today} onSave={onReconcile} withManual />}
    >
      <div className={styles.spendableRow}>
        <div className={styles.spendable}>{total ? formatMoneyExact(total.rub) : '—'}</div>
        <ReconcileStatus money={money} today={today} now={now} onSave={onReconcile} />
      </div>
      {!total && (
        <p className={styles.caption}>
          Остатков пока нет — нажми «Сверить» и выбери скриншот «Ваши накопления» из приложения банка.
        </p>
      )}

      <div className={styles.accountGrid}>
        {BALANCE_KINDS.map((kind) => (
          <div key={kind}>
            <div className={styles.statLabel}>{ACCOUNT_LABELS[kind]}</div>
            <div className={styles.envelopeValue}>
              {balances[kind] ? formatMoneyExact(balances[kind].kop / 100) : '—'}
            </div>
            <div className={styles.captionXs}>{source(balances[kind])}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}
