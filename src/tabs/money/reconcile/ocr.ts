// Распознавание текста на скриншотах — прямо в браузере (tesseract.js), русский + английский.
// Движок и языковые файлы лежат на самом сайте (/tesseract/, см. tesseractAssets.ts в корне):
// ни картинки, ни текст никуда не отправляются.
// Библиотека тяжёлая, поэтому подгружается только при первой сверке (import() внутри функции).

// Где лежат файлы распознавания на сайте (с учётом подпапки на GitHub Pages).
const BASE = `${import.meta.env.BASE_URL}tesseract`
// Сколько ждать загрузки движка и языков (~10 МБ при первой сверке, дальше — из кэша).
const START_TIMEOUT_MS = 60_000

// progress — от 0 до 1 по всем картинкам (для подписи «Распознаю… 40 %»).
export async function recognizeImages(files: File[], onProgress?: (progress: number) => void): Promise<string[]> {
  const { createWorker } = await import('tesseract.js')
  let current = 0 // какую картинку сейчас распознаём
  const starting = createWorker(['rus', 'eng'], undefined, {
    workerPath: `${BASE}/worker.min.js`,
    corePath: BASE, // папка: браузер сам выберет вариант движка (с SIMD или без)
    langPath: BASE, // rus.traineddata.gz и eng.traineddata.gz
    workerBlobURL: false, // воркер грузим как обычный файл с нашего сайта
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress((current + m.progress) / files.length)
    },
  })
  // Если файлы движка не загрузились (нет сети при самой первой сверке), tesseract.js
  // не сообщает об ошибке, а ждёт вечно. Поэтому ждём не дольше минуты.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('файлы распознавания не загрузились — нужен интернет при первой сверке')), START_TIMEOUT_MS),
  )
  const worker = await Promise.race([starting, timeout])
  try {
    const texts: string[] = []
    for (const file of files) {
      const { data } = await worker.recognize(file)
      texts.push(data.text)
      current++
    }
    return texts
  } finally {
    await worker.terminate()
  }
}
