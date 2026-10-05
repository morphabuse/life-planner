// Поле ввода с подписью сверху, подсказкой и ошибкой снизу.
// Без label — просто поле (тогда нужен aria-label).
import type { InputHTMLAttributes } from 'react'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  wrapperClassName?: string // класс для обёртки (например, чтобы растянуть поле)
}

export function Input({ label, hint, error, wrapperClassName, className, ...rest }: InputProps) {
  const input = (
    <input
      className={[styles.input, error && styles.invalid, className].filter(Boolean).join(' ')}
      aria-invalid={error ? true : undefined}
      {...rest}
    />
  )

  if (!label && !hint && !error) return input

  return (
    <label className={[styles.field, wrapperClassName].filter(Boolean).join(' ')}>
      {label && <span className={styles.label}>{label}</span>}
      {input}
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : (
        hint && <span className={styles.hint}>{hint}</span>
      )}
    </label>
  )
}
