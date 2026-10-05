// История копилки: пополнения (+) и снятия (−), от новых к старым, с кнопкой удаления.
// Показывается внутри свёрнутого блока.
import { Trash2 } from 'lucide-react'
import type { Deposit } from '../../types'
import { Button } from '../../components/ui'
import { formatDate, formatSigned } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  deposits: Deposit[]
  onDelete: (id: string) => void
}

export function DepositHistory({ deposits, onDelete }: Props) {
  // Сортируем копию ([...]), чтобы не менять исходный массив из состояния.
  // Даты в формате 'YYYY-MM-DD' можно сравнивать как обычные строки.
  const sorted = [...deposits].sort((a, b) => b.date.localeCompare(a.date))

  if (sorted.length === 0) return <p className={styles.caption}>Пока нет записей.</p>

  return (
    <ul className={styles.history}>
      {sorted.map((deposit) => {
        const what = deposit.amount > 0 ? 'пополнение' : 'снятие'
        const label = `${what} ${formatSigned(deposit.amount)} от ${formatDate(deposit.date)}`
        return (
          <li key={deposit.id} className={styles.historyItem}>
            <span className={styles.historyDate}>{formatDate(deposit.date)}</span>
            <span className={`${styles.historyAmount} ${deposit.amount < 0 ? styles.historyMinus : ''}`}>
              {formatSigned(deposit.amount)}
            </span>
            <Button
              variant="text"
              size="sm"
              iconOnly
              danger
              icon={<Trash2 size={16} />}
              onClick={() => {
                // window.confirm показывает окно «ОК / Отмена» и возвращает true при «ОК».
                if (window.confirm(`Удалить ${label}?`)) onDelete(deposit.id)
              }}
              aria-label={`Удалить ${label}`}
            />
          </li>
        )
      })}
    </ul>
  )
}
