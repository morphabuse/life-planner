import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Шрифт Inter (с кириллицей): обычный, средний и полужирный.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
// Сначала токены, потом глобальные стили, которые ими пользуются.
import './styles/tokens.css'
import './styles/global.css'
import { loadTheme } from './storage/themeStorage'
import { applyTheme } from './utils/theme'
import App from './App.tsx'

// Применяем тему ДО первой отрисовки — иначе при загрузке мелькнёт светлая.
applyTheme(loadTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
