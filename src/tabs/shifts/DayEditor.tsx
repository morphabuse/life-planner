// Панель отметки выбранного дня: статус и время смены.
import { X } from 'lucide-react'
import type { DayEntry, DayStatus } from '../../types'
import { Button, Card, StatusDot } from '../../components/ui'
import { formatDayLong } from '../../utils/date'
import { DEFAULT_SHIFT_TIME, formatTime } from '../../utils/shiftTime'
import { STATUS_LABELS, hasTime } from './schedule'
import { TimePicker } from './TimePicker'
import styles from './ShiftsTab.module.css'

const STATUSES: DayStatus[] = ['shift', 'missed', 'leave', 'off']

interface Props {
  date: string
  entry: DayEntry | undefined
  onChange: (entry: DayEntry | null) => void // null — очистить день
  onClose: () => void
}

export function DayEditor({ date, entry, onChange, onClose }: Props) {
  function chooseStatus(status: DayStatus) {
    if (status === 'shift' || status === 'missed') {
      // Время сохраняем, если оно уже было (например, смена → «не вышел»).
      const time = entry && hasTime(entry) ? entry.time : DEFAULT_SHIFT_TIME
      onChange({ status, time })
    } else {
      onChange({ status })
    }
  }

  let description = 'День не отмечен — смены нет.'
  if (entry) {
    description = STATUS_LABELS[entry.status]
    if (hasTime(entry)) description += `, ${formatTime(entry.time)}`
  }

  const title = formatDayLong(date)

  return (
    <Card
      title={title[0].toUpperCase() + title.slice(1)}
      subtitle={description}
      actions={
        <Button
          variant="text"
          size="sm"
          iconOnly
          icon={<X size={18} />}
          aria-label="Закрыть"
          onClick={onClose}
        />
      }
    >
      <div className={styles.statusButtons}>
        {STATUSES.map((status) => (
          <Button
            key={status}
            size="sm"
            icon={<StatusDot tone={status} />}
            aria-pressed={entry?.status === status}
            onClick={() => chooseStatus(status)}
          >
            {STATUS_LABELS[status]}
          </Button>
        ))}
        <Button variant="text" size="sm" onClick={() => onChange(null)} disabled={!entry}>
          Очистить
        </Button>
      </div>

      {/* Время показываем только для смены и «не вышел». */}
      {entry && hasTime(entry) && (
        <TimePicker
          value={entry.time}
          onChange={(time) => onChange({ status: entry.status, time })}
        />
      )}
    </Card>
  )
}
