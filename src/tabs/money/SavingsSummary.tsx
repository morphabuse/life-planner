// Итоги копилки: отложено, осталось, сколько нужно в месяц, сколько смен до цели, прогресс-бар.
// Если загружена выписка накопительного — сверка копилки с остатком на счёте.
import { Card, ProgressBar } from '../../components/ui'
import type { SavingsSummaryData } from './savingsMath'
import { formatDate, formatMoney, formatMoneyExact, formatSigned, plural } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  summary: SavingsSummaryData
  shiftsLeft: number | null // «до Турции осталось N смен»; null — посчитать нельзя
  turkeyPerShift: number // сколько с одной смены уходит на Турцию
  balance: { amount: number; date: string } | null // остаток на накопительном по последней выписке
}

export function SavingsSummary({ summary, shiftsLeft, turkeyPerShift, balance }: Props) {
  const { saved, left, percent, monthsLeft, perMonth } = summary

  // Текст для блока «Нужно в месяц» зависит от ситуации.
  let perMonthText: string
  let perMonthHint: string
  if (left === 0) {
    perMonthText = '—'
    perMonthHint = 'Цель достигнута'
  } else if (perMonth === null) {
    perMonthText = '—'
    perMonthHint = 'Срок цели уже наступил'
  } else {
    perMonthText = formatMoney(perMonth)
    perMonthHint = `ещё ${monthsLeft} мес.`
  }

  return (
    <Card>
      <div className={styles.stats}>
        <div>
          <div className={styles.statLabel}>Отложено</div>
          <div className={styles.statValue}>{formatMoney(saved)}</div>
        </div>
        <div>
          <div className={styles.statLabel}>Осталось</div>
          <div className={styles.statValue}>{formatMoney(left)}</div>
        </div>
        <div>
          <div className={styles.statLabel}>Нужно в месяц</div>
          <div className={styles.statValue}>{perMonthText}</div>
          <div className={styles.caption}>{perMonthHint}</div>
        </div>
        <div>
          <div className={styles.statLabel}>До Турции осталось</div>
          <div className={styles.statValue}>
            {left === 0 || shiftsLeft === null
              ? '—'
              : `${shiftsLeft} ${plural(shiftsLeft, 'смена', 'смены', 'смен')}`}
          </div>
          <div className={styles.caption}>
            {shiftsLeft === null
              ? 'на Турцию сейчас 0 %'
              : `по ${formatMoney(turkeyPerShift)} в копилку со смены`}
          </div>
        </div>
      </div>

      <ProgressBar value={percent} label="Прогресс копилки" />
      <div className={styles.progressCaption}>
        {percent.toFixed(1)}% · в копилке {formatMoneyExact(saved)}
      </div>
      {balance && <BalanceCheck saved={saved} balance={balance} />}
    </Card>
  )
}

// «На счёте по выписке на 04.10.2026: 6 273,82 ₽» + расхождение, если копилка с ним не сходится.
function BalanceCheck({ saved, balance }: { saved: number; balance: { amount: number; date: string } }) {
  // Сравниваем в копейках: дробные рубли нельзя сравнивать через ===.
  const diffKop = Math.round(saved * 100) - Math.round(balance.amount * 100)
  const text = `На накопительном счёте по выписке на ${formatDate(balance.date)}: ${formatMoneyExact(balance.amount)}`
  if (diffKop === 0) {
    return <p className={styles.okText}>{text} — сходится с копилкой.</p>
  }
  return (
    <p className={styles.error}>
      {text}. Расхождение с копилкой: {formatSigned(diffKop / 100)} — проверь ручные записи в истории
      или загрузи выписку накопительного за весь срок.
    </p>
  )
}
