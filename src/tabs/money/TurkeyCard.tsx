// Режим «Турция»: сколько накоплено (рост счёта «Турция» с даты старта), сколько осталось,
// прогноз «Успеваю ли» и из чего он сложился.
import { Card, ProgressBar } from '../../components/ui'
import type { MoneySettings } from '../../types'
import { formatDayShort } from '../../utils/date'
import type { TurkeyForecast } from './turkeyLogic'
import { ForecastPhrase } from './ForecastPhrase'
import { formatDate, formatMoney, plural } from './format'
import { shiftsToGoal } from './moneyLogic'
import styles from './MoneyTab.module.css'

interface Props {
  forecast: TurkeyForecast
  settings: MoneySettings
  hasAccount: boolean // известно ли хоть что-то о счёте «Турция»
}

export function TurkeyCard({ forecast, settings, hasAccount }: Props) {
  const { goal, split, shiftPay, shiftsPerMonth } = settings
  const { progress, daysLeft } = forecast
  const shiftsLeft = progress.left > 0 ? shiftsToGoal(progress.left, settings) : 0
  const months = Math.floor(daysLeft / 30.44)

  const tempo =
    forecast.tempoSource === 'actual'
      ? `Темп: ~${formatMoney(forecast.perWeek)} в неделю — средняя за последние 4 недели.`
      : `Темп по плану: ~${formatMoney(forecast.perWeek)} в неделю (${split.turkey} % × ${formatMoney(shiftPay)} × ${shiftsPerMonth} ${plural(shiftsPerMonth, 'смена', 'смены', 'смен')} в месяц) — уточнится, когда наберётся 2 недели данных.`
  const ahead =
    forecast.futureShifts > 0 && forecast.horizon
      ? `Впереди отмечено ${forecast.futureShifts} ${plural(forecast.futureShifts, 'смена', 'смены', 'смен')} (по ${formatDayShort(forecast.horizon)}), дальше — по темпу.`
      : 'Будущих смен не отмечено — весь срок по темпу.'

  return (
    <Card
      title={goal.title}
      subtitle={`Цель ${formatMoney(goal.amount)} к ${formatDate(goal.deadline)} · считаю с ${formatDate(goal.start)}`}
    >
      <div className={styles.stats}>
        <div>
          <div className={styles.statLabel}>Накоплено</div>
          <div className={styles.statValue}>{formatMoney(progress.saved)}</div>
        </div>
        <div>
          <div className={styles.statLabel}>Осталось</div>
          <div className={styles.statValue}>{formatMoney(progress.left)}</div>
        </div>
        <div>
          <div className={styles.statLabel}>До срока</div>
          <div className={styles.statValue}>
            {months > 0 ? `${months} мес.` : `${daysLeft} ${plural(daysLeft, 'день', 'дня', 'дней')}`}
          </div>
        </div>
        {shiftsLeft !== null && (
          <div>
            <div className={styles.statLabel}>Смен до цели</div>
            <div className={styles.statValue}>{shiftsLeft}</div>
          </div>
        )}
      </div>

      <ProgressBar value={progress.percent} label={`Прогресс «${goal.title}»`} />
      <p className={styles.progressCaption}>
        {hasAccount
          ? `Рост счёта «${goal.title}» с ${formatDate(goal.start)}, проценты — в плюс` +
            (progress.asOf ? ` · остаток известен по ${formatDate(progress.asOf)}` : '') +
            ' · отмеченные «Перевёл» доли учтены сразу.'
          : `Счёт «${goal.title}» ещё не знаком: загрузи его выписку или введи остаток в настройках. Пока считаются только доли, отмеченные «Перевёл».`}
      </p>

      <ForecastPhrase forecast={forecast} />
      <p className={styles.caption}>
        К сроку будет ~{formatMoney(forecast.total)}. {tempo} {ahead}
      </p>
    </Card>
  )
}
