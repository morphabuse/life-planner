// Деньги на «Сегодня»: прогноз Турции одной фразой и «можно потратить»,
// кнопка «Получил за смену» (после ввода — сразу раскладка по конвертам с галочками «Перевёл»),
// ниже — напоминания: доли дохода, которые ещё не отмечены «Перевёл».
// Форма и раскладка — те же компоненты, что во вкладке «Деньги» (IncomeForm, IncomeShares).
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import type { EnvelopeKind, MoneyData } from '../../types'
import { formatDayShort } from '../../utils/date'
import { ENVELOPE_TO, confirmedShares, pendingTransfers, shiftIncomes, spendable } from '../money/moneyLogic'
import type { TurkeyForecast } from '../money/turkeyLogic'
import { ForecastPhrase } from '../money/ForecastPhrase'
import { IncomeForm } from '../money/IncomeForm'
import { IncomeShares } from '../money/IncomeShares'
import { formatMoney, formatMoneyExact } from '../money/format'
import styles from './TodayTab.module.css'

interface Props {
  money: MoneyData
  forecast: TurkeyForecast
  today: string
  incomeDate: string // дата смены по умолчанию для «Получил за смену»
  onAddIncome: (shiftDate: string, rub: number) => void
  onToggleTransfer: (shiftDate: string, kind: EnvelopeKind) => void
}

export function TodayMoneyCard({ money, forecast, today, incomeDate, onAddIncome, onToggleTransfer }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  // Смена, доход за которую только что ввели: под ней показываем раскладку по конвертам.
  const [addedDate, setAddedDate] = useState<string | null>(null)

  const free = spendable(money, today)
  const added = addedDate ? shiftIncomes(money).find((i) => i.shiftDate === addedDate) : undefined
  // Доли только что введённого дохода уже видны в раскладке — в напоминаниях их не повторяем.
  const pending = pendingTransfers(money).filter((p) => p.shiftDate !== added?.shiftDate)

  function handleAdd(shiftDate: string, rub: number) {
    onAddIncome(shiftDate, rub)
    setAddedDate(shiftDate)
    setFormOpen(false)
  }

  return (
    <>
      <Card
        compact
        title={`${money.settings.goal.title}: ${formatMoney(forecast.progress.saved)} из ${formatMoney(forecast.progress.target)}`}
        actions={
          <Button
            size="sm"
            icon={<Plus size={16} />}
            aria-expanded={formOpen}
            onClick={() => setFormOpen((v) => !v)}
          >
            Получил за смену
          </Button>
        }
      >
        <ForecastPhrase forecast={forecast} />
        <p className={styles.spendLine}>
          Можно потратить:{' '}
          <span className={styles.spendValue}>{free ? formatMoney(free.rub) : '—'}</span>
          <span className={styles.caption}> · «Жизнь» + карта</span>
        </p>

        {formOpen && <IncomeForm defaultDate={incomeDate} onAdd={handleAdd} />}

        {added && (
          <div className={styles.added}>
            <div className={styles.addedHeader}>
              <span>
                Смена {formatDayShort(added.shiftDate)}:{' '}
                <span className={styles.addedAmount}>{formatMoneyExact(added.amountKop / 100)}</span>
              </span>
              <Button variant="text" size="sm" onClick={() => setAddedDate(null)}>
                Готово
              </Button>
            </div>
            <IncomeShares
              income={added}
              money={money}
              confirmed={confirmedShares(money)}
              onToggleTransfer={onToggleTransfer}
            />
          </div>
        )}
      </Card>

      {pending.length > 0 && (
        <Card compact title="Напоминания" subtitle="Доли дохода, которые ещё не переведены">
          <ul className={styles.tasks}>
            {pending.map((p) => (
              <li key={`${p.shiftDate}-${p.kind}`}>
                <label className={styles.task}>
                  {/* Галочка ставит ту же отметку «Перевёл», что во вкладке «Деньги». */}
                  <input type="checkbox" checked={false} onChange={() => onToggleTransfer(p.shiftDate, p.kind)} />
                  <span>
                    Переведи {formatMoneyExact(p.kop / 100)} на {ENVELOPE_TO[p.kind]}
                    <span className={styles.caption}> · смена {formatDayShort(p.shiftDate)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
