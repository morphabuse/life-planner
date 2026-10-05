// Переключатель темы в шапке: по кругу «как в системе → светлая → тёмная».
import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { loadTheme, saveTheme } from '../storage/themeStorage'
import type { ThemeChoice } from '../storage/themeStorage'
import { applyTheme } from '../utils/theme'
import { Button } from './ui'

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' }
const LABELS: Record<ThemeChoice, string> = {
  system: 'как в системе',
  light: 'светлая',
  dark: 'тёмная',
}
const ICONS: Record<ThemeChoice, typeof Sun> = { system: Monitor, light: Sun, dark: Moon }

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>(loadTheme)

  // При смене темы — применяем её к странице и запоминаем.
  useEffect(() => {
    applyTheme(theme)
    saveTheme(theme)
  }, [theme])

  const Icon = ICONS[theme]
  const label = `Тема: ${LABELS[theme]}. Нажми, чтобы сменить`

  return (
    <Button
      variant="secondary"
      size="sm"
      iconOnly
      icon={<Icon size={16} />}
      aria-label={label}
      title={label}
      onClick={() => setTheme((t) => NEXT[t])}
    />
  )
}
