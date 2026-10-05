// Деньги на «Сегодня»: прогноз Турции одной фразой и «можно потратить»,
// ниже — напоминания: доли дохода, которые ещё не отмечены «Перевёл».
import { Card } from '../../components/ui'
import type { EnvelopeKind, MoneyData } from '../../types'
import { formatDayShort } from '../../utils/date'
import { ENVELOPE_TO, pendingTransfers, spendable } from '../money/moneyLogic'
import type { TurkeyForecast } from '../money/turkeyLogic'
import { ForecastPhrase } from '../money/ForecastPhrase'
import { formatMoney, formatMoneyExact } from '../money/format'
import styles from './TodayTab.module.css'

interface Props {
  money: MoneyData
  forecast: TurkeyForecast
  today: string
  onTransferred: (shiftDate: string, kind: EnvelopeKind) => void
}

export function TodayMoneyCard({ money, forecast, today, onTransferred }: Props) {
  const free = spendable(money, today)
  const pending = pendingTransfers(money)

  return (
    <>
      <Card
        compact
        title={`${money.settings.goal.title}: ${formatMoney(forecast.progress.saved)} из ${formatMoney(forecast.progress.target)}`}
      >
        <ForecastPhrase forecast={forecast} />
        <p className={styles.spendLine}>
          Можно потратить:{' '}
          <span className={styles.spendValue}>{free ? formatMoney(free.rub) : '—'}</span>
          <span className={styles.caption}> · «Жизнь» + карта</span>
        </p>
      </Card>

      {pending.length > 0 && (
        <Card compact title="Напоминания" subtitle="Доли дохода, которые ещё не переведены">
          <ul className={styles.tasks}>
            {pending.map((p) => (
              <li key={`${p.shiftDate}-${p.kind}`}>
                <label className={styles.task}>
                  <input type="checkbox" checked={false} onChange={() => onTransferred(p.shiftDate, p.kind)} />
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
