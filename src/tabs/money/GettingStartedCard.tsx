// Пустое состояние «Денег»: пока нет ни операций, ни записей копилки, вместо карточек
// с нулями показываем три шага, с чего начать.
import { Check } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { formatMoney } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  cardDone: boolean // выписка карты уже загружена
  savingsDone: boolean // выписка накопительного уже загружена
  shiftPay: number
  turkeyPercent: number
  onOpenSettings: () => void
}

export function GettingStartedCard({ cardDone, savingsDone, shiftPay, turkeyPercent, onOpenSettings }: Props) {
  const steps = [
    {
      title: 'Загрузи выписку карты',
      text: 'PDF основного счёта из приложения Ozon Банка: «Справка о движении средств». Из неё — доход, траты, конверты и лимиты.',
      done: cardDone,
    },
    {
      title: 'Загрузи выписку накопительного счёта',
      text: 'Счёт «Турция»: пополнения, снятия и проценты попадут в копилку, остаток сверится со счётом.',
      done: savingsDone,
    },
    {
      title: 'Проверь цену смены',
      text: `Сейчас ${formatMoney(shiftPay)} за смену, ${turkeyPercent} % — в копилку. От этого зависит «N смен до Турции».`,
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
