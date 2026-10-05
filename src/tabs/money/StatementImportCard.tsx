// Загрузка PDF-выписки Ozon Банка: большая зона «перетащи файл сюда», чтение,
// сверка с итогами, предпросмотр и импорт.
//
// Какой это счёт, определяется по номеру лицевого счёта из шапки: знакомый счёт —
// берём запомненный тип; новый — спрашиваем («Карта», «Жизнь», «Турция»,
// «Одежда и уход» или «Другой») и запоминаем.
//   карта            → операции (траты и доход за смены), доходы сверяются с введёнными
//                      вручную, смены с доходом отмечаются в «Сменах»;
//   счета-конверты   → операции и остатки (рост «Турции», «можно потратить», сверка переводов);
//   другой           → только запоминаем, что счёт не учитывается.
import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Check, FileUp } from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import type { AccountKind, MoneyData, ShiftsData } from '../../types'
import { formatDayShort } from '../../utils/date'
import {
  ACCOUNT_LABELS,
  incomeShiftDates,
  mergeTransactions,
  shiftIncomes,
  statementOperations,
} from './moneyLogic'
import { formatDate, formatMoneyExact, formatSigned, plural } from './format'
import { parseStatementLines } from './statement/parseStatement'
import type { ParsedStatement } from './statement/parseStatement'
import { extractPdfLines } from './statement/pdfText'
import styles from './MoneyTab.module.css'

interface Props {
  money: MoneyData
  shifts: ShiftsData
  // Загрузить выписку как счёт kind. Возвращает текст итога для сообщения.
  onImport: (parsed: ParsedStatement, kind: AccountKind) => string
}

type Message = { kind: 'ok' | 'error'; text: string }

type State =
  | { step: 'idle'; message?: Message }
  | { step: 'reading'; fileName: string }
  // kind = null — счёт новый, и я ещё не выбрал, какой это.
  | { step: 'preview'; fileName: string; parsed: ParsedStatement; kind: AccountKind | null }

const KIND_ORDER: AccountKind[] = ['card', 'life', 'turkey', 'clothes', 'other']

// '40817810000000000000' → '··0000' — коротко, как номер карты.
function shortAccount(account: string): string {
  return account ? `··${account.slice(-4)}` : 'без номера'
}

