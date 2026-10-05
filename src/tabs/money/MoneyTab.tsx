// Вкладка «Деньги»: копилка на Турцию, конверты зарплаты, лимиты, операции из выписок.
// Здесь живёт состояние (копилка + деньги), остальное — дочерние компоненты.
//
// Порядок на экране:
//   цель и прогресс копилки → зона загрузки выписки → месяц (конверты, лимиты, операции)
//   → свёрнутые блоки: «Пополнить вручную», «История копилки», «Настройки».
// Пока данных нет — вместо месяца карточка-инструкция «С чего начать».
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AccountInfo, Deposit, MoneyData, SavingsData, SavingsGoal, Transaction } from '../../types'
import { loadSavings, saveSavings } from '../../storage/savingsStorage'
import { loadMoney, saveMoney } from '../../storage/moneyStorage'
import { Button, Collapsible } from '../../components/ui'
import { calcSummary } from './savingsMath'
import {
  allCategories,
  calcEnvelopes,
  calcLimits,
  dataUntil,
  addPiggyRecords,
  latestDataMonth,
  lifeCategories,
  merchantKey,
  mergeTransactions,
  monthPrefix,
  removeSavingsCopies,
  savingsBalance,
  shiftsToGoal,
  statementOperations,
  turkeyPerShift,
} from './moneyLogic'
import type { ParsedStatement } from './statement/parseStatement'
import { GoalCard } from './GoalCard'
import { SavingsSummary } from './SavingsSummary'
import { EnvelopesCard } from './EnvelopesCard'
import { LimitsCard } from './LimitsCard'
import { TransactionsCard } from './TransactionsCard'
import { StatementImportCard } from './StatementImportCard'
import { GettingStartedCard } from './GettingStartedCard'
import { DepositForm } from './DepositForm'
import { DepositHistory } from './DepositHistory'
import { MoneySettingsForm } from './MoneySettingsForm'
import { formatDate, formatMoney, formatMoneyExact, plural } from './format'
import styles from './MoneyTab.module.css'

const SETTINGS_ID = 'money-settings'

// 'октябрь' + 2026 → 'Октябрь 2026'
function monthTitle(year: number, monthIndex: number): string {
  const text = new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('ru-RU', {
    month: 'long',
    timeZone: 'UTC',
  })
  return `${text[0].toUpperCase()}${text.slice(1)} ${year}`
}

// Запоминает счёт из выписки: тип, конец периода и (для накопительного) остаток.
function rememberAccount(
  accounts: Record<string, AccountInfo>,
  parsed: ParsedStatement,
  info: AccountInfo,
): Record<string, AccountInfo> {
  if (!parsed.account) return accounts // номера нет — запоминать нечего
  return { ...accounts, [parsed.account]: { ...accounts[parsed.account], ...info } }
}

// Последняя дата операций выписки — если в шапке не нашёлся период.
function lastOperationDate(parsed: ParsedStatement): string | undefined {
  return parsed.operations.reduce<string | undefined>((max, o) => (!max || o.date > max ? o.date : max), undefined)
}

