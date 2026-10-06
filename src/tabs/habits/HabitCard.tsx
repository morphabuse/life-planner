// Карточка одной привычки: серия и рекорд, отметка за сегодня, сетка за 8 недель,
// переименование и архив. Для автопривычки (смены) — только чтение и вместо сетки
// своя полоска (replaceGrid).
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Archive, Check, Pencil } from 'lucide-react'
import { Badge, Button, Card, Input } from '../../components/ui'
import { streakText } from './habitsLogic'
import type { Streak } from './habitsLogic'
import { HabitGrid } from './HabitGrid'
import styles from './HabitsTab.module.css'

interface Props {
  name: string
  streak: Streak
  today: string
  isDone: (date: string) => boolean
  auto?: boolean // автопривычка: вручную не отмечается
  onToggle?: (date: string) => void
  onRename?: (name: string) => void
  onArchive?: () => void
  replaceGrid?: ReactNode // показать это вместо сетки за 8 недель
}

export function HabitCard({ name, streak, today, isDone, auto, onToggle, onRename, onArchive, replaceGrid }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  function handleRename(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim()) return
    onRename?.(draft.trim())
    setEditing(false)
  }

  const doneToday = isDone(today)

  return (
    <Card
      compact
      title={
        editing ? undefined : (
          <span className={styles.habitTitle}>
            {name}
            {auto && <Badge>считается сама</Badge>}
          </span>
        )
      }
      subtitle={editing ? undefined : streakText(streak, auto ? 'shift' : 'day')}
      actions={
        !auto &&
        !editing && (
          <>
            <Button
              size="sm"
              icon={<Check size={16} />}
              aria-pressed={doneToday}
              onClick={() => onToggle?.(today)}
            >
              {doneToday ? 'Сегодня — да' : 'Отметить сегодня'}
            </Button>
            <Button
              variant="text"
              size="sm"
              iconOnly
              icon={<Pencil size={16} />}
              aria-label={`Переименовать «${name}»`}
              title="Переименовать"
              onClick={() => {
                setDraft(name)
                setEditing(true)
              }}
            />
            <Button
              variant="text"
              size="sm"
              iconOnly
              icon={<Archive size={16} />}
              aria-label={`Убрать «${name}» в архив`}
              title="В архив"
              onClick={onArchive}
            />
          </>
        )
      }
    >
      {editing && (
        <form className={styles.renameForm} onSubmit={handleRename}>
          <Input
            className={styles.renameInput}
            aria-label="Новое название привычки"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <Button type="submit" size="sm" variant="primary" disabled={!draft.trim()}>
            Сохранить
          </Button>
          <Button size="sm" variant="text" onClick={() => setEditing(false)}>
            Отмена
          </Button>
        </form>
      )}
      {replaceGrid ?? (
        <HabitGrid today={today} isDone={isDone} onToggle={auto ? undefined : onToggle} label={name} />
      )}
    </Card>
  )
}
