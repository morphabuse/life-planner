// Привычки на сегодня: отметка в один клик. Автопривычка «Смены без пропусков» —
// серия и полоска из 14 квадратиков за 2 недели (считается сама из «Смен»).
import { Check, Circle } from 'lucide-react'
import type { Habit, ShiftsData } from '../../types'
import { Button, Card } from '../../components/ui'
import { AUTO_SHIFTS_NAME, streakText } from '../habits/habitsLogic'
import type { Streak } from '../habits/habitsLogic'
import type { BestStreak } from './todayLogic'
import { ShiftStreakStrip } from '../habits/ShiftStreakStrip'
import { plural } from '../money/format'
import styles from '../habits/HabitsTab.module.css'

// «Серия: 3 смены» → «серия: 3 смены» — после тире с маленькой буквы.
const lowerFirst = (text: string) => text[0].toLowerCase() + text.slice(1)

interface Props {
  habits: Habit[] // активные (не в архиве)
  isDoneToday: (id: string) => boolean
  streakOf: (id: string) => Streak
  shiftStreak: Streak
  shifts: ShiftsData // для полоски серии смен
  today: string
  onToggle: (id: string) => void
  best: BestStreak | null // лучшая текущая серия
}

export function TodayHabitsCard({ habits, isDoneToday, streakOf, shiftStreak, shifts, today, onToggle, best }: Props) {
  const done = habits.filter((h) => isDoneToday(h.id)).length

  return (
    <Card
      compact
      title="Привычки"
      subtitle={
        (habits.length > 0 ? `Сегодня ${done} из ${habits.length}` : 'Добавь привычки во вкладке «Привычки»') +
        (best
          ? ` · лучшая серия: ${best.name} — ${best.current} ${best.unit === 'day' ? plural(best.current, 'день', 'дня', 'дней') : plural(best.current, 'смена', 'смены', 'смен')}`
          : '')
      }
    >
      <ul className={styles.todayList}>
        {habits.map((habit) => {
          const doneToday = isDoneToday(habit.id)
          const streak = streakOf(habit.id)
          return (
            <li key={habit.id} className={styles.todayRow}>
              <Button
                size="sm"
                className={styles.todayButton}
                icon={doneToday ? <Check size={16} /> : <Circle size={16} />}
                aria-pressed={doneToday}
                onClick={() => onToggle(habit.id)}
              >
                {habit.name}
              </Button>
              <span className={styles.todayStreak}>
                {streak.current > 0 ? `${streak.current} подряд` : 'новая серия'}
              </span>
            </li>
          )
        })}
        {/* Автопривычка — строка текста (переносится на узком экране) и полоска смен. */}
        <li className={styles.todayAuto}>
          <span>
            {AUTO_SHIFTS_NAME} — {lowerFirst(streakText(shiftStreak, 'shift'))}
          </span>
          <ShiftStreakStrip shifts={shifts} today={today} />
        </li>
      </ul>
    </Card>
  )
}
