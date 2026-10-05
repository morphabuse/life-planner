// Смена сегодня или завтра: время и подсказка по сну (логика — из «Смен»).
import { BedDouble } from 'lucide-react'
import type { ShiftsData } from '../../types'
import { Card } from '../../components/ui'
import { addDays, formatDayLong, formatDayShort } from '../../utils/date'
import { endsNextDay, formatTime } from '../../utils/shiftTime'
import { sleepTips } from '../shifts/sleep'
import type { ShiftFocus } from './todayLogic'
import styles from './TodayTab.module.css'

interface Props {
  focus: ShiftFocus
  shifts: ShiftsData
}

export function TodayShiftCard({ focus, shifts }: Props) {
  if (focus.kind === 'none') {
    return <Card compact title="Смена" subtitle="Смен впереди не отмечено — их можно отметить во вкладке «Смены»." />
  }
  if (focus.kind === 'later') {
    return (
      <Card
        compact
        title="Сегодня и завтра смен нет"
        subtitle={`Ближайшая — ${formatDayLong(focus.date)}`}
      />
    )
  }

  const { date, when, time } = focus
  // Если смена кончается на следующий день — уточняем, какого числа.
  const ends = endsNextDay(time) ? `, до ${time.end} ${formatDayShort(addDays(date, 1))}` : ''

  return (
    <Card
      compact
      title={when === 'today' ? 'Сегодня смена' : 'Завтра смена'}
      subtitle={`${formatTime(time)}${ends}`}
    >
      <div className={styles.sleepTitle}>
        <BedDouble size={16} aria-hidden="true" />
        Сон
      </div>
      <ul className={styles.sleepList}>
        {sleepTips(date, shifts).map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </Card>
  )
}
