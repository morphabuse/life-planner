// Настройка сверки по скриншоту (в шестерёнке): как счёт называется в приложении банка →
// какой это счёт у меня. Настраивается один раз. Счета банка, которых здесь нет
// (например, «скидка»), при сверке молча пропускаются.
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { BalanceKind, ReconcileName } from '../../../types'
import { Button, Input, Select } from '../../../components/ui'
import { ACCOUNT_LABELS, BALANCE_KINDS } from '../moneyLogic'
import styles from '../MoneyTab.module.css'

interface Props {
  names: ReconcileName[]
  onSave: (names: ReconcileName[]) => void
}

export function ReconcileNamesForm({ names, onSave }: Props) {
  const [draft, setDraft] = useState<ReconcileName[]>(names)
  const [saved, setSaved] = useState(false)

  function update(index: number, change: Partial<ReconcileName>) {
    setDraft((d) => d.map((row, i) => (i === index ? { ...row, ...change } : row)))
    setSaved(false)
  }

  function save() {
    onSave(draft.map((r) => ({ ...r, name: r.name.trim() })).filter((r) => r.name !== ''))
    setSaved(true)
  }

  return (
    <div className={styles.settingsSection}>
      <h3 className={styles.sectionTitle}>Сверка по скриншоту</h3>
      <p className={styles.caption}>
        Название счёта как в приложении банка → какой это счёт. Остальные счета со скриншота не учитываются.
      </p>
      <ul className={styles.accountList}>
        {draft.map((row, index) => (
          <li key={index} className={styles.accountRow}>
            <Input
              className={styles.nameInput}
              aria-label="Название в приложении банка"
              value={row.name}
              onChange={(e) => update(index, { name: e.target.value })}
            />
            <Select
              size="sm"
              aria-label={`Какой это счёт: ${row.name}`}
              options={BALANCE_KINDS.map((k) => ACCOUNT_LABELS[k])}
              value={ACCOUNT_LABELS[row.kind]}
              onChange={(e) => {
                const kind = BALANCE_KINDS.find((k) => ACCOUNT_LABELS[k] === e.target.value) as BalanceKind | undefined
                if (kind) update(index, { kind })
              }}
            />
            <Button
              variant="text"
              size="sm"
              iconOnly
              danger
              icon={<Trash2 size={16} />}
              aria-label={`Убрать «${row.name}»`}
              onClick={() => {
                setDraft((d) => d.filter((_, i) => i !== index))
                setSaved(false)
              }}
            />
          </li>
        ))}
      </ul>
      <div className={styles.buttons}>
        <Button
          size="sm"
          icon={<Plus size={16} />}
          onClick={() => {
            setDraft((d) => [...d, { name: '', kind: 'life' }])
            setSaved(false)
          }}
        >
          Добавить название
        </Button>
        <Button size="sm" variant="primary" onClick={save}>
          Сохранить
        </Button>
        {saved && (
          <span className={styles.okText} role="status">
            Сохранено.
          </span>
        )}
      </div>
    </div>
  )
}
