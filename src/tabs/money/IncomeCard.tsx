// Доход за смены месяца. Каждая смена — 2 платежа на карту, склеенные в один доход.
// Доход можно ввести вручную («Получил за смену»), выписка карты потом дополняет
// и сверяет: сходится / добавлено из выписки / «проверь».
// После дохода (с даты старта) — «Переведи X на Жизнь, Y на Турцию, Z на Одежду и уход»
// с галочками «Перевёл».
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Input } from '../../components/ui'
import type { EnvelopeKind, MoneyData } from '../../types'
import { formatDayShort } from '../../utils/date'
import type { ShiftIncome } from './moneyLogic'
import { ENVELOPE_TO, ENVELOPES, confirmedShares, shareKey, splitIncome } from './moneyLogic'
import { formatDate, formatMoney, formatMoneyExact, plural } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  incomes: ShiftIncome[] // доходы показанного месяца
  money: MoneyData
  defaultDate: string // дата смены по умолчанию в форме
  onAddManual: (shiftDate: string, rub: number) => void
  onRemoveManual: (shiftDate: string) => void
  onToggleTransfer: (shiftDate: string, kind: EnvelopeKind) => void
}

function StatusLine({ income }: { income: ShiftIncome }) {
  switch (income.status) {
    case 'ok':
      return (
        <Badge tone="accent" icon={<Check size={12} />}>
          сходится с выпиской
        </Badge>
      )
    case 'statement':
      return <span className={styles.caption}>из выписки</span>
    case 'manual':
      return <span className={styles.caption}>введено, выписки пока нет</span>
    case 'check':
      return (
        <Badge tone="danger">
          проверь: ввёл {formatMoneyExact((income.manualKop ?? 0) / 100)}, по выписке{' '}
          {formatMoneyExact((income.statementKop ?? 0) / 100)}
        </Badge>
      )
  }
}

export function IncomeCard({ incomes, money, defaultDate, onAddManual, onRemoveManual, onToggleTransfer }: Props) {
  const [date, setDate] = useState(defaultDate)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const { start } = money.settings.goal
  const total = incomes.reduce((s, i) => s + i.amountKop, 0) / 100

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const rub = Number(amount)
    if (!date) return setError('Выбери дату смены')
    if (!(rub > 0)) return setError('Сумма должна быть больше нуля')
    onAddManual(date, rub)
    setAmount('')
    setError('')
  }

  // Какие доли выписка счёта уже подтвердила (перевод на сумму доли нашёлся).
  const confirmed = confirmedShares(money)
  // Новые смены сверху.
  const sorted = [...incomes].sort((a, b) => b.shiftDate.localeCompare(a.shiftDate))

  return (
    <Card
      title="Доход за смены"
      subtitle={
        incomes.length > 0
          ? `${incomes.length} ${plural(incomes.length, 'смена', 'смены', 'смен')} · ${formatMoney(total)}`
          : 'За этот месяц дохода нет — введи «Получил за смену» или загрузи выписку карты.'
      }
    >
      {sorted.length > 0 && (
        <ul className={styles.incomes}>
          {sorted.map((income) => {
            const shares = splitIncome(income.amountKop, money.settings.split)
            const marks = money.transfers[income.shiftDate] ?? {}
            return (
              <li key={income.shiftDate} className={styles.income}>
                <div className={styles.incomeHeader}>
                  <span className={styles.incomeDate}>Смена {formatDayShort(income.shiftDate)}</span>
                  <span className={styles.incomeAmount}>{formatMoneyExact(income.amountKop / 100)}</span>
                  <StatusLine income={income} />
                  {income.status === 'check' && (
                    <Button variant="text" size="sm" onClick={() => onRemoveManual(income.shiftDate)}>
                      Взять из выписки
                    </Button>
                  )}
                  {income.status === 'manual' && (
                    <Button
                      variant="text"
                      size="sm"
                      iconOnly
                      danger
                      icon={<Trash2 size={16} />}
                      aria-label={`Удалить доход за смену ${formatDate(income.shiftDate)}`}
                      onClick={() => onRemoveManual(income.shiftDate)}
                    />
                  )}
                </div>
                {income.shiftDate >= start ? (
                  <div className={styles.shares}>
                    <span className={styles.caption}>Переведи:</span>
                    {ENVELOPES.map((kind) => {
                      const confirmedOn = confirmed.get(shareKey(income.shiftDate, kind))
                      const label = `${formatMoneyExact(shares[kind] / 100)} на ${ENVELOPE_TO[kind]}`
                      // Перевод нашёлся в выписке счёта — галочка больше не нужна.
                      if (confirmedOn) {
                        return (
                          <span key={kind} className={styles.share}>
                            <Badge tone="accent" icon={<Check size={12} />}>
                              {label} · подтверждено выпиской {formatDayShort(confirmedOn)}
                            </Badge>
                          </span>
                        )
                      }
                      return (
                        <label key={kind} className={styles.share}>
                          <input
                            type="checkbox"
                            checked={marks[kind] === true}
                            onChange={() => onToggleTransfer(income.shiftDate, kind)}
                          />
                          <span className={marks[kind] ? styles.shareDone : undefined}>{label}</span>
                        </label>
                      )
                    })}
                  </div>
                ) : (
                  <p className={styles.captionXs}>До {formatDate(start)} — только в аналитику, не в конверты.</p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <form className={styles.incomeForm} onSubmit={handleSubmit}>
        <Input label="Смена" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input
          label="Получил за смену, ₽"
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button type="submit" icon={<Plus size={16} />}>
          Добавить
        </Button>
      </form>
      <p className={styles.captionXs}>
        По желанию: выписка карты сама добавит недостающие доходы и сверит введённые.
      </p>
      {error && <p className={styles.error}>{error}</p>}
    </Card>
  )
}
