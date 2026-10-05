// Конверты месяца: как распределился доход «Доход: склад» по правилу 50/40/10.
import { Card, ProgressBar } from '../../components/ui'
import type { SalarySplit } from '../../types'
import type { Envelope, Envelopes } from './moneyLogic'
import { formatMoney } from './format'
import styles from './MoneyTab.module.css'

interface Props {
  envelopes: Envelopes
  split: SalarySplit
}

interface RowProps {
  name: string
  percent: number
  envelope: Envelope
  usedLabel: string // «Потрачено» или «Отложено»
  // Для трат перерасход — плохо (красная полоса), для копилки «отложено больше» — хорошо.
  overspendIsBad: boolean
  note?: string
}

function EnvelopeRow({ name, percent, envelope, usedLabel, overspendIsBad, note }: RowProps) {
  const { planned, used, left } = envelope
  const ratio = planned > 0 ? (used / planned) * 100 : used > 0 ? 100 : 0
  const over = left < 0 && overspendIsBad

  return (
    <div className={styles.envelope}>
      <div className={styles.envelopeHeader}>
        <span className={styles.envelopeName}>{name}</span>
        <span className={styles.caption}>{percent}%</span>
      </div>
      <div className={styles.envelopeNumbers}>
        <div>
          <div className={styles.caption}>Положено</div>
          <div className={styles.envelopeValue}>{formatMoney(planned)}</div>
        </div>
        <div>
          <div className={styles.caption}>{usedLabel}</div>
          <div className={styles.envelopeValue}>{formatMoney(used)}</div>
        </div>
        <div>
          <div className={styles.caption}>Остаток</div>
          <div className={`${styles.envelopeValue} ${over ? styles.danger : ''}`}>
            {formatMoney(left)}
          </div>
        </div>
      </div>
      <ProgressBar
        value={ratio}
        tone={over ? 'danger' : 'accent'}
        label={`${name}: ${usedLabel.toLowerCase()} ${Math.round(ratio)}% от положенного`}
      />
      {note && <p className={styles.envelopeNote}>{note}</p>}
    </div>
  )
}

export function EnvelopesCard({ envelopes, split }: Props) {
  const { income, life, turkey, clothes } = envelopes

  // Подсказка для конверта «Турция»: связь с копилкой.
  // «Отложено» — пополнения минус снятия копилки за месяц, поэтому может быть с минусом.
  const savedText =
    turkey.used < 0 ? `снято из копилки больше, чем положено: ${formatMoney(-turkey.used)}` : `отложено ${formatMoney(turkey.used)}`
  let turkeyNote = `Должно быть отложено ${formatMoney(turkey.planned)}, ${savedText}`
  if (turkey.left > 0) turkeyNote += ` — отложи ещё ${formatMoney(turkey.left)}`
  else if (turkey.left < 0) turkeyNote += ` — на ${formatMoney(-turkey.left)} больше плана`

  return (
    <Card
      title="Конверты"
      subtitle={
        income > 0
          ? `Доход за месяц: ${formatMoney(income)} («Доход: склад» из выписки)`
          : 'Доходов «Доход: склад» за этот месяц нет — загрузи выписку карты выше'
      }
    >
      <div className={styles.envelopes}>
        <EnvelopeRow
          name="Жизнь"
          percent={split.life}
          envelope={life}
          usedLabel="Потрачено"
          overspendIsBad
        />
        <EnvelopeRow
          name="Турция"
          percent={split.turkey}
          envelope={turkey}
          usedLabel="Отложено"
          overspendIsBad={false}
          note={turkeyNote}
        />
        <EnvelopeRow
          name="Одежда"
          percent={split.clothes}
          envelope={clothes}
          usedLabel="Потрачено"
          overspendIsBad
        />
      </div>
    </Card>
  )
}
