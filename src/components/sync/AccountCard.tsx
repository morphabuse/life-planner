// Панель аккаунта под шапкой. Не вошёл — форма входа (email + пароль) и регистрация.
// Вошёл — email, статус, «Синхронизировать сейчас» и «Выйти».
// Без входа сайт работает как раньше, только на этом устройстве.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { LogIn, LogOut, RefreshCw, X } from 'lucide-react'
import { signIn, signOut, signUp, syncNow } from '../../sync/syncEngine'
import type { SyncState } from '../../sync/syncEngine'
import { Button, Card, Input } from '../ui'
import styles from './Sync.module.css'

interface Props {
  sync: SyncState
  onClose: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export function AccountCard({ sync, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function handleSignIn(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const error = await signIn(email.trim(), password)
    setBusy(false)
    if (error) setMessage({ kind: 'error', text: error })
    else {
      setPassword('')
      setMessage(null)
    }
  }

  async function handleSignUp() {
    if (!email.trim() || !password) return setMessage({ kind: 'error', text: 'Введи email и пароль' })
    setBusy(true)
    const { error, confirm } = await signUp(email.trim(), password)
    setBusy(false)
    if (error) setMessage({ kind: 'error', text: error })
    else if (confirm) setMessage({ kind: 'ok', text: 'Проверь почту: пришло письмо для подтверждения, потом войди' })
    else setMessage(null)
  }

  const close = (
    <Button variant="text" size="sm" iconOnly icon={<X size={16} />} aria-label="Закрыть" onClick={onClose} />
  )

  if (!sync.email) {
    return (
      <Card title="Синхронизация" actions={close}>
        <p className={styles.intro}>Войди — и данные будут одинаковыми на телефоне и компьютере.</p>
        <form className={styles.form} onSubmit={handleSignIn}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Пароль"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className={styles.buttons}>
            <Button type="submit" variant="primary" icon={<LogIn size={16} />} disabled={busy}>
              Войти
            </Button>
            <Button variant="text" disabled={busy} onClick={handleSignUp}>
              Создать аккаунт
            </Button>
          </div>
        </form>
        {message && <p className={message.kind === 'ok' ? styles.ok : styles.error}>{message.text}</p>}
        <p className={styles.caption}>Без входа всё хранится только на этом устройстве, как раньше.</p>
      </Card>
    )
  }

  return (
    <Card title="Синхронизация" actions={close}>
      <p className={styles.intro}>Вошёл как {sync.email}</p>
      <p className={styles.caption}>
        {sync.lastSyncedAt ? `Последняя синхронизация: ${formatTime(sync.lastSyncedAt)}` : 'Ещё не синхронизировалось'}
      </p>
      {sync.status === 'offline' && (
        <p className={styles.caption}>Нет сети — изменения сохраняются здесь и уйдут в облако, когда сеть появится.</p>
      )}
      {sync.status === 'error' && sync.error && <p className={styles.error}>Ошибка: {sync.error}. Повторю через 30 с.</p>}
      <div className={styles.buttons}>
        <Button icon={<RefreshCw size={16} />} disabled={sync.status === 'syncing'} onClick={() => void syncNow()}>
          Синхронизировать сейчас
        </Button>
        <Button variant="text" icon={<LogOut size={16} />} onClick={() => void signOut()}>
          Выйти
        </Button>
      </div>
      <p className={styles.caption}>После выхода данные остаются на этом устройстве.</p>
    </Card>
  )
}
