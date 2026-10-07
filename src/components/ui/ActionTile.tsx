// Плитка-кнопка — крупное главное действие во всю ширину карточки
// (например, «Получил за смену»): заливка акцентом, слева значок в подложке,
// справа две строки — что сделать и короткое пояснение.
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './ActionTile.module.css'

interface ActionTileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode // значок 24 px
  title: string // «Получил за смену»
  caption?: string // «внести доход»
}

export function ActionTile({ icon, title, caption, className, type = 'button', ...rest }: ActionTileProps) {
  return (
    <button type={type} className={[styles.tile, className].filter(Boolean).join(' ')} {...rest}>
      <span className={styles.iconBox} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {caption && <span className={styles.caption}>{caption}</span>}
      </span>
    </button>
  )
}
