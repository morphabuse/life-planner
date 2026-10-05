// Карточка цели: показывает цель, по кнопке «Изменить» превращается в форму.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil } from 'lucide-react'
import type { SavingsGoal } from '../../types'
import { Button, Card, Input } from '../../components/ui'
import { formatMoney, formatMonth } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  goal: SavingsGoal
  onChange: (goal: SavingsGoal) => void
}

export function GoalCard({ goal, onChange }: Props) {
  const [editing, setEditing] = useState(false)
  // Черновик формы. Поля храним строками — так проще работать с <input>.
  const [title, setTitle] = useState(goal.title)
  const [amount, setAmount] = useState(String(goal.targetAmount))
  const [month, setMonth] = useState(goal.targetMonth)
  const [error, setError] = useState('')

  function startEditing() {
    // Заполняем форму текущими значениями цели.
    setTitle(goal.title)
    setAmount(String(goal.targetAmount))
    setMonth(goal.targetMonth)
    setError('')
    setEditing(true)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault() // не даём браузеру перезагрузить страницу
    const targetAmount = Number(amount)
    if (!title.trim()) return setError('Введите название цели')
    if (!(targetAmount > 0)) return setError('Сумма должна быть больше нуля')
    if (!month) return setError('Выберите месяц')
    onChange({ title: title.trim(), targetAmount, targetMonth: month })
    setEditing(false)
  }

  if (!editing) {
    return (
      <Card
        title={goal.title}
        subtitle={`Цель: ${formatMoney(goal.targetAmount)} · срок: ${formatMonth(goal.targetMonth)}`}
        actions={
          <Button variant="text" size="sm" icon={<Pencil size={14} />} onClick={startEditing}>
            Изменить
          </Button>
        }
      />
    )
  }

  return (
    <Card title="Цель">
      <form onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <Input label="Название" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label="Сумма, ₽"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Месяц цели"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.buttons}>
          <Button type="submit" variant="primary">
            Сохранить
          </Button>
          <Button variant="text" onClick={() => setEditing(false)}>
            Отмена
          </Button>
        </div>
      </form>
    </Card>
  )
}
