// Загрузка PDF-выписки Ozon Банка: большая зона «перетащи файл сюда», чтение,
// сверка с итогами, предпросмотр и импорт.
//   выписка карты           → операции попадают в «Операции по карте» (без дублей);
//   выписка накопительного  → пополнения, снятия и проценты идут в копилку,
//                             «Исходящий остаток» сверяется с суммой копилки.
// Тип выписки: если счёт уже встречался — берём запомненный, иначе определяем по содержимому.
import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { FileUp } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import type { AccountInfo, Deposit, Transaction } from '../../types'
import { mergeTransactions, piggyCandidates, statementOperations } from './moneyLogic'
import type { StatementOpening } from './moneyLogic'
import type { PiggyCandidate } from './moneyLogic'
import { formatDate, formatMoneyExact, formatSigned, plural } from './format'
import { parseStatementLines } from './statement/parseStatement'
import type { ParsedStatement, StatementKind } from './statement/parseStatement'
import { extractPdfLines } from './statement/pdfText'
import styles from './MoneyTab.module.css'

interface Props {
  transactions: Transaction[]
  deposits: Deposit[]
  accounts: Record<string, AccountInfo>
  savedTotal: number // сколько сейчас в копилке, ₽
  onImportCard: (parsed: ParsedStatement) => { added: number; updated: number; duplicates: number }
  onImportSavings: (parsed: ParsedStatement, deposits: Deposit[]) => { removed: number }
}

type Message = { kind: 'ok' | 'error'; text: string }

type State =
  | { step: 'idle'; message?: Message }
  | { step: 'reading'; fileName: string }
  | { step: 'preview'; fileName: string; parsed: ParsedStatement; kind: StatementKind }

// '40817810000000000000' → '··0000' — коротко, как номер карты.
function shortAccount(account: string): string {
  return account ? `··${account.slice(-4)}` : 'без номера'
}

const CANDIDATE_LABEL: Record<PiggyCandidate['kind'], string> = {
  transfer: 'пополнение',
  withdrawal: 'снятие',
  interest: 'проценты',
  opening: 'остаток на начало выписки',
}

// «Входящий остаток» выписки — деньги, что лежали на счёте до начала периода.
// Дата — начало периода (или первая операция, если периода в шапке нет).
function statementOpening(parsed: ParsedStatement): StatementOpening | null {
  if (parsed.openingKop === null) return null
  const date = parsed.periodStart ?? [...parsed.operations].map((o) => o.date).sort()[0]
  return date ? { account: parsed.account, date, amountKop: parsed.openingKop } : null
}

export function StatementImportCard({
  transactions,
  deposits,
  accounts,
  savedTotal,
  onImportCard,
  onImportSavings,
}: Props) {
  const [state, setState] = useState<State>({ step: 'idle' })
  // Какие записи отмечены для копилки (по ключу операции).
  const [checked, setChecked] = useState<Set<string>>(new Set())
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
      // Новые (ещё не добавленные) записи копилки отмечаем сразу.
      const candidates = piggyCandidates(statementOperations(parsed), deposits, statementOpening(parsed))
      setChecked(new Set(candidates.filter((c) => !c.already).map((c) => c.key)))
      // Знакомый счёт — берём запомненный тип, иначе — определённый по содержимому.
      const kind = accounts[parsed.account]?.kind ?? parsed.kind
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
          Выписка Ozon Банка — карты или накопительного счёта. Файл читается прямо в браузере и никуда не
          отправляется.
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
  const known = accounts[parsed.account]
  const close = (message?: Message) => setState({ step: 'idle', message })

  let kindHint: string
  if (!parsed.account) kindHint = 'Номер счёта в шапке не нашёлся — тип определён по содержимому.'
  else if (known) kindHint = `Счёт ${shortAccount(parsed.account)} уже знаком — тип запомнен.`
  else kindHint = `Счёт ${shortAccount(parsed.account)} — новый, тип определён по содержимому. Запомню его.`

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
        <span className={styles.caption}>Тип выписки:</span>
        <Button size="sm" aria-pressed={kind === 'card'} onClick={() => setState({ ...state, kind: 'card' })}>
          Карта
        </Button>
        <Button size="sm" aria-pressed={kind === 'savings'} onClick={() => setState({ ...state, kind: 'savings' })}>
          Накопительный счёт
        </Button>
      </div>
      <p className={styles.caption}>{kindHint}</p>

      <p className={`${checkClass} ${styles.importCheck}`} role="status">
        {parsed.check.message}
      </p>

      {kind === 'card' ? (
        <CardPreview
          parsed={parsed}
          transactions={transactions}
          blocked={blocked}
          onImport={() => {
            const { added, updated, duplicates } = onImportCard(parsed)
            let text = `Карта ${shortAccount(parsed.account)}: новых операций ${added}.`
            if (updated > 0) text += ` Обновлено: ${updated}.`
            if (duplicates > 0) text += ` Без изменений: ${duplicates}.`
            close({ kind: 'ok', text })
          }}
          onCancel={() => close()}
        />
      ) : (
        <SavingsPreview
          parsed={parsed}
          deposits={deposits}
          savedTotal={savedTotal}
          checked={checked}
          setChecked={setChecked}
          blocked={blocked}
          onImport={(list) => {
            const { removed } = onImportSavings(parsed, list)
            const sum = list.reduce((s, d) => s + d.amount, 0)
            let text =
              list.length > 0
                ? `В копилку: ${list.length} ${plural(list.length, 'запись', 'записи', 'записей')} на ${formatSigned(sum)}.`
                : 'Новых записей для копилки нет, остаток счёта запомнен.'
            if (removed > 0) text += ` Убрано старых копий из операций карты: ${removed}.`
            close({ kind: 'ok', text })
          }}
          onCancel={() => close()}
        />
      )}
    </Card>
  )
}

