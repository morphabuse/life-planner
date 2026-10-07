// Доход за смены месяца. Каждая смена — 2 платежа на карту, склеенные в один доход.
// Доход можно ввести вручную («Получил за смену»), выписка карты потом дополняет
// и сверяет: сходится / добавлено из выписки / «проверь».
// После дохода (с даты старта) — «Переведи X на Жизнь, Y на Турцию, Z на Одежду и уход»
// с галочками «Перевёл».
import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import type { EnvelopeKind, MoneyData } from '../../types'
import { formatDayShort } from '../../utils/date'
import type { ShiftIncome } from './moneyLogic'
import { confirmedShares } from './moneyLogic'
import { formatDate, formatMoney, formatMoneyExact, plural } from './format'
import { IncomeShares } from './IncomeShares'
import { IncomeButton } from './IncomeButton'
import { IncomeForm } from './IncomeForm'
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
  const [formOpen, setFormOpen] = useState(false)
  const total = incomes.reduce((s, i) => s + i.amountKop, 0) / 100

  // Ввёл доход — форму закрываем: новая смена с раскладкой появится в списке под кнопкой.
  function handleAdd(shiftDate: string, rub: number) {
    onAddManual(shiftDate, rub)
    setFormOpen(false)
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
      {/* Плитка-кнопка «Получил за смену» — как на «Сегодня»; форма открывается под ней. */}
      <IncomeButton open={formOpen} onToggle={() => setFormOpen((v) => !v)} />
      {formOpen && (
        <>
          <IncomeForm defaultDate={defaultDate} onAdd={handleAdd} />
          <p className={styles.captionXs}>
            По желанию: выписка карты сама добавит недостающие доходы и сверит введённые.
          </p>
        </>
      )}

      {sorted.length > 0 && (
        <ul className={styles.incomes}>
          {sorted.map((income) => (
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
                <IncomeShares income={income} money={money} confirmed={confirmed} onToggleTransfer={onToggleTransfer} />
              </li>
          ))}
        </ul>
      )}

    </Card>
  )
}
