// Выпадающий список в стиле Input: подпись сверху (необязательно), ошибка снизу.
import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import inputStyles from './Input.module.css'
import styles from './Select.module.css'

// Omit убирает родной атрибут size у <select> (это число видимых строк),
// чтобы вместо него был наш размер 'sm' | 'md', как у кнопок.
interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  options: string[] // значения = подписи (нам этого хватает)
  size?: 'sm' | 'md'
}

export function Select({ label, options, size = 'md', className, ...rest }: SelectProps) {
  // className — на обёртку: так снаружи можно задать ширину, а сам список растянется на неё.
  const control = (
    <span className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <select
        className={[inputStyles.input, styles.select, styles[size]].join(' ')}
        {...rest}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {/* Своя стрелка вместо системной — одинаково во всех браузерах и темах. */}
      <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
    </span>
  )

  if (!label) return control

  return (
    <label className={inputStyles.field}>
      <span className={inputStyles.label}>{label}</span>
      {control}
    </label>
  )
}
