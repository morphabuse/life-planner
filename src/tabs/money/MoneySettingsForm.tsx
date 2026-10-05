// Настройки денег: распределение зарплаты по конвертам и цена смены.
// Показывается внутри свёрнутого блока «Настройки» — поля сразу заполнены текущими значениями.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Input } from '../../components/ui'
import type { MoneySettings } from '../../types'
import styles from './MoneyTab.module.css'

interface Props {
  settings: MoneySettings
  onSave: (split: MoneySettings['split'], shiftPay: number) => void
}

export function MoneySettingsForm({ settings, onSave }: Props) {
  const [life, setLife] = useState(String(settings.split.life))
  const [turkey, setTurkey] = useState(String(settings.split.turkey))
  const [clothes, setClothes] = useState(String(settings.split.clothes))
  const [shiftPay, setShiftPay] = useState(String(settings.shiftPay))
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const split = { life: Number(life), turkey: Number(turkey), clothes: Number(clothes) }
    const values = Object.values(split)
    const total = values.reduce((a, b) => a + b, 0)
    if (values.some((v) => !(v >= 0))) return setMessage({ kind: 'error', text: 'Проценты — числа от 0' })
    if (total !== 100) {
      return setMessage({ kind: 'error', text: `В сумме должно быть 100 %, сейчас ${total} %` })
    }
    const pay = Number(shiftPay)
    if (!(pay > 0)) return setMessage({ kind: 'error', text: 'Цена смены должна быть больше нуля' })
    onSave(split, pay)
    setMessage({ kind: 'ok', text: 'Сохранено.' })
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className={styles.caption}>Как делить каждый доход «Доход: склад» и сколько я получаю за смену.</p>
      <div className={`${styles.formRow} ${styles.formRowSpaced}`}>
        <Input label="Жизнь, %" type="number" min="0" max="100" step="1" value={life} onChange={(e) => setLife(e.target.value)} />
        <Input label="Турция, %" type="number" min="0" max="100" step="1" value={turkey} onChange={(e) => setTurkey(e.target.value)} />
        <Input label="Одежда, %" type="number" min="0" max="100" step="1" value={clothes} onChange={(e) => setClothes(e.target.value)} />
        <Input label="За смену, ₽" type="number" min="1" step="1" value={shiftPay} onChange={(e) => setShiftPay(e.target.value)} />
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
  )
}
