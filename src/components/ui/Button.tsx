// Кнопка. Три вида на весь сайт — других кнопок не делаем.
//   primary   — главное действие на экране/в форме (одно!)
//   secondary — обычные действия
//   text      — тихие действия: «Изменить», «Отмена», удаление в списке
// aria-pressed={true} — кнопка-переключатель в выбранном состоянии.
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text'
  size?: 'sm' | 'md'
  icon?: ReactNode // иконка слева, например <Plus size={16} />
  iconOnly?: boolean // кнопка только с иконкой — тогда обязателен aria-label
  danger?: boolean // при наведении краснеет (удаление)
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconOnly = false,
  danger = false,
  className,
  type = 'button', // по умолчанию не отправляет форму
  children,
  ...rest // остальные свойства (onClick, disabled, aria-*) передаём как есть
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    iconOnly && styles.iconOnly,
    danger && styles.danger,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {!iconOnly && children}
    </button>
  )
}