export function MoneyTab() {
  // Передаём функции загрузки (без скобок): React вызовет их один раз, при первом показе.
  const [savings, setSavings] = useState<SavingsData>(loadSavings)
  const [money, setMoney] = useState<MoneyData>(loadMoney)
  // «Сегодня» запоминаем один раз при открытии вкладки.
  const [today] = useState(() => new Date())
  // Месяц для конвертов, лимитов и операций. При открытии — последний месяц, где есть данные
  // (выписка обычно отстаёт, и текущий месяц пустой), иначе — текущий.
  const [view, setView] = useState(
    () => latestDataMonth(money, savings.deposits) ?? { year: today.getFullYear(), monthIndex: today.getMonth() },
  )

  // Сохраняем при каждом изменении.
  useEffect(() => saveSavings(savings), [savings])
  useEffect(() => saveMoney(money), [money])

  // ---------- Копилка ----------
  function changeGoal(goal: SavingsGoal) {
    setSavings((prev) => ({ ...prev, goal }))
  }
  function addDeposits(list: Deposit[]) {
    setSavings((prev) => ({ ...prev, deposits: [...prev.deposits, ...list] }))
  }
  function deleteDeposit(id: string) {
    setSavings((prev) => ({ ...prev, deposits: prev.deposits.filter((d) => d.id !== id) }))
  }

  // После загрузки выписки показываем последний месяц с данными.
  function showLatestMonth(nextMoney: MoneyData, nextDeposits: Deposit[]) {
    const latest = latestDataMonth(nextMoney, nextDeposits)
    if (latest) setView(latest)
  }

  // ---------- Импорт выписок ----------
  function importCard(parsed: ParsedStatement) {
    // Каждой операции — номер счёта: он входит в ключ операции.
    const ops = statementOperations(parsed)
    // Считаем результат от текущих данных, чтобы сразу вернуть числа в форму.
    const result = mergeTransactions(money.transactions, ops)
    const next: MoneyData = {
      ...money,
      transactions: result.transactions,
      accounts: rememberAccount(money.accounts, parsed, {
        kind: 'card',
        periodEnd: parsed.periodEnd ?? lastOperationDate(parsed),
      }),
    }
    setMoney(next)
    showLatestMonth(next, savings.deposits)
    return { added: result.added, updated: result.updated, duplicates: result.duplicates }
  }

  function importSavings(parsed: ParsedStatement, list: Deposit[]) {
    const ops = statementOperations(parsed)
    // Миграция: копии операций накопительного, по ошибке загруженные раньше как карта, убираем.
    const cleaned = removeSavingsCopies(money.transactions, ops)
    const periodEnd = parsed.periodEnd ?? lastOperationDate(parsed)
    const next: MoneyData = {
      ...money,
      transactions: cleaned.transactions,
      accounts: rememberAccount(money.accounts, parsed, {
        kind: 'savings',
        periodEnd,
        balance:
          parsed.closingKop !== null && periodEnd ? { date: periodEnd, amount: parsed.closingKop / 100 } : undefined,
      }),
    }
    setMoney(next)
    // addPiggyRecords: если пришёл остаток на начало за более раннюю дату — старый заменяется.
    const deposits = addPiggyRecords(savings.deposits, list)
    setSavings((prev) => ({ ...prev, deposits: addPiggyRecords(prev.deposits, list) }))
    showLatestMonth(next, deposits)
    return { removed: cleaned.removed }
  }

  // ---------- Деньги ----------
  // Новая категория для операции = правило для всего магазина.
  function changeCategory(tx: Transaction, category: string) {
    setMoney((prev) => ({ ...prev, rules: { ...prev.rules, [merchantKey(tx.purpose)]: category } }))
  }

  function saveLimits(limits: Record<string, number>, newCategories: string[]) {
    setMoney((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        limits,
        customCategories: [...new Set([...prev.settings.customCategories, ...newCategories])],
      },
    }))
  }

  function saveSettings(split: MoneyData['settings']['split'], shiftPay: number) {
    setMoney((prev) => ({ ...prev, settings: { ...prev.settings, split, shiftPay } }))
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const total = v.year * 12 + v.monthIndex + delta
      return { year: Math.floor(total / 12), monthIndex: total % 12 }
    })
  }

  // Шаг 3 инструкции: раскрыть «Настройки» и прокрутить к ним.
  function openSettings() {
    const details = document.getElementById(SETTINGS_ID)
    if (details instanceof HTMLDetailsElement) {
      details.open = true
      details.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // ---------- Расчёты для показа ----------
  const summary = calcSummary(savings.goal, savings.deposits, today)
  const hasData = money.transactions.length > 0 || savings.deposits.length > 0
  const prefix = monthPrefix(view.year, view.monthIndex)
  const envelopes = calcEnvelopes(money, savings.deposits, prefix)
  const limits = calcLimits(money, prefix)
  const monthTransactions = money.transactions.filter((t) => t.date.startsWith(prefix))
  const latest = latestDataMonth(money, savings.deposits)
  const isLatestMonth = latest !== null && view.year === latest.year && view.monthIndex === latest.monthIndex
  const until = dataUntil(money, savings.deposits)
  const accountList = Object.values(money.accounts)
  const { split, shiftPay } = money.settings

  return (
    <section className={styles.money}>
      <GoalCard goal={savings.goal} onChange={changeGoal} />
      {hasData && (
        <SavingsSummary
          summary={summary}
          shiftsLeft={shiftsToGoal(summary.left, money.settings)}
          turkeyPerShift={turkeyPerShift(money.settings)}
          balance={savingsBalance(money.accounts)}
        />
      )}

      <StatementImportCard
        transactions={money.transactions}
        deposits={savings.deposits}
        accounts={money.accounts}
        savedTotal={summary.saved}
        onImportCard={importCard}
        onImportSavings={importSavings}
      />

      {hasData ? (
        <>
          <div className={styles.monthNav}>
            <div className={styles.monthHeading}>
              <h2 className={styles.monthTitle}>{monthTitle(view.year, view.monthIndex)}</h2>
              {until && <span className={styles.caption}>данные по {formatDate(until)}</span>}
            </div>
            <div className={styles.monthButtons}>
              <Button variant="text" size="sm" disabled={!latest || isLatestMonth} onClick={() => latest && setView(latest)}>
                Последний месяц
              </Button>
              <Button
                size="sm"
                iconOnly
                icon={<ChevronLeft size={16} />}
                aria-label="Предыдущий месяц"
                onClick={() => shiftMonth(-1)}
              />
              <Button
                size="sm"
                iconOnly
                icon={<ChevronRight size={16} />}
                aria-label="Следующий месяц"
                onClick={() => shiftMonth(1)}
              />
            </div>
          </div>

          <EnvelopesCard envelopes={envelopes} split={split} />
          <LimitsCard usages={limits} lifeCategories={lifeCategories(money)} onSave={saveLimits} />
          <TransactionsCard
            transactions={monthTransactions}
            rules={money.rules}
            categories={allCategories(money)}
            onCategoryChange={changeCategory}
          />
        </>
      ) : (
        <GettingStartedCard
          cardDone={accountList.some((a) => a.kind === 'card')}
          savingsDone={accountList.some((a) => a.kind === 'savings')}
          shiftPay={shiftPay}
          turkeyPercent={split.turkey}
          onOpenSettings={openSettings}
        />
      )}

      <Collapsible title="Пополнить копилку вручную" subtitle="Если откладывал наличными или не через накопительный счёт">
        <DepositForm onAdd={(deposit) => addDeposits([deposit])} />
      </Collapsible>
      <Collapsible
        title="История копилки"
        subtitle={
          savings.deposits.length > 0
            ? `${savings.deposits.length} ${plural(savings.deposits.length, 'запись', 'записи', 'записей')} · итого ${formatMoneyExact(summary.saved)}`
            : 'Пока пусто'
        }
      >
        <DepositHistory deposits={savings.deposits} onDelete={deleteDeposit} />
      </Collapsible>
      <Collapsible
        id={SETTINGS_ID}
        title="Настройки"
        subtitle={`${split.life}% жизнь / ${split.turkey}% Турция / ${split.clothes}% одежда · за смену ${formatMoney(shiftPay)}`}
      >
        <MoneySettingsForm settings={money.settings} onSave={saveSettings} />
      </Collapsible>
    </section>
  )
}
