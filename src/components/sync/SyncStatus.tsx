// Статус синхронизации в шапке: «синхронизировано» / «синхронизация…» / «офлайн» / «не вошёл».
// Нажатие открывает панель аккаунта (вход или выход).
import { Cloud, CloudAlert, CloudCheck, CloudOff, CloudSync } from 'lucide-react'
import type { SyncState, SyncStatus as Status } from '../../sync/syncEngine'
import { Button } from '../ui'
import styles from './Sync.module.css'

const LABELS: Record<Exclude<Status, 'off'>, string> = {
  signedOut: 'не вошёл',
  offline: 'офлайн',
  syncing: 'синхронизация…',
  synced: 'синхронизировано',
  error: 'ошибка синхронизации',
  choice: 'нужен ответ',
}

const ICONS: Record<Exclude<Status, 'off'>, typeof Cloud> = {
  signedOut: Cloud,
  offline: CloudOff,
  syncing: CloudSync,
  synced: CloudCheck,
  error: CloudAlert,
  choice: CloudAlert,
}

interface Props {
  sync: SyncState
  open: boolean
  onToggle: () => void
}

export function SyncStatus({ sync, open, onToggle }: Props) {
  if (sync.status === 'off') return null
  const Icon = ICONS[sync.status]
  const label = LABELS[sync.status]
  const problem = sync.status === 'error' || sync.status === 'choice'
  return (
    <Button
      variant="text"
      size="sm"
      icon={<Icon size={14} />}
      className={[styles.status, problem && styles.statusProblem].filter(Boolean).join(' ')}
      aria-expanded={open}
      title={sync.email ? `Аккаунт: ${sync.email}` : 'Войти, чтобы синхронизировать устройства'}
      onClick={onToggle}
    >
      <span role="status">{label}</span>
    </Button>
  )
}
