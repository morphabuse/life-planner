// Карточка «Ближайшая смена» с подсказкой по сну.
import { BedDouble } from 'lucide-react'
import type { ShiftsData } from '../../types'
import { Card } from '../../components/ui'
import { addDays, daysBetween, formatDayLong, formatDayShort } from '../../utils/date'
import { SHIFT_HOURS } from './sleep'
import { sleepTips } from './sleep'
import styles from './ShiftsTab.module.css'

interface Props {
  nextShift: string | null // дата ближайшей смены или null
  data: ShiftsData
  today: string
}

export function NextShiftCard({ nextShift, data, today }: Props) {
  const entry = nextShift ? data.days[nextShift] : undefined
  if (nextShift === null || entry?.status !== 'shift') {
    return (
      <Card
        title="Ближайшая смена"
        subtitle="Смен впереди не отмечено. Нажми на день в календаре или заполни 2/2 помощником ниже."
      />
    )
  }

  // «сегодня» / «завтра» / «через 3 дн.»
  const inDays = daysBetween(today, nextShift)
  const when = inDays === 0 ? 'сегодня' : inDays === 1 ? 'завтра' : `через ${inDays} дн.`
  const dayTitle = formatDayLong(nextShift)

  return (
    <Card title="Ближайшая смена">
      <p className={styles.nextDate}>
        {dayTitle[0].toUpperCase() + dayTitle.slice(1)}
        <span className={styles.nextWhen}> · {when}</span>
      </p>
      <p className={styles.caption}>
        Смена {SHIFT_HOURS}, до утра {formatDayShort(addDays(nextShift, 1))}
      </p>

      <div className={styles.sleep}>
        <div className={styles.sleepTitle}>
          <BedDouble size={16} aria-hidden="true" />
          Сон
        </div>
        <ul className={styles.sleepList}>
          {sleepTips(nextShift, data).map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
