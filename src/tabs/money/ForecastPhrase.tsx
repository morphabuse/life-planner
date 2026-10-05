// Прогноз «Успеваю ли» одной фразой — для «Денег» и «Сегодня».
//   успеваю        → «Успеваешь, запас ~N ₽»
//   запас < 5 %    → «Впритык, запас ~N ₽»
//   не успеваю     → «Не хватит ~N ₽ — это +K смен в месяц»
import { CircleAlert, CircleCheck, CircleX } from 'lucide-react'
import type { TurkeyForecast } from './turkeyLogic'
import { forecastText } from './turkeyLogic'
import styles from './MoneyTab.module.css'

const ICONS = { ok: CircleCheck, tight: CircleAlert, short: CircleX }

export function ForecastPhrase({ forecast }: { forecast: TurkeyForecast }) {
  const Icon = ICONS[forecast.verdict]
  return (
    <p className={`${styles.forecast} ${styles[`forecast_${forecast.verdict}`]}`} role="status">
      <Icon size={18} aria-hidden="true" className={styles.forecastIcon} />
      <span>{forecastText(forecast)}</span>
    </p>
  )
}
