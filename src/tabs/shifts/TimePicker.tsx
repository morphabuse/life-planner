// Выбор времени смены: быстрые варианты + «своё время» двумя полями.
import type { ShiftTime } from '../../types'
import { Button, Input } from '../../components/ui'
import { TIME_PRESETS, endsNextDay, formatTime, sameTime } from '../../utils/shiftTime'
import styles from './ShiftsTab.module.css'

interface Props {
  value: ShiftTime
  onChange: (time: ShiftTime) => void
}

export function TimePicker({ value, onChange }: Props) {
  return (
    <div className={styles.timePicker}>
      <div className={styles.presets}>
        {TIME_PRESETS.map((preset) => (
          <Button
            key={formatTime(preset)}
            size="sm"
            aria-pressed={sameTime(preset, value)}
            onClick={() => onChange(preset)}
          >
            {formatTime(preset)}
          </Button>
        ))}
      </div>

      <div className={styles.customTime}>
        <span className={styles.caption}>Своё время:</span>
        {/* Пустое значение (поле стёрли) игнорируем — время смены не может быть пустым. */}
        <Input
          type="time"
          aria-label="Начало смены"
          value={value.start}
          onChange={(e) => e.target.value && onChange({ ...value, start: e.target.value })}
        />
        <span className={styles.caption}>–</span>
        <Input
          type="time"
          aria-label="Конец смены"
          value={value.end}
          onChange={(e) => e.target.value && onChange({ ...value, end: e.target.value })}
        />
        {endsNextDay(value) && <span className={styles.caption}>до следующего дня</span>}
      </div>
    </div>
  )
}
