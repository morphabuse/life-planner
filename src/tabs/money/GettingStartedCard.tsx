// Пустое состояние режима «Месяц»: пока нет ни операций, ни доходов, вместо карточек
// с нулями показываем три шага, с чего начать.
import { Check } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { formatMoney } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  cardDone: boolean // выписка карты уже загружена
  envelopesDone: boolean // загружена выписка хотя бы одного счёта-конверта
  shiftPay: number
  turkeyPercent: number
  onOpenSettings: () => void
}

export function GettingStartedCard({ cardDone, envelopesDone, shiftPay, turkeyPercent, onOpenSettings }: Props) {
  const steps = [
    {
      title: 'Загрузи выписку карты',
      text: 'PDF основного счёта из приложения Ozon Банка: «Справка о движении средств». Из неё — доход за смены, траты и лимиты. Или вводи доход вручную: «Получил за смену».',
      done: cardDone,
    },
    {
      title: 'Загрузи выписки счетов «Жизнь», «Турция», «Одежда и уход»',
      text: 'Из них — остатки («можно потратить», рост «Турции») и сверка переводов. Счёт спросит, какой он, один раз.',
      done: envelopesDone,
    },
    {
      title: 'Проверь цену смены',
      text: `Сейчас ${formatMoney(shiftPay)} за смену, ${turkeyPercent} % — на «Турцию». От этого зависит прогноз «Успеваю ли».`,
      done: false,
      action: (
        <Button size="sm" variant="text" onClick={onOpenSettings}>
          Открыть настройки
        </Button>
      ),
    },
  ]

  return (
    <Card title="С чего начать" subtitle="Перетащи выписки в зону выше — порядок не важен.">
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={`${styles.stepNumber} ${step.done ? styles.stepDone : ''}`} aria-hidden="true">
              {step.done ? <Check size={14} /> : index + 1}
            </span>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>
                {step.title}
                {step.done && <span className={styles.okText}> · готово</span>}
              </div>
              <p className={styles.caption}>{step.text}</p>
              {step.action}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}