// ---------- Выписка карты ----------

function CardPreview(props: {
  parsed: ParsedStatement
  transactions: Transaction[]
  blocked: boolean
  onImport: () => void
  onCancel: () => void
}) {
  const { parsed, transactions, blocked } = props
  // Сколько операций новых — «пробный» merge без сохранения.
  const ops = statementOperations(parsed)
  const preview = mergeTransactions(transactions, ops)
  const changes = preview.added + preview.updated

  return (
    <>
      <p className={styles.importSummary}>
        Операций в выписке: {parsed.operations.length}. Новых: {preview.added}
        {preview.updated > 0 && `, обновятся: ${preview.updated}`}
        {preview.duplicates > 0 && `, без изменений: ${preview.duplicates}`}.
      </p>
      <div className={styles.buttons}>
        <Button variant="primary" onClick={props.onImport} disabled={blocked || changes === 0}>
          Загрузить {changes}
        </Button>
        <Button variant="text" onClick={props.onCancel}>
          Отмена
        </Button>
      </div>
    </>
  )
}

// ---------- Выписка накопительного ----------

function SavingsPreview(props: {
  parsed: ParsedStatement
  deposits: Deposit[]
  savedTotal: number
  checked: Set<string>
  setChecked: (update: (prev: Set<string>) => Set<string>) => void
  blocked: boolean
  onImport: (deposits: Deposit[]) => void
  onCancel: () => void
}) {
  const { parsed, deposits, savedTotal, checked, blocked } = props
  const ops = statementOperations(parsed)
  const candidates = piggyCandidates(ops, deposits, statementOpening(parsed))
  const fresh = candidates.filter((c) => !c.already)
  const selected = fresh.filter((c) => checked.has(c.key))
  const selectedSum = selected.reduce((s, c) => s + c.amount, 0)

  // Итоги по видам — чтобы не читать длинный список.
  const totals = (kind: PiggyCandidate['kind']) => {
    const list = fresh.filter((c) => c.kind === kind)
    return { count: list.length, sum: list.reduce((s, c) => s + c.amount, 0) }
  }
  const tIn = totals('transfer')
  const tOut = totals('withdrawal')
  const tInterest = totals('interest')
  const tOpening = totals('opening')

  // Сверка: сколько станет в копилке и сколько на счёте по выписке (в копейках, без ошибок дробей).
  const afterKop = Math.round(savedTotal * 100) + Math.round(selectedSum * 100)
  const closing = parsed.closingKop
  const diffKop = closing === null ? null : afterKop - closing

  function toggle(key: string) {
    props.setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <>
      {candidates.length === 0 ? (
        <p className={styles.importSummary}>Переводов собственных средств и процентов в выписке нет.</p>
      ) : (
        <>
          <p className={styles.importSummary}>
            {fresh.length === 0
              ? 'Всё из этой выписки уже в копилке.'
              : `Новое для копилки: пополнений ${tIn.count} (${formatSigned(tIn.sum)}), снятий ${tOut.count} (${formatSigned(tOut.sum)}), процентов ${tInterest.count} (${formatSigned(tInterest.sum)})${tOpening.count > 0 ? `, остаток на начало выписки ${formatSigned(tOpening.sum)} — деньги, что были на счёте до её первой даты` : ''}. Сними галочку, если что-то не нужно.`}
          </p>
          <ul className={styles.candidates}>
            {candidates.map((c) => (
              <li key={c.key}>
                <label className={styles.candidate}>
                  <input
                    type="checkbox"
                    checked={c.already || checked.has(c.key)}
                    disabled={c.already}
                    onChange={() => toggle(c.key)}
                  />
                  <span className={styles.txDate}>{formatDate(c.date)}</span>
                  <span className={c.amount > 0 ? styles.candidateAmount : styles.candidateMinus}>
                    {formatSigned(c.amount)}
                  </span>
                  <span className={styles.caption}>
                    {CANDIDATE_LABEL[c.kind]}
                    {c.already && ' · уже в копилке'}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {closing === null ? (
        <p className={`${styles.caption} ${styles.importCheck}`}>
          В выписке нет «Исходящего остатка» — сверить копилку со счётом не получится.
        </p>
      ) : (
        <p className={`${diffKop === 0 ? styles.okText : styles.error} ${styles.importCheck}`} role="status">
          На счёте по выписке: {formatMoneyExact(closing / 100)}. В копилке будет: {formatMoneyExact(afterKop / 100)}
          {diffKop === 0
            ? ' — сходится.'
            : ` — расхождение ${formatSigned((diffKop ?? 0) / 100)} (ручные записи или операции вне периода выписки).`}
        </p>
      )}

      <div className={styles.buttons}>
        <Button
          variant="primary"
          disabled={blocked}
          onClick={() =>
            props.onImport(
              selected.map((c) => ({ id: crypto.randomUUID(), date: c.date, amount: c.amount, importKey: c.key })),
            )
          }
        >
          {selected.length > 0 ? `В копилку: ${selected.length} на ${formatSigned(selectedSum)}` : 'Запомнить остаток'}
        </Button>
        <Button variant="text" onClick={props.onCancel}>
          Отмена
        </Button>
      </div>
    </>
  )
}
