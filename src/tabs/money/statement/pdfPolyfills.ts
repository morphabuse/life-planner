// Замены (полифилы) для функций, которых нет в Safari на iPhone, а pdf.js ими пользуется.
// Подключаются ДО pdf.js — и в странице (pdfText.ts), и в воркере (pdfWorker.ts).
// Сборка pdf.js «legacy» сама подставляет многое (Map.getOrInsertComputed, Uint8Array.fromBase64…),
// но этих двух в ней нет — без них выписка на iPhone падала с
// «undefined is not a function (near '…e of t…')».

// 1. Promise.withResolvers() — «обещание» вместе с функциями resolve/reject.
const PromiseWithResolvers = Promise as unknown as { withResolvers?: unknown }
if (typeof PromiseWithResolvers.withResolvers !== 'function') {
  PromiseWithResolvers.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

// 2. Перебор потока циклом «for await (const кусок of поток)». pdf.js так читает текст
//    страницы. Safari не умеет перебирать ReadableStream — учим: читаем кусок за куском.
if (typeof ReadableStream !== 'undefined') {
  const proto = ReadableStream.prototype as unknown as Record<symbol | string, unknown>
  if (typeof proto[Symbol.asyncIterator] !== 'function') {
    const iterate = async function* (this: ReadableStream) {
      const reader = this.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) return
          yield value
        }
      } finally {
        reader.releaseLock()
      }
    }
    proto[Symbol.asyncIterator] = iterate
    if (typeof proto.values !== 'function') proto.values = iterate
  }
}

export {}
