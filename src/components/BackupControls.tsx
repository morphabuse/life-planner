// Кнопки «Скачать бэкап» и «Загрузить бэкап» в шапке.
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  applyBackup,
  backupFileName,
  createBackup,
  describeBackup,
  parseBackup,
} from '../storage/backup'
import { Download, Upload } from 'lucide-react'
import { Button } from './ui'
import styles from './BackupControls.module.css'

interface Props {
  // Вызывается после успешной загрузки, чтобы вкладки перечитали данные.
  onRestored: () => void
}

// Сообщение рядом с кнопками: успех или ошибка.
type Status = { kind: 'ok' | 'error'; text: string } | null

export function BackupControls({ onRestored }: Props) {
  const [status, setStatus] = useState<Status>(null)
  // useRef — «ссылка» на настоящий DOM-элемент скрытого <input type="file">,
  // чтобы открыть окно выбора файла по нажатию на нашу кнопку.
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDownload() {
    const json = JSON.stringify(createBackup(), null, 2) // 2 — отступы, чтобы файл читался глазами
    // Blob — «файл в памяти браузера». Для него создаём временную ссылку
    // и программно нажимаем на <a download>, чтобы браузер его скачал.
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFileName()
    link.click()
    URL.revokeObjectURL(url) // освобождаем память
    setStatus({ kind: 'ok', text: 'Бэкап скачан' })
  }

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    // Сбрасываем выбор, чтобы можно было выбрать тот же файл ещё раз.
    input.value = ''
    if (!file) return

    try {
      const backup = parseBackup(await file.text())
      const exported = new Date(backup.exportedAt).toLocaleString('ru-RU')
      // describeBackup объясняет, что заменится (для старых версий — не всё).
      const ok = window.confirm(`Загрузить бэкап от ${exported}?\n\n${describeBackup(backup)}`)
      if (!ok) {
        setStatus(null)
        return
      }
      applyBackup(backup)
      onRestored()
      setStatus({ kind: 'ok', text: 'Бэкап загружен' })
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Не удалось прочитать файл.'
      setStatus({ kind: 'error', text })
    }
  }

  return (
    <div className={styles.controls}>
      {status && (
        <span className={status.kind === 'ok' ? styles.ok : styles.error} role="status">
          {status.text}
        </span>
      )}
      {/* Кнопки-иконки, как у темы: так шапка с пятью вкладками помещается в одну строку.
          Подпись видна во всплывающей подсказке (title) и для экранных чтецов (aria-label). */}
      <Button
        size="sm"
        iconOnly
        icon={<Download size={16} />}
        aria-label="Скачать бэкап"
        title="Скачать бэкап"
        onClick={handleDownload}
      />
      <Button
        size="sm"
        iconOnly
        icon={<Upload size={16} />}
        aria-label="Загрузить бэкап"
        title="Загрузить бэкап"
        onClick={() => fileInputRef.current?.click()}
      />
      {/* Стандартный выбор файла некрасивый, поэтому прячем его и открываем кнопкой выше. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className={styles.hiddenInput}
        onChange={handleFileChosen}
      />
    </div>
  )
}
