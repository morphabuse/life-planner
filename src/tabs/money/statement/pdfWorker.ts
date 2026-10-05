// Свой файл воркера для pdf.js: сначала замены для старых браузеров (Safari на iPhone),
// потом сам воркер pdf.js. Импорты выполняются по порядку, так что к запуску pdf.js
// все нужные функции уже на месте.
import './pdfPolyfills'
import 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'
