// Карточка смены: статус дня и что дальше, справа крупно «X / Y смен за неделю»,
// под ней мини-неделя квадратиками и строка «Отработано N · впереди M · пропусков K».
import { CircleAlert } from 'lucide-react'
import type { DayStatus, ShiftsData } from '../../types'
import { Card } from '../../components/ui'
import { formatDayLong } from '../../utils/date'
import { SHIFT_HOURS } from '../shifts/schedule'
import { plural } from '../money/format'
import type { ShiftFocus, WeekShiftStats } from './todayLogic'
import { TodayWeekStrip } from './TodayWeekStrip'
import styles from './TodayTab.module.css'

interface Props {
  status: DayStatus | null // сегодняшний статус
  focus: ShiftFocus
  week: WeekShiftStats // смены текущей недели
  today: string
  shifts: ShiftsData
}

const STATUS_TITLE: Record<DayStatus, string> = {
  shift: `Сегодня смена ${SHIFT_HOURS}`,
  missed: 'Сегодня — «не вышел»',
  leave: 'Сегодня отгул',
  off: 'Сегодня выходной',
}

export function TodayStatusCard({ status, focus, week, today, shifts }: Props) {
  const title = status ? STATUS_TITLE[status] : 'Сегодня смены нет'

  // Подзаголовок — что дальше.
  let subtitle: string
  if (focus.kind === 'shift' && focus.when === 'tomorrow') subtitle = `Завтра смена ${SHIFT_HOURS}`
  else if (focus.kind === 'shift') subtitle = 'Ночная смена, до 10:00 утра'
  else if (focus.kind === 'later') subtitle = `Ближайшая смена — ${formatDayLong(focus.date)}`
  else subtitle = 'Смен впереди не отмечено — их можно отметить во вкладке «Смены»'

  return (
    <Card compact>
      {/* Своя шапка в две колонки: слева статус и что дальше, справа счётчик недели.
          (У обычной шапки Card действия на узком экране уходят на новую строку.) */}
      <div className={styles.shiftHeader}>
        <div className={styles.shiftHeadings}>
          <h2 className={styles.shiftTitle}>{title}</h2>
          <p className={styles.caption}>{subtitle}</p>
        </div>
        <div className={styles.weekCount}>
          <span className={styles.weekCountValue}>
            {week.worked} / {week.total}
          </span>
          <span className={styles.caption}>{plural(week.total, 'смена', 'смены', 'смен')} за неделю</span>
        </div>
      </div>
      <TodayWeekStrip today={today} shifts={shifts} />
      <p className={styles.weekStats}>
        Отработано {week.worked} · впереди {week.planned} ·{' '}
        <span className={week.missed > 0 ? styles.weekMissed : undefined}>
          {/* Пропуски — не только цветом: значок «!». */}
          {week.missed > 0 && <CircleAlert size={14} aria-hidden="true" />}
          пропусков {week.missed}
        </span>
      </p>
    </Card>
  )
}
