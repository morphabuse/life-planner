// Починка операций, загруженных старой версией разбора выписок.
//
// Старый разбор ошибался на настоящих выписках Ozon:
//   1) в назначении оставалась вторая копия суммы: «Перевод собственных - 1 500.00 ₽ средств»;
//   2) последняя цифра длинного номера документа уходила в назначение: «по + 6.60 ₽ 4 счету»
//      (номер был 1393806949 вместо 13938069494);
//   3) номер страницы приклеивался в конец назначения: «…Без НДС. 16»;
//   4) переносы внутри слов давали лишний пробел: «SANKT- PETERBU».
// Признак испорченной операции — в назначении есть «₽» (в правильном его не бывает).
import type { AccountInfo, Transaction } from '../types'
import { AMOUNT, legacyMerchantKey, merchantKey } from '../utils/statementText'
import { operationKey } from '../utils/operationKey'

export function isBrokenTransaction(tx: Transaction): boolean {
  return tx.purpose.includes('₽')
}

function repairTransaction(tx: Transaction): Transaction {
  let purpose = tx.purpose
  let doc = tx.doc

  // 2) Сразу после первой суммы — хвост номера документа (одна-три цифры).
  const first = new RegExp(String.raw`\s*${AMOUNT}(?:\s(\d{1,3})(?=\s|$))?`, 'u').exec(purpose)
  if (first) {
    if (first[3] && /^\d+$/u.test(doc)) doc += first[3]
    purpose = purpose.slice(0, first.index) + ' ' + purpose.slice(first.index + first[0].length)
  }
  // 1) Остальные копии суммы, если есть.
  purpose = purpose.replace(new RegExp(String.raw`\s*${AMOUNT}`, 'gu'), ' ')
  // 3) Номер страницы в конце.
  purpose = purpose.replace(/\s+\d{1,3}\s*$/u, '')
  // 4) «SANKT- PETERBU» → «SANKT-PETERBU», «2026- 09-26» → «2026-09-26».
  purpose = purpose.replace(/(\S)-\s+(?=\S)/gu, '$1-').replace(/\s+/gu, ' ').trim()

  return { ...tx, doc, purpose, id: operationKey({ ...tx, doc }) }
}

// Чинит операции и переносит правила категорий со старых ключей магазинов на новые.
// Возвращает null, если чинить нечего.
export function repairMoneyData(
  transactions: Transaction[],
  rules: Record<string, string>,
): { transactions: Transaction[]; rules: Record<string, string> } | null {
  if (!transactions.some(isBrokenTransaction)) return null

  const newRules = { ...rules }
  const byId = new Map<string, Transaction>()
  for (const tx of transactions) {
    if (!isBrokenTransaction(tx)) {
      byId.set(tx.id, tx)
      continue
    }
    const fixed = repairTransaction(tx)
    // Правило, сохранённое по старому (испорченному) ключу, переносим на новый ключ.
    const oldKey = legacyMerchantKey(tx.purpose)
    const newKey = merchantKey(fixed.purpose)
    if (oldKey in rules && !(newKey in newRules)) newRules[newKey] = rules[oldKey]
    byId.set(fixed.id, fixed)
  }
  // Старые ключи больше ничему не соответствуют — убираем их.
  for (const tx of transactions) {
    if (isBrokenTransaction(tx)) {
      const oldKey = legacyMerchantKey(tx.purpose)
      if (oldKey !== merchantKey(repairTransaction(tx).purpose)) delete newRules[oldKey]
    }
  }
  return { transactions: [...byId.values()], rules: newRules }
}

// ---------- Выписка накопительного, загруженная как карта ----------
//
// Раньше тип выписки угадывался по слову «накопительн» в шапке, а в настоящих
// выписках Ozon его нет — выписка накопительного загружалась как карта, и его
// операции попадали в «Операции по карте». Проценты «Выплата процентов по счету
// 4081…» бывают только на накопительном: такие старые операции (без номера счёта)
// убираем и заодно запоминаем, что этот счёт — «Турция» (единственный накопительный, что загружался).
// Его переводы убираются при следующей загрузке выписки накопительного
// (removeSavingsCopies в moneyLogic.ts), а копии с карты чинятся загрузкой выписки карты.
const SAVINGS_INTEREST = /Выплата процентов по сч[её]ту\s*(\d{20})/iu

export function removeLegacySavingsInterest(
  transactions: Transaction[],
  accounts: Record<string, AccountInfo>,
): { transactions: Transaction[]; accounts: Record<string, AccountInfo> } | null {
  const newAccounts = { ...accounts }
  const kept = transactions.filter((tx) => {
    if (tx.account) return true
    const m = SAVINGS_INTEREST.exec(tx.purpose)
    if (!m) return true
    if (!newAccounts[m[1]]) newAccounts[m[1]] = { kind: 'turkey', balances: [] }
    return false
  })
  if (kept.length === transactions.length) return null
  return { transactions: kept, accounts: newAccounts }
}
