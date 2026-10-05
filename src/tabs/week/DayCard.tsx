// Карточка одного дня недели: смена (если есть) и список задач.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Moon, Plus, X } from 'lucide-react'
import type { DayEntry, Task } from '../../types'
import { Badge, Button, Card, Input } from '../../components/ui'
import { formatDayLong } from '../../utils/date'
// Логику смен не дублируем — берём из вкладки «Смены».
import { STATUS_LABELS } from '../shifts/schedule'
import styles from './WeekTab.module.css'

interface Props {
  date: string
  isToday: boolean
  shift: DayEntry | undefined // отметка дня из «Смен» (или undefined — не отмечен)
  tasks: Task[]
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

// Цветная полоса слева у карточки — только для смены и «не вышел».
const STRIPE_CLASS = {
  shift: styles.stripeShift,
  missed: styles.stripeMissed,
  leave: '',
  off: '',
}

export function DayCard({ date, isToday, shift, tasks, onAdd, onToggle, onDelete }: Props) {
  const [text, setText] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    onAdd(text.trim())
    setText('')
  }

  // 'понедельник, 5 октября' → 'Понедельник, 5 октября'
  const day = formatDayLong(date)
  const title = day[0].toUpperCase() + day.slice(1)

  return (
    <Card
      compact
      className={[shift && STRIPE_CLASS[shift.status], isToday && styles.today]
        .filter(Boolean)
        .join(' ')}
      title={
        <span className={styles.dayTitle}>
          {title}
          {isToday && <Badge tone="accent">сегодня</Badge>}
        </span>
      }
      actions={
        shift && (
          <Badge
            tone={shift.status}
            icon={shift.status === 'shift' ? <Moon size={13} /> : undefined}
          >
            {STATUS_LABELS[shift.status]}
          </Badge>
        )
      }
    >
      {tasks.length > 0 && (
        <ul className={styles.tasks}>
          {tasks.map((task) => (
            <li key={task.id} className={styles.task}>
              <label className={styles.taskLabel}>
                <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
                <span className={task.done ? styles.taskDone : undefined}>{task.text}</span>
              </label>
              <Button
                variant="text"
                size="sm"
                iconOnly
                danger
                icon={<X size={16} />}
                onClick={() => onDelete(task.id)}
                aria-label={`Удалить задачу «${task.text}»`}
              />
            </li>
          ))}
        </ul>
      )}

      <form className={styles.addForm} onSubmit={handleSubmit}>
        <Input
          className={styles.addInput}
          placeholder="Новая задача…"
          aria-label={`Новая задача на ${day}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" size="sm" icon={<Plus size={16} />} disabled={!text.trim()}>
          Добавить
        </Button>
      </form>
    </Card>
  )
}
