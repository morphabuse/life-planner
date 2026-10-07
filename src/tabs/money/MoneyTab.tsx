// Вкладка «Деньги». Два режима: «Турция» (цель и прогноз) и «Месяц» (остатки, доход за смены,
// переводы по счетам, траты). Настройки — за шестерёнкой. Внизу — зона загрузки выписок.
// Здесь живёт состояние «Денег»; «Смены» читаем для прогноза и отмечаем смену,
// если за неё пришёл доход, а она не отмечена.
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Settings, X } from 'lucide-react'
import type {
  AccountInfo,
  AccountKind,
  BalanceKind,
  BalanceSnapshot,
  MoneyData,
  MoneySettings,
  ShiftsData,
  Transaction,
} from '../../types'
import { loadMoney, saveMoney } from '../../storage/moneyStorage'
import { loadShifts, saveShifts } from '../../storage/shiftsStorage'
import { Button, Card } from '../../components/ui'
import { addDays, todayIso, formatMonthTitle } from '../../utils/date'
import {
  ACCOUNT_LABELS,
  addManualIncome,
  allCategories,
  categorySpending,
  dataUntil,
  defaultIncomeShiftDate,
  incomeShiftDates,
  latestDataMonth,
  markShiftsByIncome,
  merchantKey,
  mergeTransactions,
  monthAnalytics,
  monthStart,
  monthPrefix,
  removeManualIncome,
  removeSavingsCopies,
  shiftIncomes,
  spendingCategories,
  statementOperations,
  toggleTransfer,
} from './moneyLogic'
import { turkeyForecast } from './turkeyLogic'
import type { ParsedStatement } from './statement/parseStatement'
import { TurkeyCard } from './TurkeyCard'
import { BalancesCard } from './BalancesCard'
import { IncomeCard } from './IncomeCard'
import { TransferCheckCard } from './TransferCheckCard'
import { MonthAnalyticsCard } from './MonthAnalyticsCard'
import { LimitsCard } from './LimitsCard'
import { TransactionsCard } from './TransactionsCard'
import { StatementImportCard } from './StatementImportCard'
import { GettingStartedCard } from './GettingStartedCard'
import { MoneySettingsForm } from './MoneySettingsForm'
import { formatDate } from './format'
import styles from './MoneyTab.module.css'

type Mode = 'turkey' | 'month'

// Запоминает счёт из выписки: тип, период и остатки на начало и конец периода.
function rememberAccount(money: MoneyData, parsed: ParsedStatement, kind: AccountKind): Record<string, AccountInfo> {
  if (!parsed.account) return money.accounts // номера нет — запоминать нечего
  const old = money.accounts[parsed.account]
  const dates = parsed.operations.map((o) => o.date).sort()
  const start = parsed.periodStart ?? dates[0]
  const end = parsed.periodEnd ?? dates.at(-1)
  const balances = [...(old?.balances ?? [])]
  const put = (snapshot: BalanceSnapshot) => {
    const i = balances.findIndex((b) => b.date === snapshot.date)
    if (i >= 0) balances[i] = snapshot
    else balances.push(snapshot)
  }
  // «Входящий остаток» — это остаток на конец дня перед началом периода.
  if (parsed.openingKop !== null && start) put({ date: addDays(start, -1), kop: parsed.openingKop })
  if (parsed.closingKop !== null && end) put({ date: end, kop: parsed.closingKop })
  const min = (a?: string, b?: string) => (!a ? b : !b ? a : a < b ? a : b)
  const max = (a?: string, b?: string) => (!a ? b : !b ? a : a > b ? a : b)
  return {
    ...money.accounts,
    [parsed.account]: {
      kind,
      periodStart: min(old?.periodStart, start),
      periodEnd: max(old?.periodEnd, end),
      balances,
    },
  }
}

