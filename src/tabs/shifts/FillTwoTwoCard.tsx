// Помощник «Заполнить 2/2»: один раз проставляет смены в диапазоне дат,
// уже отмеченные дни не трогает.
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ShiftTime } from '../../types'
import { Button, Card, Input } from '../../components/ui'
import { addDays, daysBetween } from '../../utils/date'
import { DEFAULT_SHIFT_TIME } from '../../utils/shiftTime'
import { FILL_MAX_DAYS } from './schedule'
import type { FillResult } from './schedule'
import { TimePicker } from './TimePicker'
import styles from './ShiftsTab.module.css'

interface Props {
  today: string
  onFill: (from: string, to: string, time: ShiftTime) => FillResult
}

export function FillTwoTwoCard({ today, onFill }: Props) {
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(() => addDays(today, 30))
  const [time, setTime] = useState<ShiftTime>(DEFAULT_SHIFT_TIME)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!from || !to) return setMessage({ kind: 'error', text: 'Укажи обе даты' })
    if (to < from) return setMessage({ kind: 'error', text: '«По» должна быть не раньше «с»' })
    if (daysBetween(from, to) >= FILL_MAX_DAYS) {
      return setMessage({ kind: 'error', text: 'Не больше года за раз' })
    }

    const { added, skipped } = onFill(from, to, time)
    let text = `Проставлено смен: ${added}.`
    if (skipped > 0) text += ` Уже отмеченных дней не тронуто: ${skipped}.`
    setMessage({ kind: 'ok', text })
  }

  return (
    <Card
      title="Помощник: заполнить 2/2"
      subtitle="Ставит смены по схеме «2 дня смена, 2 дня нет», начиная с первой даты. Уже отмеченные дни (смены, отгулы, выходные) не меняет."
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.fillRow}>
          <Input label="С даты" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="По дату" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <TimePicker value={time} onChange={setTime} />
        <div className={styles.fillActions}>
          <Button type="submit" variant="primary">
            Заполнить
          </Button>
          {message && (
            <span
              className={message.kind === 'ok' ? styles.okText : styles.errorText}
              role="status"
            >
              {message.text}
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}
