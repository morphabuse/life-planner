// Форма ручного пополнения копилки: дата + сумма. Показывается внутри свёрнутого блока.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import type { Deposit } from '../../types'
import { Button, Input } from '../../components/ui'
import { todayIso } from '../../utils/date'
import styles from './MoneyTab.module.css'

interface Props {
  onAdd: (deposit: Deposit) => void
}

export function DepositForm({ onAdd }: Props) {
  const [date, setDate] = useState(todayIso)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const value = Number(amount)
    if (!date) return setError('Выберите дату')
    if (!(value > 0)) return setError('Введите сумму больше нуля')

    // crypto.randomUUID() — встроенный в браузер генератор уникальных id.
    onAdd({ id: crypto.randomUUID(), date, amount: value })
    setAmount('') // очищаем сумму, дату оставляем — удобно вносить несколько подряд
    setError('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <Input label="Дата" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input
          label="Сумма, ₽"
          type="number"
          min="1"
          step="1"
          placeholder="например, 5000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button type="submit" variant="primary" icon={<Plus size={16} />}>
          Добавить
        </Button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  )
}
