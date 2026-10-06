// Аналитика месяца: доход за смены и как он соотносится с тратами.
//   «Жизнь»: доля дохода (50 %) против трат с карты (кроме «Одежды и ухода»);
//   «Одежда и уход»: доля (10 %) против трат этой категории.
// Доходы до даты старта сюда входят — в конверты они не идут, а в аналитику да.
import { CircleAlert } from 'lucide-react'
import { Card, ProgressBar } from '../../components/ui'
import type { SalarySplit } from '../../types'
import type { MonthAnalytics } from './moneyLogic'
import { formatMoney, plural, sinceLabel } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  analytics: MonthAnalytics
  split: SalarySplit
}

function Row({ name, percent, planned, spent, hasIncome }: {
  name: string
  percent: number
  planned: number
  spent: number
  hasIncome: boolean
}) {
  const over = hasIncome && spent > planned
  const ratio = planned > 0 ? (spent / planned) * 100 : spent > 0 ? 100 : 0
  return (
    <div className={styles.envelope}>
      <div className={styles.envelopeHeader}>
        <span className={styles.envelopeName}>{name}</span>
        <span className={styles.caption}>
          {percent} % дохода {hasIncome ? `= ${formatMoney(planned)}` : ''}
        </span>
      </div>
      <div className={over ? styles.dangerLine : undefined}>
        {/* Перерасход — не только цветом: значок «!» и подпись «больше на …». */}
        {over && <CircleAlert size={14} aria-hidden="true" />}
        <span>
          Потрачено {formatMoney(spent)}
          {hasIncome && (over ? ` — больше на ${formatMoney(spent - planned)}` : ` — осталось ${formatMoney(planned - spent)}`)}
        </span>
      </div>
      {hasIncome && (
        <ProgressBar
          value={ratio}
          tone={over ? 'danger' : 'accent'}
          label={`${name}: потрачено ${Math.round(ratio)}% от доли дохода`}
        />
      )}
    </div>
  )
}

export function MonthAnalyticsCard({ analytics, split }: Props) {
  const { income, shifts, from } = analytics
  const hasIncome = income > 0
  // Месяц старта: доход и траты — только с даты старта.
  const since = from ? ` · ${sinceLabel(from)}` : ''
  return (
    <Card
      title="Доход и траты за месяц"
      subtitle={
        (hasIncome
          ? `Доход ${formatMoney(income)} за ${shifts} ${plural(shifts, 'смену', 'смены', 'смен')}`
          : 'Дохода за смены в этом месяце пока нет — видно только траты.') + since
      }
    >
      <div className={styles.envelopes}>
        <Row
          name="Жизнь — траты с карты"
          percent={split.life}
          planned={analytics.lifePlanned}
          spent={analytics.lifeSpent}
          hasIncome={hasIncome}
        />
        <Row
          name="Одежда и уход"
          percent={split.clothes}
          planned={analytics.clothesPlanned}
          spent={analytics.clothesSpent}
          hasIncome={hasIncome}
        />
      </div>
    </Card>
  )
}
