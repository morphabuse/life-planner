// Смена сегодня или завтра и подсказка по сну (логика — из «Смен»).
import { BedDouble } from 'lucide-react'
import type { ShiftsData } from '../../types'
import { Card } from '../../components/ui'
import { addDays, formatDayLong, formatDayShort } from '../../utils/date'
import { SHIFT_HOURS, sleepTips } from '../shifts/sleep'
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

  const { date, when } = focus

  return (
    <Card
      compact
      title={when === 'today' ? 'Сегодня смена' : 'Завтра смена'}
      subtitle={`${SHIFT_HOURS}, до утра ${formatDayShort(addDays(date, 1))}`}
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
