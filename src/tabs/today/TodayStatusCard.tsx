// Статус дня и что дальше: «Завтра смена» или «Ближайшая смена — …».
import type { DayStatus } from '../../types'
import { Card } from '../../components/ui'
import { formatDayLong } from '../../utils/date'
import { SHIFT_HOURS } from '../shifts/schedule'
import type { ShiftFocus } from './todayLogic'

interface Props {
  status: DayStatus | null // сегодняшний статус
  focus: ShiftFocus
}

const STATUS_TITLE: Record<DayStatus, string> = {
  shift: `Сегодня смена ${SHIFT_HOURS}`,
  missed: 'Сегодня — «не вышел»',
  leave: 'Сегодня отгул',
  off: 'Сегодня выходной',
}

export function TodayStatusCard({ status, focus }: Props) {
  const title = status ? STATUS_TITLE[status] : 'Сегодня смены нет'

  // Подзаголовок — что дальше.
  let subtitle: string
  if (focus.kind === 'shift' && focus.when === 'tomorrow') subtitle = `Завтра смена ${SHIFT_HOURS}`
  else if (focus.kind === 'shift') subtitle = 'Ночная смена, до 10:00 утра'
  else if (focus.kind === 'later') subtitle = `Ближайшая смена — ${formatDayLong(focus.date)}`
  else subtitle = 'Смен впереди не отмечено — их можно отметить во вкладке «Смены»'

  return <Card compact title={title} subtitle={subtitle} />
}
