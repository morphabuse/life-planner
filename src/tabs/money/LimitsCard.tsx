// Траты месяца по категориям: у категорий с лимитом — полоска, превышение красным.
// Лимиты можно менять, удалять и добавлять (на любую категорию трат или новую свою).
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Input, ProgressBar, Select } from '../../components/ui'
import type { CategorySpending } from './moneyLogic'
import { formatMoney } from './format'
import styles from './MoneyTab.module.css'

const NEW_CATEGORY = '+ Новая категория…'

interface Props {
  items: CategorySpending[]
  categories: string[] // категории трат, на которые можно поставить лимит
  // Сохранить лимиты; newCategories — новые свои категории, созданные здесь.
  onSave: (limits: Record<string, number>, newCategories: string[]) => void
}

export function LimitsCard({ items, categories, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  // Черновик: категория → сумма строкой (так удобнее с полями ввода).
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [addCategory, setAddCategory] = useState('')
  const [newName, setNewName] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [error, setError] = useState('')

  function startEditing() {
    setDraft(Object.fromEntries(items.filter((u) => u.limit !== null).map((u) => [u.category, String(u.limit)])))
    setAddCategory('')
    setNewName('')
    setAddAmount('')
    setError('')
    setEditing(true)
  }

  // Категории, на которые лимита ещё нет, + пункт «новая категория».
  const available = categories.filter((c) => !(c in draft))
  const addOptions = [...available, NEW_CATEGORY]
  const selectedAdd = addCategory || addOptions[0]

  function addRow() {
    const name = selectedAdd === NEW_CATEGORY ? newName.trim() : selectedAdd
    if (!name) return setError('Введи название категории')
    if (name in draft) return setError('На эту категорию лимит уже есть')
    if (!(Number(addAmount) >= 0) || addAmount === '') return setError('Введи сумму лимита')
    setDraft((d) => ({ ...d, [name]: addAmount }))
    setAddCategory('')
    setNewName('')
    setAddAmount('')
    setError('')
  }

  function save() {
    const limits: Record<string, number> = {}
    for (const [category, value] of Object.entries(draft)) {
      const amount = Number(value)
      if (value === '' || !(amount >= 0)) return setError(`Неверная сумма у «${category}»`)
      limits[category] = amount
    }
    const newCategories = Object.keys(limits).filter((c) => !categories.includes(c))
    onSave(limits, newCategories)
    setEditing(false)
  }

  if (editing) {
    return (
      <Card title="Траты по категориям" subtitle="Сумма в месяц на категорию">
        <ul className={styles.limitEditList}>
          {Object.entries(draft).map(([category, value]) => (
            <li key={category} className={styles.limitEditRow}>
              <span className={styles.limitName}>{category}</span>
              <Input
                type="number"
                min="0"
                step="1"
                aria-label={`Лимит «${category}», ₽`}
                className={styles.limitInput}
                value={value}
                onChange={(e) => setDraft((d) => ({ ...d, [category]: e.target.value }))}
              />
              <Button
                variant="text"
                size="sm"
                iconOnly
                danger
                icon={<Trash2 size={16} />}
                aria-label={`Убрать лимит «${category}»`}
                onClick={() =>
                  setDraft((d) => {
                    const next = { ...d }
                    delete next[category]
                    return next
                  })
                }
              />
            </li>
          ))}
        </ul>

        <div className={styles.limitAddRow}>
          <Select
            size="sm"
            aria-label="Категория для нового лимита"
            options={addOptions}
            value={selectedAdd}
            onChange={(e) => setAddCategory(e.target.value)}
          />
          {selectedAdd === NEW_CATEGORY && (
            <Input
              placeholder="Название"
              aria-label="Название новой категории"
              className={styles.limitInput}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          )}
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="₽ в месяц"
            aria-label="Сумма нового лимита, ₽"
            className={styles.limitInput}
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
          />
          <Button size="sm" icon={<Plus size={16} />} onClick={addRow}>
            Добавить
          </Button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.buttons}>
          <Button variant="primary" onClick={save}>
            Сохранить
          </Button>
          <Button variant="text" onClick={() => setEditing(false)}>
            Отмена
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title="Траты по категориям"
      actions={
        <Button variant="text" size="sm" icon={<Pencil size={14} />} onClick={startEditing}>
          Изменить
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className={styles.caption}>Трат в этом месяце нет. Лимиты — по кнопке «Изменить».</p>
      ) : (
        <ul className={styles.limits}>
          {items.map((u) => {
            const limit = u.limit
            // Без лимита — просто сумма, без полоски.
            if (limit === null) {
              return (
                <li key={u.category} className={styles.limitHeader}>
                  <span className={styles.limitName}>{u.category}</span>
                  <span className={styles.caption}>{formatMoney(u.spent)}</span>
                </li>
              )
            }
            const percent = limit > 0 ? (u.spent / limit) * 100 : u.spent > 0 ? 100 : 0
            return (
              <li key={u.category} className={styles.limit}>
                <div className={styles.limitHeader}>
                  <span className={styles.limitName}>{u.category}</span>
                  <span className={u.over > 0 ? styles.danger : styles.caption}>
                    {formatMoney(u.spent)} из {formatMoney(limit)}
                  </span>
                  {u.over > 0 && <Badge tone="danger">превышен на {formatMoney(u.over)}</Badge>}
                </div>
                <ProgressBar
                  value={percent}
                  tone={u.over > 0 ? 'danger' : 'accent'}
                  label={`Лимит «${u.category}»: потрачено ${Math.round(percent)}%`}
                />
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
