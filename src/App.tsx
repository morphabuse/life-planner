import { useEffect, useState } from 'react'
import { CalendarDays, House, ListChecks, Repeat, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TabId } from './types'
import { TodayTab } from './tabs/today/TodayTab'
import { MoneyTab } from './tabs/money/MoneyTab'
import { WeekTab } from './tabs/week/WeekTab'
import { ShiftsTab } from './tabs/shifts/ShiftsTab'
import { HabitsTab } from './tabs/habits/HabitsTab'
import { BackupControls } from './components/BackupControls'
import { Backdrop } from './components/Backdrop'
import { BottomNav } from './components/BottomNav'
import { UpdatePrompt } from './components/UpdatePrompt'
import { SyncStatus } from './components/sync/SyncStatus'
import { AccountCard } from './components/sync/AccountCard'
import { SyncChoiceCard } from './components/sync/SyncChoiceCard'
import { onDataReplaced, startSync, useSyncState } from './sync/syncEngine'
import styles from './App.module.css'

// Список вкладок: id для кода, подпись и значок (значок — для нижней панели на телефоне).
// Чтобы добавить вкладку, достаточно дописать строку сюда и в renderTab.
export interface TabInfo {
  id: TabId
  label: string
  icon: LucideIcon
}

const TABS: TabInfo[] = [
  { id: 'today', label: 'Сегодня', icon: House },
  { id: 'money', label: 'Деньги', icon: Wallet },
  { id: 'week', label: 'Неделя', icon: ListChecks },
  { id: 'shifts', label: 'Смены', icon: CalendarDays },
  { id: 'habits', label: 'Привычки', icon: Repeat },
]

// Возвращает компонент для выбранной вкладки.
function renderTab(tab: TabId) {
  switch (tab) {
    case 'today':
      return <TodayTab />
    case 'money':
      return <MoneyTab />
    case 'week':
      return <WeekTab />
    case 'shifts':
      return <ShiftsTab />
    case 'habits':
      return <HabitsTab />
  }
}

function App() {
  // Какая вкладка сейчас открыта. При старте — «Сегодня».
  const [activeTab, setActiveTab] = useState<TabId>('today')
  // Номер «версии данных». Вкладки читают данные из хранилища только при появлении,
  // поэтому после загрузки бэкапа увеличиваем номер: он стоит в key у <main>,
  // а смена key заставляет React пересоздать вкладку — и она перечитает данные.
  const [dataVersion, setDataVersion] = useState(0)
  // Синхронизация с облаком: статус для шапки. Пришли данные из облака — тот же приём
  // с dataVersion: вкладка пересоздаётся и перечитывает хранилище.
  const sync = useSyncState()
  const [accountOpen, setAccountOpen] = useState(false)
  useEffect(() => {
    startSync()
    return onDataReplaced(() => setDataVersion((v) => v + 1))
  }, [])
  // Сменил раздел — показываем его с начала, а не с того места, где был прошлый.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeTab])

  return (
    <>
      <Backdrop />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* Название и под ним — статус синхронизации (мелко, помещается и на телефоне). */}
          <div className={styles.brandBlock}>
            <h1 className={styles.brand}>Планировщик</h1>
            <SyncStatus sync={sync} open={accountOpen} onToggle={() => setAccountOpen((v) => !v)} />
          </div>

          {/* Вкладки-сегменты (на компьютере; на телефоне вместо них — нижняя панель).
              role="tablist"/"tab" — чтобы программы чтения с экрана понимали,
              что это переключатель разделов. */}
          <nav className={styles.segments} role="tablist" aria-label="Разделы">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === activeTab}
                className={styles.segment}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className={styles.headerActions}>
            <BackupControls onRestored={() => setDataVersion((v) => v + 1)} />
          </div>
        </div>
      </header>

      {/* Вне <main>: при обновлении данных вкладка пересоздаётся, а эти карточки — нет. */}
      {(accountOpen || sync.choice) && (
        <div className={styles.notices}>
          {sync.choice && <SyncChoiceCard choice={sync.choice} />}
          {accountOpen && <AccountCard sync={sync} onClose={() => setAccountOpen(false)} />}
        </div>
      )}

      <main key={dataVersion} className={styles.content}>
        {renderTab(activeTab)}
      </main>

      {/* Нижняя панель разделов — только на телефоне (≤ 640 px), показ решает CSS. */}
      <BottomNav tabs={TABS} active={activeTab} onSelect={setActiveTab} />

      <UpdatePrompt />
    </>
  )
}

export default App
