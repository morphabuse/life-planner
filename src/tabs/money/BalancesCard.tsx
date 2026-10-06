// «Можно потратить» = остаток «Жизнь» + карта, и остатки всех четырёх счетов.
// Остатки берутся из выписок; если выписка старая — можно ввести остатки вручную (на сегодня).
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil } from 'lucide-react'
import { Button, Card, Input } from '../../components/ui'
import type { BalanceKind, BalanceSnapshot, MoneyData } from '../../types'
import { ACCOUNT_LABELS, BALANCE_KINDS, balanceOf, spendable } from './moneyLogic'
import { formatDate, formatMoney, formatMoneyExact } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  money: MoneyData
  today: string
  onSaveBalances: (balances: Partial<Record<BalanceKind, BalanceSnapshot>>) => void
}

export function BalancesCard({ money, today, onSaveBalances }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<BalanceKind, string>>({ card: '', life: '', turkey: '', clothes: '' })
  const [error, setError] = useState('')

  const total = spendable(money, today)
  const balances = Object.fromEntries(BALANCE_KINDS.map((k) => [k, balanceOf(money, k, today)])) as Record<
    BalanceKind,
    ReturnType<typeof balanceOf>
  >

  function startEditing() {
    setDraft({ card: '', life: '', turkey: '', clothes: '' })
    setError('')
    setEditing(true)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result: Partial<Record<BalanceKind, BalanceSnapshot>> = {}
    for (const kind of BALANCE_KINDS) {
      const value = draft[kind].trim()
      if (value === '') continue // не ввёл — этот остаток не меняем
      const amount = Number(value)
      if (!Number.isFinite(amount)) return setError(`Неверная сумма у «${ACCOUNT_LABELS[kind]}»`)
      result[kind] = { date: today, kop: Math.round(amount * 100) }
    }
    onSaveBalances(result)
    setEditing(false)
  }

  // Подпись, откуда остаток.
  const source = (kind: BalanceKind) => {
    const b = balances[kind]
    if (!b) return 'нет данных'
    if (b.onlyPending) return 'выписки нет — отмечено «Перевёл»'
    const base = b.manual ? `введено ${formatDate(b.asOf)}` : `по выписке на ${formatDate(b.asOf)}`
    // Отмеченные «Перевёл» доли, которых выписка ещё не видит, уже прибавлены к остатку.
    return b.pendingKop > 0 ? `${base} + ${formatMoneyExact(b.pendingKop / 100)} «Перевёл»` : base
  }

  return (
    <Card
      title="Можно потратить"
      subtitle="Остаток «Жизнь» + карта"
      actions={
        !editing && (
          <Button variant="text" size="sm" icon={<Pencil size={14} />} onClick={startEditing}>
            Ввести остатки
          </Button>
        )
      }
    >
      <div className={styles.spendable}>{total ? formatMoney(total.rub) : '—'}</div>
      {!total && (
        <p className={styles.caption}>
          Остатков пока нет — загрузи выписки счетов или введи остатки вручную.
        </p>
      )}

      {editing ? (
        <form onSubmit={handleSubmit}>
          <p className={`${styles.caption} ${styles.formRowSpaced}`}>
            Остатки на сегодня, ₽ — посмотри в приложении банка. Пустое поле — не менять.
          </p>
          <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
            {BALANCE_KINDS.map((kind) => (
              <Input
                key={kind}
                label={ACCOUNT_LABELS[kind]}
                type="number"
                step="1"
                placeholder={balances[kind] ? String(Math.round(balances[kind].kop / 100)) : ''}
                value={draft[kind]}
                onChange={(e) => setDraft((d) => ({ ...d, [kind]: e.target.value }))}
              />
            ))}
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.buttons}>
            <Button type="submit" variant="primary">
              Сохранить
            </Button>
            <Button variant="text" onClick={() => setEditing(false)}>
              Отмена
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.accountGrid}>
          {BALANCE_KINDS.map((kind) => (
            <div key={kind}>
              <div className={styles.statLabel}>{ACCOUNT_LABELS[kind]}</div>
              <div className={styles.envelopeValue}>
                {balances[kind] ? formatMoneyExact(balances[kind].kop / 100) : '—'}
              </div>
              <div className={styles.captionXs}>{source(kind)}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
