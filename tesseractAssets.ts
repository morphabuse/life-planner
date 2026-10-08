// Vite-плагин: кладёт файлы распознавания текста (tesseract.js) в сайт по адресу /tesseract/.
// Зачем: по умолчанию tesseract.js скачивает движок и языки с чужих серверов (CDN).
// Нам нужно, чтобы всё было своё — скриншоты распознаются в браузере, ничего не уходит наружу.
//   npm run dev   — отдаём файлы прямо из node_modules;
//   npm run build — копируем их в папку сборки dist/tesseract/.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)
const pkgDir = (name: string) => dirname(require.resolve(`${name}/package.json`))

// Имя файла на сайте → где он лежит в node_modules.
const FILES: Record<string, string> = {
  'worker.min.js': join(pkgDir('tesseract.js'), 'dist', 'worker.min.js'),
  // Движок (WebAssembly). Браузер скачает один вариант — какой поддерживает (SIMD или нет).
  'tesseract-core-lstm.wasm.js': join(pkgDir('tesseract.js-core'), 'tesseract-core-lstm.wasm.js'),
  'tesseract-core-simd-lstm.wasm.js': join(pkgDir('tesseract.js-core'), 'tesseract-core-simd-lstm.wasm.js'),
  'tesseract-core-relaxedsimd-lstm.wasm.js': join(pkgDir('tesseract.js-core'), 'tesseract-core-relaxedsimd-lstm.wasm.js'),
  // Языки: русский и английский (компактные «best_int», сжатые gzip).
  'rus.traineddata.gz': join(pkgDir('@tesseract.js-data/rus'), '4.0.0_best_int', 'rus.traineddata.gz'),
  'eng.traineddata.gz': join(pkgDir('@tesseract.js-data/eng'), '4.0.0_best_int', 'eng.traineddata.gz'),
}

const DIR = 'tesseract'

export function tesseractAssets(): Plugin {
  return {
    name: 'tesseract-assets',
    // Разработка: запрос /tesseract/<файл> → файл из node_modules.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        const prefix = `${server.config.base}${DIR}/`
        if (!path.startsWith(prefix)) return next()
        const source = FILES[path.slice(prefix.length)]
        if (!source) return next()
        res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
        res.end(readFileSync(source))
      })
    },
    // Сборка: копируем файлы в dist/tesseract/.
    generateBundle() {
      for (const [name, source] of Object.entries(FILES)) {
        this.emitFile({ type: 'asset', fileName: `${DIR}/${name}`, source: readFileSync(source) })
      }
    },
  }
}
