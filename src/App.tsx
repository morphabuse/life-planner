import { useEffect, useRef, useState } from 'react'
import type { TabId } from './types'
import { TodayTab } from './tabs/today/TodayTab'
import { MoneyTab } from './tabs/money/MoneyTab'
import { WeekTab } from './tabs/week/WeekTab'
import { ShiftsTab } from './tabs/shifts/ShiftsTab'
import { HabitsTab } from './tabs/habits/HabitsTab'
import { BackupControls } from './components/BackupControls'
import { ThemeToggle } from './components/ThemeToggle'
import { UpdatePrompt } from './components/UpdatePrompt'
import styles from './App.module.css'

// Список вкладок: id для кода и подпись для кнопки.
// Чтобы добавить вкладку, достаточно дописать строку сюда и в renderTab.
const TABS: { id: TabId; label: string }[] = [
  { id: 'today', label: 'Сегодня' },
  { id: 'money', label: 'Деньги' },
  { id: 'week', label: 'Неделя' },
  { id: 'shifts', label: 'Смены' },
  { id: 'habits', label: 'Привычки' },
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
  // Полоса вкладок: на узком экране она прокручивается, и выбранная вкладка может
  // оказаться за краем. После переключения подкручиваем её в видимую область.
  const tabsRef = useRef<HTMLElement>(null)
  useEffect(() => {
    tabsRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeTab])

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.brand}>Планировщик</h1>

          {/* Вкладки-сегменты. role="tablist"/"tab" — чтобы программы чтения с экрана
              понимали, что это переключатель разделов. */}
          <nav ref={tabsRef} className={styles.segments} role="tablist" aria-label="Разделы">
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
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main key={dataVersion} className={styles.content}>
        {renderTab(activeTab)}
      </main>

      <UpdatePrompt />
    </>
  )
}

export default App
