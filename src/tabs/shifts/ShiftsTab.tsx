// Вкладка «Смены»: ближайшая смена, календарь месяца
// с ручной отметкой дней, итоги месяца и помощник «Заполнить 2/2».
import { useEffect, useState } from 'react'
import type { DayEntry, ShiftsData } from '../../types'
import { loadShifts, saveShifts } from '../../storage/shiftsStorage'
import { loadMoney } from '../../storage/moneyStorage'
// Денежную логику не дублируем — берём из вкладки «Деньги».
import { averagePerShift, missedCost, monthIncome, monthPrefix } from '../money/moneyLogic'
import { formatMoney } from '../money/format'
import { ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { todayIso } from '../../utils/date'
import { fillTwoTwo, findNextShift, monthStats, setDay } from './schedule'
import { NextShiftCard } from './NextShiftCard'
import { MonthCalendar } from './MonthCalendar'
import { DayEditor } from './DayEditor'
import { FillTwoTwoCard } from './FillTwoTwoCard'
import { DayLegend } from './DayLegend'
import styles from './ShiftsTab.module.css'

// 'октябрь' + 2026 → 'Октябрь 2026'
function monthTitle(year: number, monthIndex: number): string {
  const text = new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('ru-RU', {
    month: 'long',
    timeZone: 'UTC',
  })
  return `${text[0].toUpperCase()}${text.slice(1)} ${year}`
}

export function ShiftsTab() {
  const [data, setData] = useState<ShiftsData>(loadShifts)
  // «Сегодня» запоминаем один раз при открытии вкладки.
  const [today] = useState(todayIso)
  // Какой месяц показан в календаре. При открытии — текущий.
  const [view, setView] = useState(() => {
    const [year, month] = today.split('-').map(Number)
    return { year, monthIndex: month - 1 }
  })
  // Выбранный день для отметки (null — ничего не выбрано).
  const [selected, setSelected] = useState<string | null>(null)
  // Настройки и операции «Денег» — только для подсказок про деньги, не меняем.
  const [money] = useState(loadMoney)

  // Сохраняем при каждом изменении данных.
  useEffect(() => {
    saveShifts(data)
  }, [data])

  function changeDay(date: string, entry: DayEntry | null) {
    setData((prev) => setDay(prev, date, entry))
  }

  // Помощник 2/2. Возвращает, сколько поставлено и пропущено, — для сообщения в форме.
  function fill(from: string, to: string) {
    const result = fillTwoTwo(data, from, to)
    setData(result.data)
    return result
  }

  // Переключение месяца: delta = -1 (назад) или +1 (вперёд).
  function shiftMonth(delta: number) {
    setView((v) => {
      const total = v.year * 12 + v.monthIndex + delta // месяцы «подряд» от нулевого года
      return { year: Math.floor(total / 12), monthIndex: total % 12 }
    })
  }

  function goToday() {
    const [year, month] = today.split('-').map(Number)
    setView({ year, monthIndex: month - 1 })
  }

  const nextShift = findNextShift(today, data)
  const stats = monthStats(data, view.year, view.monthIndex, today)

  // Деньги за смены (данные «Денег» только читаем).
  const lost = missedCost(stats.missed, money.settings)
  const income = monthIncome(money, monthPrefix(view.year, view.monthIndex))
  const average = averagePerShift(income, stats.worked)

  return (
    <section className={styles.shifts}>
      <NextShiftCard nextShift={nextShift} data={data} today={today} />

      <Card
        title={monthTitle(view.year, view.monthIndex)}
        actions={
          <>
            <Button variant="text" size="sm" onClick={goToday}>
              Сегодня
            </Button>
            <Button
              size="sm"
              iconOnly
              icon={<ChevronLeft size={16} />}
              onClick={() => shiftMonth(-1)}
              aria-label="Предыдущий месяц"
            />
            <Button
              size="sm"
              iconOnly
              icon={<ChevronRight size={16} />}
              onClick={() => shiftMonth(1)}
              aria-label="Следующий месяц"
            />
          </>
        }
      >

        <MonthCalendar
          year={view.year}
          monthIndex={view.monthIndex}
          data={data}
          today={today}
          selected={selected}
          onSelect={setSelected}
        />

        <DayLegend />

        <div className={styles.stats} aria-label="Итог месяца">
          <div>
            <div className={styles.statValue}>{stats.worked}</div>
            <div className={styles.caption}>отработано</div>
          </div>
          <div>
            <div className={styles.statValue}>{stats.planned}</div>
            <div className={styles.caption}>впереди</div>
          </div>
          <div>
            <div className={`${styles.statValue} ${stats.missed > 0 ? styles.statBad : ''}`}>
              {stats.missed}
              {stats.missed > 0 && <CircleAlert size={18} aria-hidden="true" />}
            </div>
            <div className={styles.caption}>не вышел</div>
          </div>
          <div>
            <div className={styles.statValue}>{stats.leave}</div>
            <div className={styles.caption}>отгулов</div>
          </div>
        </div>

        {(stats.missed > 0 || average !== null) && (
          <div className={styles.moneyNotes}>
            {stats.missed > 0 && (
              <p className={styles.statBadText}>
                <CircleAlert size={14} aria-hidden="true" className={styles.inlineIcon} />
                Пропусков: {stats.missed} — это −{formatMoney(lost.total)}, из них −
                {formatMoney(lost.turkey)} на Турцию
              </p>
            )}
            {average !== null && (
              <p className={styles.caption}>
                По факту в среднем {formatMoney(average)} за смену (доход из выписки за месяц /
                отработанные смены)
              </p>
            )}
          </div>
        )}
      </Card>

      {selected && (
        <DayEditor
          date={selected}
          entry={data.days[selected]}
          onChange={(entry) => changeDay(selected, entry)}
          onClose={() => setSelected(null)}
        />
      )}

      <FillTwoTwoCard today={today} onFill={fill} />
    </section>
  )
}
