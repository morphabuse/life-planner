// Низкоуровневая работа с localStorage.
// Все остальные модули storage пользуются только этими двумя функциями,
// а компоненты вообще не знают, что данные лежат в localStorage.

// Читает JSON по ключу. Если данных нет или они испорчены — возвращает fallback.
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    // JSON.parse бросает ошибку на битых данных — не роняем из-за этого приложение.
    return fallback
  }
}

// Кто хочет знать о каждом сохранении (синхронизация с облаком: изменилось — пора отправить).
type WriteListener = (key: string) => void
const listeners = new Set<WriteListener>()

// Подписка на сохранения. Возвращает функцию отписки.
export function onWrite(listener: WriteListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Сохраняет значение как JSON по ключу.
export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    // Например, если место в хранилище закончилось.
    console.error(`Не удалось сохранить «${key}»`, error)
    return
  }
  listeners.forEach((listener) => listener(key))
}

// Удаляет значение по ключу (например, после переноса старых данных в новый формат).
export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Хранилище недоступно — удалять нечего.
  }
}
