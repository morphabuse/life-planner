// Прогноз «Успеваю ли» одной фразой — для «Денег» и «Сегодня».
// Вид — контурный чип с точкой-индикатором:
//   успеваю        → бирюзовая точка, «Успеваешь, запас ~N ₽»
//   запас < 5 %    → серая точка,     «Впритык, запас ~N ₽»
//   не успеваю     → коралловая точка и «!», «Не хватит ~N ₽ — это +K смен в месяц»
import { CircleAlert } from 'lucide-react'
import type { TurkeyForecast } from './turkeyLogic'
import { forecastText } from './turkeyLogic'
import styles from './MoneyTab.module.css'

export function ForecastPhrase({ forecast }: { forecast: TurkeyForecast }) {
  return (
    <p className={`${styles.forecast} ${styles[`forecast_${forecast.verdict}`]}`} role="status">
      <span className={styles.forecastDot} aria-hidden="true" />
      {/* Нехватку показываем не только цветом — ещё и значком «!». */}
      {forecast.verdict === 'short' && <CircleAlert size={14} aria-hidden="true" className={styles.forecastIcon} />}
      <span>{forecastText(forecast)}</span>
    </p>
  )
}
