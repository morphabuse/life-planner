// Плашка «Доступна новая версия — обновить».
// Сайт работает офлайн: браузер хранит копию (service worker). Когда на сервере
// появляется новая версия, она скачивается в фоне, но включается только по кнопке —
// чтобы не перезагрузить страницу посреди ввода.
import { RefreshCw, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui'
import styles from './UpdatePrompt.module.css'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className={styles.prompt} role="status">
      <span className={styles.text}>Доступна новая версия</span>
      <Button
        size="sm"
        variant="primary"
        icon={<RefreshCw size={16} />}
        onClick={() => updateServiceWorker(true)} // true — перезагрузить страницу на новой версии
      >
        Обновить
      </Button>
      <Button
        size="sm"
        variant="text"
        iconOnly
        icon={<X size={16} />}
        aria-label="Позже"
        title="Позже"
        onClick={() => setNeedRefresh(false)}
      />
    </div>
  )
}
