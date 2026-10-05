// Достаёт текст из PDF прямо в браузере (pdfjs-dist) и собирает его в строки.
// Файл никуда не отправляется — всё читается локально.
import { PAGE_BREAK } from './parseStatement'

interface TextPiece {
  x: number
  y: number
  width: number
  str: string
}

// Куски текста ближе этого по высоте считаем одной строкой (в пунктах PDF).
const SAME_LINE_TOLERANCE = 3
// Если между кусками промежуток больше этого — ставим пробел.
const SPACE_GAP = 1

// Воркер создаём один раз и переиспользуем для всех выписок.
// Запись new Worker(new URL(…), { type: 'module' }) Vite понимает и сам собирает файл воркера.
let worker: Worker | null = null
function getWorker(): Worker {
  worker ??= new Worker(new URL('./pdfWorker.ts', import.meta.url), { type: 'module' })
  return worker
}

export async function extractPdfLines(data: ArrayBuffer): Promise<string[]> {
  // pdfjs большой, поэтому грузим его только когда нужно (динамический import).
  // Safari на iPhone не знает части новых функций JavaScript, которыми пользуется pdf.js 6,
  // и выписка там падала с «undefined is not a function». Поэтому:
  //   1) сначала наши замены (pdfPolyfills.ts),
  //   2) потом сборка pdf.js «legacy» — в ней остальные новые функции уже заменены.
  await import('./pdfPolyfills')
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // Разбор PDF идёт в отдельном потоке (worker) — в нём нужны те же замены,
  // поэтому воркер свой (pdfWorker.ts): замены + воркер pdf.js.
  pdfjs.GlobalWorkerOptions.workerPort = getWorker()

  const task = pdfjs.getDocument({ data })
  const pdf = await task.promise
  const lines: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    // transform[4] и transform[5] — координаты x и y куска текста на странице.
    const pieces: TextPiece[] = []
    for (const item of content.items) {
      if (!('str' in item) || item.str.trim() === '') continue
      pieces.push({ x: item.transform[4], y: item.transform[5], width: item.width, str: item.str })
    }

    // Сверху вниз (в PDF y растёт вверх), в строке — слева направо.
    pieces.sort((a, b) => b.y - a.y || a.x - b.x)

    let row: TextPiece[] = []
    const flush = () => {
      if (row.length === 0) return
      row.sort((a, b) => a.x - b.x)
      let text = row[0].str
      for (let i = 1; i < row.length; i++) {
        const prev = row[i - 1]
        const gap = row[i].x - (prev.x + prev.width)
        text += (gap > SPACE_GAP ? ' ' : '') + row[i].str
      }
      lines.push(text)
      row = []
    }

    for (const piece of pieces) {
      if (row.length > 0 && Math.abs(row[0].y - piece.y) > SAME_LINE_TOLERANCE) flush()
      row.push(piece)
    }
    flush()
    // Отмечаем конец страницы: так разбор поймёт, что число перед меткой — номер страницы.
    lines.push(PAGE_BREAK)
  }

  await task.destroy() // освобождаем память и воркер
  return lines
}
