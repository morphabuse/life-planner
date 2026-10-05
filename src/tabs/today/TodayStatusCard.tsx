// Статус дня и план сна. Сон показывается, если смена сегодня или завтра
// (логика сна — из «Смен», по стандартной ночи 22:00–10:00).
import { BedDouble } from 'lucide-react'
import type { DayStatus, ShiftsData } from '../../types'
import { Card } from '../../components/ui'
import { formatDayLong } from '../../utils/date'
import { SHIFT_HOURS, sleepTips } from '../shifts/sleep'
import type { ShiftFocus } from './todayLogic'
import styles from './TodayTab.module.css'

interface Props {
  status: DayStatus | null // сегодняшний статус
  focus: ShiftFocus
  shifts: ShiftsData
}

const STATUS_TITLE: Record<DayStatus, string> = {
  shift: `Сегодня смена ${SHIFT_HOURS}`,
  missed: 'Сегодня — «не вышел»',
  leave: 'Сегодня отгул',
  off: 'Сегодня выходной',
}

export function TodayStatusCard({ status, focus, shifts }: Props) {
  const title = status ? STATUS_TITLE[status] : 'Сегодня смены нет'

  // Подзаголовок — что дальше.
  let subtitle: string
  if (focus.kind === 'shift' && focus.when === 'tomorrow') subtitle = `Завтра смена ${SHIFT_HOURS}`
  else if (focus.kind === 'shift') subtitle = 'Ночная смена, до 10:00 утра'
  else if (focus.kind === 'later') subtitle = `Ближайшая смена — ${formatDayLong(focus.date)}`
  else subtitle = 'Смен впереди не отмечено — их можно отметить во вкладке «Смены»'

  return (
    <Card compact title={title} subtitle={subtitle}>
      {focus.kind === 'shift' && (
        <>
          <div className={styles.sleepTitle}>
            <BedDouble size={16} aria-hidden="true" />
            Сон {focus.when === 'today' ? 'перед сменой' : 'перед завтрашней сменой'}
          </div>
          <ul className={styles.sleepList}>
            {sleepTips(focus.date, shifts).map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
