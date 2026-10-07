// Нижняя панель разделов на телефоне: 5 кнопок «значок + подпись», закреплена внизу.
// На компьютере скрыта (там вкладки сверху). Тот же список вкладок, что и в шапке.
import type { TabId } from '../types'
import type { TabInfo } from '../App'
import styles from './BottomNav.module.css'

interface Props {
  tabs: TabInfo[]
  active: TabId
  onSelect: (tab: TabId) => void
}

export function BottomNav({ tabs, active, onSelect }: Props) {
  return (
    <nav className={styles.bar} role="tablist" aria-label="Разделы">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={id === active}
          className={styles.item}
          onClick={() => onSelect(id)}
        >
          {/* «Таблетка» под значком — подсветка выбранного раздела. */}
          <span className={styles.pill}>
            <Icon size={20} aria-hidden="true" />
          </span>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  )
}
