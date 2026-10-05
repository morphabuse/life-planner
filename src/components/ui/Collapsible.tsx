// Свёрнутая карточка: видна только шапка (заголовок + подзаголовок),
// содержимое раскрывается по клику. Сделана на нативных <details>/<summary> —
// браузер сам умеет открывать их мышью и с клавиатуры (Enter / пробел).
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './Collapsible.module.css'

interface CollapsibleProps {
  title: ReactNode
  subtitle?: ReactNode // коротко, что внутри — видно и в свёрнутом виде
  defaultOpen?: boolean
  id?: string // чтобы можно было найти блок, раскрыть его кодом и прокрутить к нему
  className?: string
  children: ReactNode
}

export function Collapsible({ title, subtitle, defaultOpen = false, id, className, children }: CollapsibleProps) {
  const classes = [styles.collapsible, className].filter(Boolean).join(' ')
  return (
    <details id={id} className={classes} open={defaultOpen}>
      <summary className={styles.summary}>
        <span className={styles.headings}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </span>
        <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  )
}
