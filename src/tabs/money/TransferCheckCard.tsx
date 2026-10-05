// Сверка по выпискам: сколько с даты старта пришло переводами на каждый счёт-конверт
// против положенной доли доходов.
import { Check } from 'lucide-react'
import { Badge, Card } from '../../components/ui'
import type { MoneyData } from '../../types'
import { ACCOUNT_LABELS, ENVELOPES, transferCheck } from './moneyLogic'
import { formatDate, formatMoney, formatMoneyExact } from './format'
import styles from './MoneyTab.module.css'

export function TransferCheckCard({ money }: { money: MoneyData }) {
  const { start } = money.settings.goal
  return (
    <Card compact title="Сверка переводов по выпискам" subtitle={`Доли доходов с ${formatDate(start)} против переводов на счета`}>
      <ul className={styles.checks}>
        {ENVELOPES.map((kind) => {
          const check = transferCheck(money, kind)
          const percent = money.settings.split[kind]
          let status
          if (check.status === 'none') {
            status = <span className={styles.caption}>выписки счёта нет — загрузи её, чтобы сверить</span>
          } else if (check.status === 'before') {
            status = (
              <span className={styles.caption}>
                выписка по {formatDate(check.until ?? '')} — раньше старта, сверять пока нечего
              </span>
            )
          } else {
            const detail = `положено ${formatMoneyExact(check.owedKop / 100)}, пришло ${formatMoneyExact(check.sentKop / 100)} (по ${formatDate(check.until ?? '')})`
            status = (
              <>
                {check.status === 'ok' ? (
                  <Badge tone="accent" icon={<Check size={12} />}>
                    всё переведено
                  </Badge>
                ) : (
                  <Badge tone="danger">недоперевёл {formatMoney((check.owedKop - check.sentKop) / 100)}</Badge>
                )}
                <span className={styles.caption}>{detail}</span>
              </>
            )
          }
          return (
            <li key={kind} className={styles.checkRow}>
              <span className={styles.limitName}>
                {ACCOUNT_LABELS[kind]} <span className={styles.caption}>{percent} %</span>
              </span>
              {status}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
