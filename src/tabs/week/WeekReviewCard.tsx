// Карточка «Итог недели»: смены, деньги, задачи, привычки и два поля для мыслей.
import { X } from 'lucide-react'
import type { WeekReview } from '../../types'
import { Button, Card, Textarea } from '../../components/ui'
import { formatMoney, plural } from '../money/format'
import type { WeekSummary } from './weekSummary'
import styles from './WeekTab.module.css'

interface Props {
  summary: WeekSummary
  review: WeekReview
  onChange: (review: WeekReview) => void
  onClose: () => void
}

const shiftsWord = (n: number) => plural(n, 'смена', 'смены', 'смен')
const daysWord = (n: number) => plural(n, 'день', 'дня', 'дней')

export function WeekReviewCard({ summary: s, review, onChange, onClose }: Props) {
  return (
    <Card
      title="Итог недели"
      actions={
        <Button
          variant="text"
          size="sm"
          iconOnly
          icon={<X size={18} />}
          aria-label="Скрыть итог недели"
          onClick={onClose}
        />
      }
    >
      <div className={styles.reviewGrid}>
        <div className={styles.reviewBlock}>
          <div className={styles.reviewLabel}>Смены</div>
          <div className={styles.reviewValue}>
            Отработано {s.worked} · пропущено {s.missed}
          </div>
          <div className={styles.caption}>
            {s.worked > 0 ? `≈ ${formatMoney(s.earned)} по цене смены` : 'Отработанных смен нет'}
          </div>
          {s.missed > 0 && (
            <div className={styles.caption}>
              Пропуски — −{formatMoney(s.lost.total)}, из них −{formatMoney(s.lost.turkey)} на Турцию
            </div>
          )}
        </div>

        <div className={styles.reviewBlock}>
          <div className={styles.reviewLabel}>Деньги</div>
          <div className={styles.reviewValue}>Доход: {formatMoney(s.income)}</div>
          <div className={styles.caption}>
            {s.income > 0 ? 'за смены этой недели' : 'дохода за смены этой недели нет'}
          </div>
          <div className={styles.caption}>
            {s.saved >= 0 ? `На «Турцию»: +${formatMoney(s.saved)}` : `С «Турции» снято: ${formatMoney(-s.saved)}`}
          </div>
        </div>

        <div className={styles.reviewBlock}>
          <div className={styles.reviewLabel}>Задачи</div>
          <div className={styles.reviewValue}>
            {s.tasksTotal > 0 ? `Выполнено ${s.tasksDone} из ${s.tasksTotal}` : 'Задач не было'}
          </div>
        </div>

        <div className={styles.reviewBlock}>
          <div className={styles.reviewLabel}>Привычки</div>
          <ul className={styles.reviewHabits}>
            {s.habits.map((h) => (
              <li key={h.name}>
                <span className={styles.reviewHabitName}>{h.name}</span>
                <span className={styles.caption}>
                  {h.unit === 'day' ? `${h.days} из 7` : `${h.days} ${shiftsWord(h.days)}`}
                  {' · '}
                  {h.streak.current > 0
                    ? `серия ${h.streak.current} ${h.unit === 'day' ? daysWord(h.streak.current) : shiftsWord(h.streak.current)}`
                    : 'новая серия'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.reviewNotes}>
        <Textarea
          label="Что получилось"
          value={review.good}
          onChange={(e) => onChange({ ...review, good: e.target.value })}
        />
        <Textarea
          label="Что мешало"
          value={review.bad}
          onChange={(e) => onChange({ ...review, bad: e.target.value })}
        />
      </div>
    </Card>
  )
}
