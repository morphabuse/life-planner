// Хранение выбранной темы. Это настройка устройства, а не данные, —
// поэтому в бэкап она не попадает.
import { readJson, writeJson } from './localStore'

export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'planner.theme'

export function loadTheme(): ThemeChoice {
  const stored = readJson<unknown>(KEY, 'system')
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export function saveTheme(theme: ThemeChoice): void {
  writeJson(KEY, theme)
}
