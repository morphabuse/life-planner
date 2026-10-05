// Вкладка «Привычки»: активные привычки с сериями и сеткой за 8 недель,
// автопривычка «Смены без пропусков», добавление и архив.
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import type { HabitsData } from '../../types'
import { loadHabits, saveHabits } from '../../storage/habitsStorage'
import { loadShifts } from '../../storage/shiftsStorage'
import { Button, Card, Collapsible, Input } from '../../components/ui'
import { todayIso } from '../../utils/date'
import {
  AUTO_SHIFTS_NAME,
  addHabit,
  dayStreak,
  isMarked,
  renameHabit,
  setArchived,
  shiftStreak,
  toggleMark,
  workedShiftDates,
} from './habitsLogic'
import { HabitCard } from './HabitCard'
import styles from './HabitsTab.module.css'

export function HabitsTab() {
  const [data, setData] = useState<HabitsData>(loadHabits)
  const [shifts] = useState(loadShifts) // смены только читаем
  const [today] = useState(todayIso)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    saveHabits(data)
  }, [data])

  const active = data.habits.filter((h) => !h.archived)
  const archived = data.habits.filter((h) => h.archived)
  const worked = new Set(workedShiftDates(shifts, today))

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    setData((prev) => addHabit(prev, newName.trim(), crypto.randomUUID()))
    setNewName('')
  }

  return (
    <section className={styles.habits}>
      <h2 className={styles.title}>Привычки</h2>

      {active.map((habit) => (
        <HabitCard
          key={habit.id}
          name={habit.name}
          streak={dayStreak(data.marks[habit.id] ?? [], today)}
          today={today}
          isDone={(date) => isMarked(data, habit.id, date)}
          onToggle={(date) => setData((prev) => toggleMark(prev, habit.id, date))}
          onRename={(name) => setData((prev) => renameHabit(prev, habit.id, name))}
          onArchive={() => setData((prev) => setArchived(prev, habit.id, true))}
        />
      ))}

      <HabitCard
        auto
        name={AUTO_SHIFTS_NAME}
        streak={shiftStreak(shifts, today)}
        today={today}
        isDone={(date) => worked.has(date)}
      />

      <Card compact title="Новая привычка">
        <form className={styles.addForm} onSubmit={handleAdd}>
          <Input
            className={styles.addInput}
            placeholder="Например, «Зарядка»"
            aria-label="Название новой привычки"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" size="sm" icon={<Plus size={16} />} disabled={!newName.trim()}>
            Добавить
          </Button>
        </form>
      </Card>

      {archived.length > 0 && (
        <Collapsible title={`Архив (${archived.length})`} subtitle="Отметки сохранены — привычку можно вернуть">
          <ul className={styles.archive}>
            {archived.map((habit) => (
              <li key={habit.id} className={styles.archiveRow}>
                <span>{habit.name}</span>
                <Button
                  variant="text"
                  size="sm"
                  icon={<RotateCcw size={14} />}
                  onClick={() => setData((prev) => setArchived(prev, habit.id, false))}
                >
                  Вернуть
                </Button>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}
    </section>
  )
}
