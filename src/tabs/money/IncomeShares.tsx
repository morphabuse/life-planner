// Раскладка одного дохода по конвертам: «Переведи X на Жизнь, Y на Турцию, Z на Одежду и уход»
// с галочками «Перевёл». Доля, перевод которой нашёлся в выписке счёта, — «подтверждено выпиской».
// Общая для «Денег» (список доходов месяца) и «Сегодня» (после «Получил за смену»).
import { Check } from 'lucide-react'
import { Badge } from '../../components/ui'
import type { EnvelopeKind, MoneyData } from '../../types'
import { formatDayShort } from '../../utils/date'
import { ENVELOPE_TO, ENVELOPES, shareKey, splitIncome } from './moneyLogic'
import type { ShiftIncome } from './moneyLogic'
import { formatDate, formatMoneyExact } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  income: ShiftIncome
  money: MoneyData
  confirmed: Map<string, string> // результат confirmedShares(money) — считаем один раз на список
  onToggleTransfer: (shiftDate: string, kind: EnvelopeKind) => void
}

export function IncomeShares({ income, money, confirmed, onToggleTransfer }: Props) {
  const { start } = money.settings.goal
  if (income.shiftDate < start) {
    return <p className={styles.captionXs}>До {formatDate(start)} — только в аналитику, не в конверты.</p>
  }

  const shares = splitIncome(income.amountKop, money.settings.split)
  const marks = money.transfers[income.shiftDate] ?? {}
  return (
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
  )
}
