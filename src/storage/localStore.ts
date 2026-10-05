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

// Сохраняет значение как JSON по ключу.
export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    // Например, если место в хранилище закончилось.
    console.error(`Не удалось сохранить «${key}»`, error)
  }
}