export function StatementImportCard({ money, shifts, onImport }: Props) {
  const [state, setState] = useState<State>({ step: 'idle' })
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function readFile(file: File) {
    if (!/\.pdf$/iu.test(file.name) && file.type !== 'application/pdf') {
      setState({ step: 'idle', message: { kind: 'error', text: `«${file.name}» — не PDF. Нужна выписка Ozon Банка в PDF.` } })
      return
    }
    setState({ step: 'reading', fileName: file.name })
    try {
      const lines = await extractPdfLines(await file.arrayBuffer())
      const parsed = parseStatementLines(lines)
      // Знакомый счёт — берём запомненный тип. Новый — спросим.
      const kind = money.accounts[parsed.account]?.kind ?? null
      setState({ step: 'preview', fileName: file.name, parsed, kind })
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      setState({ step: 'idle', message: { kind: 'error', text: `Не удалось прочитать PDF: ${text}` } })
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // чтобы можно было выбрать тот же файл ещё раз
    if (file) void readFile(file)
  }

  // Перетаскивание файла. preventDefault в dragover обязателен —
  // иначе браузер не разрешит «бросить» файл и просто откроет PDF.
  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    setDragOver(true)
  }
  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files[0]
    if (file) void readFile(file)
  }
  const dropHandlers = {
    onDragOver: handleDragOver,
    onDragLeave: () => setDragOver(false),
    onDrop: handleDrop,
  }

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".pdf,application/pdf"
      className={styles.hiddenInput}
      onChange={handleInput}
    />
  )
  const pickFile = () => fileInputRef.current?.click()

  // ---------- Зона загрузки (нет открытой выписки) ----------
  if (state.step !== 'preview') {
    return (
      <div className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`} {...dropHandlers}>
        {hiddenInput}
        <FileUp size={18} className={styles.dropIcon} aria-hidden="true" />
        <p className={styles.dropTitle}>Перетащи PDF выписки сюда или выбери файл</p>
        <p className={styles.caption}>
          Выписка Ozon Банка — карты или счёта «Жизнь», «Турция», «Одежда и уход». Файл читается прямо в
          браузере и никуда не отправляется.
        </p>
        <Button size="sm" onClick={pickFile} disabled={state.step === 'reading'}>
          Выбрать файл
        </Button>
        {state.step === 'reading' && (
          <p className={styles.caption} role="status">
            Читаю «{state.fileName}»…
          </p>
        )}
        {state.step === 'idle' && state.message && (
          <p className={state.message.kind === 'ok' ? styles.okText : styles.error} role="status">
            {state.message.text}
          </p>
        )}
      </div>
    )
  }

  // ---------- Предпросмотр выписки ----------
  const { parsed, kind, fileName } = state
  const blocked = parsed.check.status === 'mismatch' || parsed.check.status === 'empty'
  const checkClass = parsed.check.status === 'ok' ? styles.okText : blocked ? styles.error : styles.caption
  const known = money.accounts[parsed.account]
  const close = (message?: Message) => setState({ step: 'idle', message })
  // Без номера счёта выписку можно загрузить только как карту: иначе её не к чему привязать.
  const noNumber = !parsed.account && kind !== null && kind !== 'card'

  let kindHint: string
  const guess = parsed.kind === 'savings' ? 'накопительный счёт' : 'счёт карты'
  if (!parsed.account) kindHint = 'Номер счёта в шапке не нашёлся.'
  else if (known) kindHint = `Счёт ${shortAccount(parsed.account)} уже знаком — тип запомнен (можно поменять).`
  else kindHint = `Счёт ${shortAccount(parsed.account)} — новый. Какой это? По операциям похоже на ${guess}. Запомню.`

  const period = parsed.periodEnd ? ` · по ${formatDate(parsed.periodEnd)}` : ''

  return (
    <Card
      title={`Выписка: счёт ${shortAccount(parsed.account)}${period}`}
      subtitle={fileName}
      actions={
        <Button size="sm" variant="text" onClick={pickFile}>
          Другой файл
        </Button>
      }
    >
      {hiddenInput}

      <div className={styles.importKind}>
        <span className={styles.caption}>Это счёт:</span>
        {KIND_ORDER.map((k) => (
          <Button key={k} size="sm" aria-pressed={kind === k} onClick={() => setState({ ...state, kind: k })}>
            {k === 'other' ? 'Другой' : ACCOUNT_LABELS[k]}
          </Button>
        ))}
      </div>
      <p className={styles.caption}>{kindHint}</p>

      <p className={`${checkClass} ${styles.importCheck}`} role="status">
        {parsed.check.message}
      </p>

      {kind === null ? (
        <p className={styles.importSummary}>Выбери, какой это счёт, — и появится, что загрузится.</p>
      ) : kind === 'card' ? (
        <CardPreview parsed={parsed} money={money} shifts={shifts} />
      ) : kind === 'other' ? (
        <p className={styles.importSummary}>
          Этот счёт не учитывается: запомню его как «другой», операции не сохраняю. Переводы с него и так видны в
          выписке карты.
        </p>
      ) : (
        <EnvelopePreview parsed={parsed} money={money} kind={kind} />
      )}
      {noNumber && <p className={styles.error}>Номер счёта не нашёлся — такую выписку можно загрузить только как карту.</p>}

      <div className={styles.buttons}>
        <Button
          variant="primary"
          disabled={blocked || kind === null || noNumber}
          onClick={() => kind && close({ kind: 'ok', text: onImport(parsed, kind) })}
        >
          {kind === 'other' ? 'Запомнить счёт' : 'Загрузить'}
        </Button>
        <Button variant="text" onClick={() => close()}>
          Отмена
        </Button>
      </div>
    </Card>
  )
}

// ---------- Выписка карты ----------

function CardPreview({ parsed, money, shifts }: { parsed: ParsedStatement; money: MoneyData; shifts: ShiftsData }) {
  // «Пробная» загрузка без сохранения: сколько операций новых и что будет с доходами.
  const ops = statementOperations(parsed)
  const merged = mergeTransactions(money.transactions, ops)
  const trial: MoneyData = {
    ...money,
    transactions: merged.transactions,
    accounts: parsed.account
      ? { ...money.accounts, [parsed.account]: { ...(money.accounts[parsed.account] ?? { balances: [] }), kind: 'card' } }
      : money.accounts,
  }
  const opsWithIds = ops.map((o) => ({ ...o, id: '' }))
  const dates = new Set(incomeShiftDates(opsWithIds, trial))
  const incomes = shiftIncomes(trial).filter((i) => dates.has(i.shiftDate))
  const matched = incomes.filter((i) => i.status === 'ok').length
  const toAdd = incomes.filter((i) => i.status === 'statement')
  const toCheck = incomes.filter((i) => i.status === 'check')
  const toMark = [...dates].filter((d) => !shifts.days[d])

  return (
    <>
      <p className={styles.importSummary}>
        Операций в выписке: {parsed.operations.length}. Новых: {merged.added}
        {merged.updated > 0 && `, обновятся: ${merged.updated}`}
        {merged.duplicates > 0 && `, без изменений: ${merged.duplicates}`}.
      </p>
      {incomes.length > 0 && (
        <div className={styles.importIncomes}>
          <p>
            Доход за {incomes.length} {plural(incomes.length, 'смену', 'смены', 'смен')}:{' '}
            {matched > 0 && (
              <Badge tone="accent" icon={<Check size={12} />}>
                {matched} сходится с введёнными
              </Badge>
            )}{' '}
            {toAdd.length > 0 && <Badge tone="neutral">добавится {toAdd.length}</Badge>}{' '}
            {toCheck.length > 0 && <Badge tone="danger">проверь {toCheck.length}</Badge>}
          </p>
          {toCheck.map((i) => (
            <p key={i.shiftDate} className={styles.error}>
              Смена {formatDayShort(i.shiftDate)}: ввёл {formatMoneyExact((i.manualKop ?? 0) / 100)}, по выписке{' '}
              {formatMoneyExact((i.statementKop ?? 0) / 100)} — после загрузки возьмётся сумма из выписки, введённую
              можно убрать.
            </p>
          ))}
          {toMark.length > 0 && (
            <p className={styles.caption}>
              В «Сменах» отмечу как смену {toMark.length} {plural(toMark.length, 'день', 'дня', 'дней')}, где доход
              пришёл, а смена не отмечена.
            </p>
          )}
        </div>
      )}
    </>
  )
}

// ---------- Выписка счёта-конверта ----------

function EnvelopePreview({ parsed, money, kind }: { parsed: ParsedStatement; money: MoneyData; kind: AccountKind }) {
  const ops = statementOperations(parsed)
  const merged = mergeTransactions(money.transactions, ops)
  let inKop = 0
  let outKop = 0
  let interestKop = 0
  for (const op of ops) {
    if (/(?:Выплата|Начисление) процентов|Капитализация/iu.test(op.purpose)) interestKop += op.amount
    else if (op.amount > 0) inKop += op.amount
    else outKop += op.amount
  }
  // Сходятся ли остатки с операциями: входящий + операции = исходящий.
  const opsSum = ops.reduce((s, o) => s + o.amount, 0)
  const consistent =
    parsed.openingKop !== null && parsed.closingKop !== null ? parsed.openingKop + opsSum === parsed.closingKop : null

  return (
    <>
      <p className={styles.importSummary}>
        Счёт «{ACCOUNT_LABELS[kind]}». Операций: {parsed.operations.length}, новых: {merged.added}
        {merged.updated > 0 && `, обновятся: ${merged.updated}`}. Пришло {formatSigned(inKop / 100)}, ушло{' '}
        {formatSigned(outKop / 100)}, проценты {formatSigned(interestKop / 100)}.
      </p>
      {parsed.closingKop !== null && (
        <p className={`${consistent === false ? styles.error : styles.caption} ${styles.importCheck}`}>
          Остаток на конец: {formatMoneyExact(parsed.closingKop / 100)}
          {parsed.periodEnd && ` (${formatDate(parsed.periodEnd)})`}
          {consistent === true && ' — сходится с операциями.'}
          {consistent === false && ' — не сходится с входящим остатком и операциями, проверь выписку.'}
        </p>
      )}
    </>
  )
}
