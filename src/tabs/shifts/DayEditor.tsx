// Панель отметки выбранного дня: статус (смена, не вышел, отгул, выходной).
import { X } from 'lucide-react'
import type { DayEntry, DayStatus } from '../../types'
import { Button, Card, StatusDot } from '../../components/ui'
import { formatDayLong } from '../../utils/date'
import { STATUS_LABELS } from './schedule'
import styles from './ShiftsTab.module.css'

const STATUSES: DayStatus[] = ['shift', 'missed', 'leave', 'off']

interface Props {
  date: string
  entry: DayEntry | undefined
  onChange: (entry: DayEntry | null) => void // null — очистить день
  onClose: () => void
}

export function DayEditor({ date, entry, onChange, onClose }: Props) {
  const description = entry ? STATUS_LABELS[entry.status] : 'День не отмечен — смены нет.'

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
            onClick={() => onChange({ status })}
          >
            {STATUS_LABELS[status]}
          </Button>
        ))}
        <Button variant="text" size="sm" onClick={() => onChange(null)} disabled={!entry}>
          Очистить
        </Button>
      </div>

    </Card>
  )
}
