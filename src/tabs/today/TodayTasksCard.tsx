// Задачи на сегодня — те же, что в «Неделе» за этот день: галочки и быстрое добавление.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import type { Task } from '../../types'
import { Button, Card, Input } from '../../components/ui'
import styles from './TodayTab.module.css'

interface Props {
  tasks: Task[]
  onAdd: (text: string) => void
  onToggle: (id: string) => void
}

export function TodayTasksCard({ tasks, onAdd, onToggle }: Props) {
  const [text, setText] = useState('')
  const done = tasks.filter((t) => t.done).length

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    onAdd(text.trim())
    setText('')
  }

  return (
    <Card
      compact
      title="Задачи на сегодня"
      subtitle={tasks.length > 0 ? `Выполнено ${done} из ${tasks.length}` : 'Пока пусто — добавь первую'}
    >
      {tasks.length > 0 && (
        <ul className={styles.tasks}>
          {tasks.map((task) => (
            <li key={task.id}>
              <label className={styles.task}>
                <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
                <span className={task.done ? styles.taskDone : undefined}>{task.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <form className={styles.addForm} onSubmit={handleSubmit}>
        <Input
          className={styles.addInput}
          placeholder="Новая задача…"
          aria-label="Новая задача на сегодня"
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
