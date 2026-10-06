// Первый вход на устройстве, где уже есть данные, а в облаке — другие:
// спрашиваем, какие оставить. Пока не ответил, синхронизация ждёт.
import { Cloud, Smartphone } from 'lucide-react'
import { resolveChoice } from '../../sync/syncEngine'
import type { SyncState } from '../../sync/syncEngine'
import { Button, Card } from '../ui'
import styles from './Sync.module.css'

export function SyncChoiceCard({ choice }: { choice: NonNullable<SyncState['choice']> }) {
  return (
    <Card
      title="Какие данные оставить?"
      subtitle="В облаке уже есть данные, и на этом устройстве тоже. Выбранные заменят другие везде."
    >
      <dl className={styles.choice}>
        <dt>В облаке</dt>
        <dd>{choice.remote}</dd>
        <dt>На этом устройстве</dt>
        <dd>{choice.local}</dd>
      </dl>
      <div className={styles.buttons}>
        <Button icon={<Cloud size={16} />} onClick={() => void resolveChoice('cloud')}>
          Оставить из облака
        </Button>
        <Button icon={<Smartphone size={16} />} onClick={() => void resolveChoice('local')}>
          Оставить с этого устройства
        </Button>
      </div>
      <p className={styles.caption}>Не уверен — сначала скачай бэкап (кнопка в шапке).</p>
    </Card>
  )
}
