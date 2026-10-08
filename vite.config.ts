import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { tesseractAssets } from './tesseractAssets.ts'

// Адрес, по которому лежит сайт. Локально — корень '/'. На GitHub Pages сайт живёт
// в подпапке '/life-planner/' — сборка в GitHub Actions передаёт её через BASE_PATH.
const base = process.env.BASE_PATH ?? '/'

// Если порт задан переменной окружения PORT (так делает превью в приложении Claude,
// когда 5173 занят), берём его. Иначе — обычные порты Vite.
const port = process.env.PORT ? Number(process.env.PORT) : undefined

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    // Распознавание скриншотов для сверки остатков: движок и языки — свои, в /tesseract/.
    tesseractAssets(),
    // PWA: сайт можно установить на телефон как приложение и открывать без интернета.
    VitePWA({
      // 'prompt' — новая версия не включается сама: показываем плашку «Доступна новая версия»,
      // и пользователь сам решает, когда обновиться (чтобы не потерять то, что сейчас вводит).
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Планировщик',
        short_name: 'Планировщик',
        description: 'Личный планировщик: смены, задачи, привычки, деньги',
        lang: 'ru',
        start_url: base,
        scope: base,
        display: 'standalone',
        // Цвета — из токенов: фон страницы (--color-bg), тема одна — тёмная.
        background_color: '#08080c',
        theme_color: '#08080c',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Что сохранить для работы офлайн: весь сайт, шрифты (только woff2), иконки,
        // воркер pdf.js (.mjs). Он весит ~1,3 МБ — поднимаем лимит с 2 до 3 МБ на файл.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Файлы распознавания (движок ~4 МБ, языки ~6 МБ) не скачиваем заранее при установке —
        // только при первой сверке. После этого они лежат в кэше и работают офлайн.
        globIgnores: ['**/tesseract/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/tesseract/'),
            handler: 'CacheFirst',
            options: { cacheName: 'tesseract', expiration: { maxEntries: 10 } },
          },
        ],
      },
    }),
  ],
  server: { port },
  preview: { port },
})