export function MoneyTab() {
  // Передаём функции загрузки (без скобок): React вызовет их один раз, при первом показе.
  const [money, setMoney] = useState<MoneyData>(loadMoney)
  const [shifts, setShifts] = useState<ShiftsData>(loadShifts)
  const [today] = useState(todayIso)
  const [mode, setMode] = useState<Mode>('turkey')
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Месяц для режима «Месяц». При открытии — последний месяц, где есть данные.
  const [view, setView] = useState(() => {
    const [year, month] = today.split('-').map(Number)
    return latestDataMonth(money) ?? { year, monthIndex: month - 1 }
  })

  // Сохраняем при каждом изменении.
  useEffect(() => saveMoney(money), [money])
  useEffect(() => saveShifts(shifts), [shifts])

  // ---------- Импорт выписок ----------
  function importStatement(parsed: ParsedStatement, kind: AccountKind): string {
    const accounts = rememberAccount(money, parsed, kind)
    const name = `«${ACCOUNT_LABELS[kind]}»`
    if (kind === 'other') {
      setMoney({ ...money, accounts })
      return `Счёт ··${parsed.account.slice(-4)} запомнен как другой — не учитывается.`
    }

    // Каждой операции — номер счёта: он входит в ключ операции.
    const ops = statementOperations(parsed)
    let transactions = money.transactions
    let removed = 0
    if (kind !== 'card') {
      // Миграция: копии операций этого счёта, по ошибке загруженные раньше как карта, убираем.
      const cleaned = removeSavingsCopies(transactions, ops)
      transactions = cleaned.transactions
      removed = cleaned.removed
    }
    const result = mergeTransactions(transactions, ops)
    const next: MoneyData = { ...money, transactions: result.transactions, accounts }
    setMoney(next)

    let text = `${name}: новых операций ${result.added}.`
    if (result.updated > 0) text += ` Обновлено: ${result.updated}.`
    if (result.duplicates > 0) text += ` Без изменений: ${result.duplicates}.`
    if (removed > 0) text += ` Убрано старых копий из операций карты: ${removed}.`

    if (kind === 'card') {
      // Пришёл доход, а смена не отмечена — отмечаем «Смена».
      const dates = incomeShiftDates(
        ops.map((o) => ({ ...o, id: '' })),
        next,
      )
      const marked = markShiftsByIncome(shifts, dates)
      if (marked.marked > 0) {
        setShifts(marked.shifts)
        text += ` Отмечено смен по доходу: ${marked.marked}.`
      }
      const latest = latestDataMonth(next)
      if (latest) setView(latest)
    }
    return text
  }

  // ---------- Доход и переводы ----------
  // Сама логика — в moneyLogic.ts (её же вызывает «Сегодня»), здесь только сохраняем результат.
  function handleAddIncome(shiftDate: string, rub: number) {
    setMoney((prev) => addManualIncome(prev, shiftDate, rub))
    setShifts((prev) => markShiftsByIncome(prev, [shiftDate]).shifts)
  }

  function saveBalances(balances: Partial<Record<BalanceKind, BalanceSnapshot>>) {
    setMoney((prev) => ({ ...prev, manualBalances: { ...prev.manualBalances, ...balances } }))
  }

  // ---------- Категории и настройки ----------
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

  function saveSettings(changes: Pick<MoneySettings, 'split' | 'shiftPay' | 'shiftsPerMonth' | 'goal'>) {
    setMoney((prev) => ({ ...prev, settings: { ...prev.settings, ...changes } }))
  }

  function setAccountKind(account: string, kind: AccountKind) {
    setMoney((prev) => ({
      ...prev,
      accounts: { ...prev.accounts, [account]: { ...prev.accounts[account], kind } },
    }))
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const total = v.year * 12 + v.monthIndex + delta
      return { year: Math.floor(total / 12), monthIndex: total % 12 }
    })
  }

  // ---------- Расчёты для показа ----------
  const prefix = monthPrefix(view.year, view.monthIndex)
  const monthIncomes = shiftIncomes(money).filter((i) => i.shiftDate.startsWith(prefix))
  const monthTransactions = money.transactions.filter(
    (t) => t.date.startsWith(prefix) && (!t.account || money.accounts[t.account]?.kind === 'card'),
  )
  const latest = latestDataMonth(money)
  const isLatestMonth = latest !== null && view.year === latest.year && view.monthIndex === latest.monthIndex
  const until = dataUntil(money)
  const hasData = money.transactions.length > 0 || Object.keys(money.manualIncome).length > 0
  const accountList = Object.values(money.accounts)

  return (
    <section className={styles.money}>
      <div className={styles.modeBar}>
        <div className={styles.modeSwitch} role="group" aria-label="Режим">
          <Button size="sm" aria-pressed={mode === 'turkey'} onClick={() => setMode('turkey')}>
            {money.settings.goal.title}
          </Button>
          <Button size="sm" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>
            Месяц
          </Button>
        </div>
        <Button
          size="sm"
          iconOnly
          icon={<Settings size={16} />}
          aria-label="Настройки денег"
          title="Настройки денег"
          aria-pressed={settingsOpen}
          onClick={() => setSettingsOpen((v) => !v)}
        />
      </div>

      {settingsOpen && (
        <Card
          title="Настройки"
          actions={
            <Button
              variant="text"
              size="sm"
              iconOnly
              icon={<X size={16} />}
              aria-label="Закрыть настройки"
              onClick={() => setSettingsOpen(false)}
            />
          }
        >
          <MoneySettingsForm money={money} onSave={saveSettings} onAccountKind={setAccountKind} />
        </Card>
      )}

      {mode === 'turkey' ? (
        <TurkeyCard
          forecast={turkeyForecast(money, shifts, today)}
          settings={money.settings}
          hasAccount={
            accountList.some((a) => a.kind === 'turkey') || money.manualBalances.turkey !== undefined
          }
        />
      ) : (
        <>
          <BalancesCard money={money} today={today} onSaveBalances={saveBalances} />

          <div className={styles.monthNav}>
            <div className={styles.monthHeading}>
              <h2 className={styles.monthTitle}>{formatMonthTitle(view.year, view.monthIndex)}</h2>
              {until && <span className={styles.caption}>выписка карты по {formatDate(until)}</span>}
            </div>
            <div className={styles.monthButtons}>
              <Button variant="text" size="sm" disabled={!latest || isLatestMonth} onClick={() => latest && setView(latest)}>
                Последний месяц
              </Button>
              <Button size="sm" iconOnly icon={<ChevronLeft size={16} />} aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)} />
              <Button size="sm" iconOnly icon={<ChevronRight size={16} />} aria-label="Следующий месяц" onClick={() => shiftMonth(1)} />
            </div>
          </div>

          <IncomeCard
            incomes={monthIncomes}
            money={money}
            defaultDate={defaultIncomeShiftDate(money, shifts, today)}
            onAddManual={handleAddIncome}
            onRemoveManual={(date) => setMoney((prev) => removeManualIncome(prev, date))}
            onToggleTransfer={(date, kind) => setMoney((prev) => toggleTransfer(prev, date, kind))}
          />

          {hasData ? (
            <>
              <TransferCheckCard money={money} />
              <MonthAnalyticsCard analytics={monthAnalytics(money, prefix)} split={money.settings.split} />
              <LimitsCard
                items={categorySpending(money, prefix)}
                categories={spendingCategories(money)}
                from={monthStart(money, prefix)}
                onSave={saveLimits}
              />
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
              envelopesDone={accountList.some((a) => a.kind === 'life' || a.kind === 'turkey' || a.kind === 'clothes')}
              shiftPay={money.settings.shiftPay}
              turkeyPercent={money.settings.split.turkey}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </>
      )}

      <StatementImportCard money={money} shifts={shifts} onImport={importStatement} />
    </section>
  )
}
