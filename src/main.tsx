import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Шрифт Manrope (с кириллицей), веса 400–800: текст, кнопки, заголовки, крупные цифры.
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
// Сначала токены, потом глобальные стили, которые ими пользуются.
import './styles/tokens.css'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
