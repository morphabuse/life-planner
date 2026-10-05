// Многострочное поле в стиле Input: подпись сверху, высота растягивается вручную.
import type { TextareaHTMLAttributes } from 'react'
import inputStyles from './Input.module.css'
import styles from './Textarea.module.css'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className, ...rest }: TextareaProps) {
  const field = (
    <textarea className={[inputStyles.input, styles.textarea, className].filter(Boolean).join(' ')} {...rest} />
  )
  if (!label) return field
  return (
    <label className={`${inputStyles.field} ${styles.field}`}>
      <span className={inputStyles.label}>{label}</span>
      {field}
    </label>
  )
}
