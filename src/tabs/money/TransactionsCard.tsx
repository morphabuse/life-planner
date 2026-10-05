// Операции месяца из выписки карты. Категорию можно поменять —
// тогда правило запоминается для этого магазина и действует на все его операции.
// Список длинный, поэтому блок свёрнут: в заголовке — сколько операций и итоги месяца.
import { Card, Collapsible, Select } from '../../components/ui'
import type { Transaction } from '../../types'
import { CATEGORY_INCOME, CATEGORY_TRANSFER, categorize, merchantKey } from './moneyLogic'
import { formatSigned, plural } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  transactions: Transaction[] // операции выбранного месяца
  rules: Record<string, string>
  categories: string[]
  onCategoryChange: (tx: Transaction, category: string) => void
}

export function TransactionsCard({ transactions, rules, categories, onCategoryChange }: Props) {
  // Новые сверху: сравниваем «дата + время» как строки.
  const sorted = [...transactions].sort((a, b) =>
    (b.date + b.time).localeCompare(a.date + a.time),
  )

  if (sorted.length === 0) {
    return <Card title="Операции по карте" subtitle="За этот месяц операций нет — загрузи выписку карты выше." />
  }

  // Итоги для заголовка свёрнутого блока (в копейках, чтобы не было ошибок дробей).
  // Траты — все списания, кроме переводов между своими счетами; доход — «Доход: склад».
  let spentKop = 0
  let incomeKop = 0
  for (const tx of sorted) {
    const category = categorize(tx, rules)
    if (tx.amount < 0 && category !== CATEGORY_TRANSFER) spentKop += tx.amount
    if (tx.amount > 0 && category === CATEGORY_INCOME) incomeKop += tx.amount
  }
  const summary = [
    `${sorted.length} ${plural(sorted.length, 'операция', 'операции', 'операций')}`,
    spentKop < 0 && `траты ${formatSigned(spentKop / 100)}`,
    incomeKop > 0 && `доход ${formatSigned(incomeKop / 100)}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Collapsible title="Операции по карте" subtitle={summary}>
      <p className={styles.txHint}>Поменяй категорию — сайт запомнит её для этого магазина.</p>
      <ul className={styles.transactions}>
        {sorted.map((tx) => {
          const category = categorize(tx, rules)
          // Переводы между своими счетами — не трата и не доход, показываем их тише.
          const quiet = category === CATEGORY_TRANSFER
          const isIncome = tx.amount > 0 && category === CATEGORY_INCOME
          const custom = rules[merchantKey(tx.purpose)] !== undefined
          return (
            <li key={tx.id} className={`${styles.transaction} ${quiet ? styles.quiet : ''}`}>
              <span className={styles.txDate}>
                {tx.date.slice(8, 10)}.{tx.date.slice(5, 7)}
              </span>
              <span className={styles.txPurpose} title={tx.purpose}>
                {tx.purpose || '—'}
              </span>
              <Select
                size="sm"
                className={styles.txCategory}
                aria-label={`Категория операции «${tx.purpose}»`}
                title={custom ? 'Твоё правило для этого магазина' : 'Определено автоматически'}
                options={categories}
                value={category}
                onChange={(e) => onCategoryChange(tx, e.target.value)}
              />
              <span className={`${styles.txAmount} ${isIncome ? styles.positive : ''}`}>
                {formatSigned(tx.amount / 100)}
              </span>
            </li>
          )
        })}
      </ul>
    </Collapsible>
  )
}
