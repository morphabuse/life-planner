import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Шрифты (с кириллицей): Pixelify Sans — заголовки и крупные цифры,
// JetBrains Mono — весь остальной текст.
import '@fontsource/pixelify-sans/500.css'
import '@fontsource/pixelify-sans/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
// Сначала токены, потом глобальные стили, которые ими пользуются.
import './styles/tokens.css'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
