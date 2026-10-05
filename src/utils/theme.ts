// Применение темы: ставит атрибут data-theme на <html>.
// Значения цветов для каждой темы лежат в src/styles/tokens.css.
import type { ThemeChoice } from '../storage/themeStorage'

export function applyTheme(theme: ThemeChoice): void {
  const root = document.documentElement
  if (theme === 'system') {
    // Без атрибута сработает @media (prefers-color-scheme) — тема как в системе.
    delete root.dataset.theme
  } else {
    root.dataset.theme = theme
  }
  updateThemeColor(theme)
}

// Цвет строки состояния телефона (<meta name="theme-color">) — в цвет шапки.
// В index.html два тега: для светлой и тёмной системной темы. Если тема выбрана
// вручную, ставим в оба тега текущий цвет поверхности (токен --color-surface),
// а при «как в системе» возвращаем исходные значения из index.html.
function updateThemeColor(theme: ThemeChoice): void {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
  const surface = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim()
  metas.forEach((meta) => {
    meta.dataset.default ??= meta.content // запоминаем значение из index.html
    meta.content = theme === 'system' || !surface ? meta.dataset.default : surface
  })
}
