// Карточка: тонкая рамка, мягкий радиус, без тени.
// Необязательная шапка: заголовок, подзаголовок и действия справа.
import type { ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode // кнопки справа от заголовка
  compact?: boolean // меньше внутренних отступов (для списков карточек)
  className?: string
  children?: ReactNode
}

export function Card({ title, subtitle, actions, compact, className, children }: CardProps) {
  const classes = [styles.card, compact && styles.compact, className].filter(Boolean).join(' ')
  const hasHeader = title || subtitle || actions

  return (
    <section className={classes}>
      {hasHeader && (
        <header className={styles.header}>
          <div className={styles.headings}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
