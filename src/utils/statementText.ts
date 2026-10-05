// Общие функции для текста банковских выписок: суммы, склейка строк, «ключ магазина».
// Нужны и разбору PDF (вкладка «Деньги»), и починке уже сохранённых данных (storage).

// Число вида 1 234.56 / 1234,56 (разделитель тысяч — пробел или неразрывный пробел).
export const NUMBER = String.raw`\d{1,3}(?:[   ]?\d{3})*[.,]\d{2}`
// Сумма операции: знак, число, ₽. Знак минус бывает разным: - − –.
export const AMOUNT = String.raw`([+\-−–])\s*(${NUMBER})\s*₽`

// Склеивает строки одного назначения. Если строка закончилась дефисом, это перенос
// внутри слова или даты («SANKT-» + «PETERBU», «2026-» + «09-26») — пробел не нужен.
export function joinLines(lines: string[]): string {
  let text = ''
  for (const line of lines) {
    if (!text) text = line
    else text += (text.endsWith('-') ? '' : ' ') + line
  }
  return text
}

// Убирает из текста все суммы «± 1 234.56 ₽».
export function stripAmounts(text: string): string {
  return text.replace(new RegExp(String.raw`\s*${AMOUNT}`, 'gu'), ' ').replace(/\s+/gu, ' ').trim()
}

// «Ключ магазина» — по нему запоминается правило «магазин → категория».
// Берём назначение, выкидываем «служебные» куски и оставляем только буквы:
//   - слова, где цифр 40 % и больше (номера карт, даты, время, суммы, ID переводов СБП);
//   - в остальных словах цифры и знаки превращаются в пробелы.
// Поэтому 'YANDEX*4121*GO … дата 2026-09-26' и 'YANDEX*5530*GO … дата 2026- 10-01'
// дают один ключ, а у СБП-перевода ключом становится получатель, а не номер операции.
export function merchantKey(purpose: string): string {
  return purpose
    .toUpperCase()
    .split(/\s+/u)
    .filter((token) => {
      const digits = (token.match(/\d/gu) ?? []).length
      return digits === 0 || digits / token.length < 0.4
    })
    .join(' ')
    .replace(/[^A-ZА-ЯЁ*]+/gu, ' ')
    .trim()
}

// Старый способ считать ключ (до исправления) — нужен только чтобы перенести
// уже сохранённые правила на новые ключи.
export function legacyMerchantKey(purpose: string): string {
  return purpose.toUpperCase().replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
}
