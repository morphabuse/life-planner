// Настройки денег (открываются шестерёнкой): как делить доход по счетам, цена смены,
// смен в месяц по плану, цель «Турция» и какой счёт какой.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Input, Select } from '../../components/ui'
import type { AccountKind, MoneyData, MoneySettings } from '../../types'
import { ACCOUNT_LABELS } from './moneyLogic'
import { formatDate } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  money: MoneyData
  onSave: (settings: Pick<MoneySettings, 'split' | 'shiftPay' | 'shiftsPerMonth' | 'goal'>) => void
  onAccountKind: (account: string, kind: AccountKind) => void
}

const KIND_OPTIONS: AccountKind[] = ['card', 'life', 'turkey', 'clothes', 'other']

export function MoneySettingsForm({ money, onSave, onAccountKind }: Props) {
  const { settings } = money
  const [life, setLife] = useState(String(settings.split.life))
  const [turkey, setTurkey] = useState(String(settings.split.turkey))
  const [clothes, setClothes] = useState(String(settings.split.clothes))
  const [shiftPay, setShiftPay] = useState(String(settings.shiftPay))
  const [shiftsPerMonth, setShiftsPerMonth] = useState(String(settings.shiftsPerMonth))
  const [goalAmount, setGoalAmount] = useState(String(settings.goal.amount))
  const [start, setStart] = useState(settings.goal.start)
  const [deadline, setDeadline] = useState(settings.goal.deadline)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const split = { life: Number(life), turkey: Number(turkey), clothes: Number(clothes) }
    const values = Object.values(split)
    const total = values.reduce((a, b) => a + b, 0)
    const error = (text: string) => setMessage({ kind: 'error', text })
    if (values.some((v) => !(v >= 0))) return error('Проценты — числа от 0')
    if (total !== 100) return error(`В сумме должно быть 100 %, сейчас ${total} %`)
    const pay = Number(shiftPay)
    if (!(pay > 0)) return error('Цена смены должна быть больше нуля')
    const perMonth = Number(shiftsPerMonth)
    if (!(perMonth > 0)) return error('Смен в месяц — больше нуля')
    const amount = Number(goalAmount)
    if (!(amount > 0)) return error('Сумма цели должна быть больше нуля')
    if (!start || !deadline || deadline <= start) return error('Срок цели должен быть позже старта')
    onSave({ split, shiftPay: pay, shiftsPerMonth: perMonth, goal: { ...settings.goal, amount, start, deadline } })
    setMessage({ kind: 'ok', text: 'Сохранено.' })
  }

  const accounts = Object.entries(money.accounts)

  return (
    <>
      <form onSubmit={handleSubmit}>
        <p className={styles.caption}>
          Как делить каждый доход за смену по счетам. Цена смены и смен в месяц — для прогноза, пока мало данных.
        </p>
        <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
          <Input label="Жизнь, %" type="number" min="0" max="100" step="1" value={life} onChange={(e) => setLife(e.target.value)} />
          <Input label="Турция, %" type="number" min="0" max="100" step="1" value={turkey} onChange={(e) => setTurkey(e.target.value)} />
          <Input label="Одежда и уход, %" type="number" min="0" max="100" step="1" value={clothes} onChange={(e) => setClothes(e.target.value)} />
        </div>
        <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
          <Input label="За смену, ₽" type="number" min="1" step="1" value={shiftPay} onChange={(e) => setShiftPay(e.target.value)} />
          <Input
            label="Смен в месяц (план)"
            type="number"
            min="1"
            step="1"
            value={shiftsPerMonth}
            onChange={(e) => setShiftsPerMonth(e.target.value)}
          />
        </div>
        <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
          <Input label={`${settings.goal.title}: цель, ₽`} type="number" min="1" step="1" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} />
          <Input label="Считаю с" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="Срок" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        {message && (
          <p className={message.kind === 'ok' ? styles.okText : styles.error} role="status">
            {message.text}
          </p>
        )}
        <div className={styles.buttons}>
          <Button type="submit" variant="primary">
            Сохранить
          </Button>
        </div>
      </form>

      <div className={styles.settingsSection}>
        <h3 className={styles.sectionTitle}>Счета</h3>
        {accounts.length === 0 ? (
          <p className={styles.caption}>Счета появятся после загрузки выписок.</p>
        ) : (
          <ul className={styles.accountList}>
            {accounts.map(([number, info]) => (
              <li key={number} className={styles.accountRow}>
                <span className={styles.limitName}>··{number.slice(-4)}</span>
                <Select
                  size="sm"
                  aria-label={`Какой это счёт: ··${number.slice(-4)}`}
                  options={KIND_OPTIONS.map((k) => ACCOUNT_LABELS[k])}
                  value={ACCOUNT_LABELS[info.kind]}
                  onChange={(e) => {
                    const kind = KIND_OPTIONS.find((k) => ACCOUNT_LABELS[k] === e.target.value)
                    if (kind) onAccountKind(number, kind)
                  }}
                />
                <span className={styles.caption}>
                  {info.periodEnd ? `выписка по ${formatDate(info.periodEnd)}` : 'выписок нет'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
