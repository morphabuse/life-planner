// Помощник «Заполнить 2/2»: один раз проставляет смены в диапазоне дат,
// уже отмеченные дни не трогает. Последнее заполнение можно отменить:
// убираются только дни, которые оно проставило (и только если там всё ещё «смена»).
// Выбрал день в календаре — он становится «С даты» (первым днём смены),
// а «По дату» — +1 месяц от него, если её не меняли вручную.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Undo2 } from 'lucide-react'
import type { FillRecord } from '../../types'
import { Button, Card, Input } from '../../components/ui'
import { addMonths, daysBetween, formatDayShort } from '../../utils/date'
import { FILL_MAX_DAYS } from './schedule'
import type { FillResult, UndoResult } from './schedule'
import { plural } from '../money/format'
import styles from './ShiftsTab.module.css'

interface Props {
  today: string
  selected: string | null // день, выбранный в календаре
  lastFill: FillRecord | undefined // последнее заполнение (хранится в данных смен)
  onFill: (from: string, to: string) => FillResult
  onUndo: () => UndoResult
}

type Message = { kind: 'ok' | 'error'; text: string }

export function FillTwoTwoCard({ today, selected, lastFill, onFill, onUndo }: Props) {
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(() => addMonths(today, 1))
  // Меняли ли «По дату» руками — тогда выбор дня в календаре её не переписывает.
  const [toTouched, setToTouched] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  // Выбрали день в календаре → «С даты» = этот день, «По дату» = +1 месяц.
  // Приём React «подстроить состояние при смене пропса»: запоминаем прошлый выбранный
  // день и, если он поменялся, обновляем поля прямо во время отрисовки (без useEffect —
  // так нет лишней перерисовки со старыми датами).
  const [prevSelected, setPrevSelected] = useState(selected)
  if (selected !== prevSelected) {
    setPrevSelected(selected)
    if (selected) {
      setFrom(selected)
      if (!toTouched) setTo(addMonths(selected, 1))
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!from || !to) return setMessage({ kind: 'error', text: 'Укажи обе даты' })
    if (to < from) return setMessage({ kind: 'error', text: '«По» должна быть не раньше «с»' })
    if (daysBetween(from, to) >= FILL_MAX_DAYS) {
      return setMessage({ kind: 'error', text: 'Не больше года за раз' })
    }

    const { added, skipped } = onFill(from, to)
    let text = `Проставлено смен: ${added}.`
    if (skipped > 0) text += ` Уже отмеченных дней не тронуто: ${skipped}.`
    setMessage({ kind: 'ok', text })
  }

  function handleUndo() {
    const { removed, kept } = onUndo()
    let text = `Отменено: убрано смен ${removed}.`
    if (kept > 0) text += ` Изменённых вручную дней оставлено: ${kept}.`
    setMessage({ kind: 'ok', text })
  }

  // Что показать рядом с кнопками: свежее сообщение или (после перезагрузки) последнее заполнение.
  const fillInfo =
    message?.text ??
    (lastFill
      ? `Последнее заполнение: ${formatDayShort(lastFill.from)} – ${formatDayShort(lastFill.to)}, ` +
        `${lastFill.dates.length} ${plural(lastFill.dates.length, 'смена', 'смены', 'смен')}.`
      : null)
  const infoClass = message?.kind === 'error' ? styles.errorText : message ? styles.okText : styles.caption

  return (
    <Card
      title="Помощник: заполнить 2/2"
      subtitle="Ставит смены по схеме «2 дня смена, 2 дня нет», первая дата — первый день смены. Уже отмеченные дни (смены, отгулы, выходные) не меняет."
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.fillRow}>
          <Input
            label="С даты"
            type="date"
            value={from}
            hint={selected && from === selected ? 'с выбранного дня' : undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="По дату"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setToTouched(true)
            }}
          />
        </div>
        <div className={styles.fillActions}>
          <Button type="submit" variant="primary">
            Заполнить
          </Button>
          {fillInfo && (
            <span className={infoClass} role="status">
              {fillInfo}
            </span>
          )}
          {/* Отмена — пока есть запись о последнем заполнении (переживает перезагрузку). */}
          {lastFill && (
            <Button variant="secondary" icon={<Undo2 size={16} />} onClick={handleUndo}>
              Отменить
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
