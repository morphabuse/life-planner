// Форма «Получил за смену»: дата смены и сумма в рублях.
// Общая для «Денег» и «Сегодня»; что делать с введённым — решает тот, кто её показывает.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button, Input } from '../../components/ui'
import styles from './MoneyTab.module.css'

interface Props {
  defaultDate: string // дата смены по умолчанию (defaultIncomeShiftDate)
  onAdd: (shiftDate: string, rub: number) => void
  className?: string
}

export function IncomeForm({ defaultDate, onAdd, className }: Props) {
  const [date, setDate] = useState(defaultDate)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const rub = Number(amount)
    if (!date) return setError('Выбери дату смены')
    if (!(rub > 0)) return setError('Сумма должна быть больше нуля')
    onAdd(date, rub)
    setAmount('')
    setError('')
  }

  return (
    <>
      <form className={[styles.incomeForm, className].filter(Boolean).join(' ')} onSubmit={handleSubmit}>
        <Input label="Смена" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input
          label="Получил за смену, ₽"
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button type="submit" icon={<Plus size={16} />}>
          Добавить
        </Button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </>
  )
}
