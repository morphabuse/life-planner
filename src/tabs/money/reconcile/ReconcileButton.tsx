// Сверка остатков по скриншоту банка. Подтверждение — максимум 2–3 нажатия:
//   1) «Сверить» — сразу открывается выбор картинок (можно несколько);
//   2) выбрал скрины — они распознаются в браузере (ничего не отправляется наружу);
//   3) окно: 4 строки «счёт — сумма» и одна большая кнопка «Всё верно».
// Нажатие на сумму — исправить вручную (цифровая клавиатура). Накопительный счёт
// не распознался — пустое поле с курсором. Карта необязательна: нет на скринах —
// «с прошлой сверки» и мелкая кнопка «+ скрин» для главного экрана.
// withManual — ещё тихая кнопка «Ввести вручную»: то же окно без скриншотов.
import { useRef, useState } from 'react'
import { Check, ScanLine } from 'lucide-react'
import type { BalanceKind, MoneyData } from '../../../types'
import { Button, Input, Sheet } from '../../../components/ui'
import { ACCOUNT_LABELS, ENVELOPES, balanceOf } from '../moneyLogic'
import { formatMoneyExact, formatStamp } from '../format'
import { recognizeImages } from './ocr'
import { parseBalanceScreens, parseRubInput } from './parseScreens'
import type { ScreenBalances } from './parseScreens'
import styles from '../MoneyTab.module.css'

// Порядок строк: сначала конверты (главный скрин «Ваши накопления»), карта — последней.
const ROWS: BalanceKind[] = [...ENVELOPES, 'card']

// Копейки → строка для поля ввода: 23456 → «234,56».
const toInput = (kop: number) => (kop / 100).toFixed(2).replace('.', ',')

type Values = Partial<Record<BalanceKind, string>>

interface Props {
  money: MoneyData
  today: string
  onSave: (balances: Partial<Record<BalanceKind, number>>) => void // копейки; карта — только если сверена сейчас
  label?: string
  variant?: 'primary' | 'secondary' | 'text'
  withManual?: boolean
}

export function ReconcileButton({ money, today, onSave, label = 'Сверить', variant = 'secondary', withManual }: Props) {
  const [open, setOpen] = useState(false)
  const [fromScreens, setFromScreens] = useState(true) // по скриншотам или вручную
  const [recognizing, setRecognizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [values, setValues] = useState<Values>({})
  const [editing, setEditing] = useState<BalanceKind | null>(null) // какую сумму правлю
  const [cardFromPrevious, setCardFromPrevious] = useState(false) // карта — с прошлой сверки
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const extraInput = useRef<HTMLInputElement>(null) // «+ скрин»

  const previousCard = money.reconciled.card

  // Распознанные суммы → значения полей. keep — что уже есть (при «+ скрин» не затираем).
  function applyFound(found: ScreenBalances, keep: Values) {
    const next: Values = { ...keep }
    for (const kind of ROWS) if (found[kind] !== undefined) next[kind] = toInput(found[kind])
    if (found.card !== undefined) setCardFromPrevious(false)
    else if (next.card === undefined && previousCard) {
      next.card = toInput(previousCard.kop)
      setCardFromPrevious(true)
    }
    setValues(next)
    // Не распознался накопительный счёт — сразу открываем его поле.
    setEditing(ENVELOPES.find((k) => !next[k]) ?? null)
  }

  async function recognize(images: File[], keep: Values) {
    setRecognizing(true)
    setProgress(0)
    setError('')
    try {
      const texts = await recognizeImages(images, setProgress)
      applyFound(parseBalanceScreens(texts, money.settings.reconcileNames), keep)
    } catch (e) {
      setError(`Не получилось распознать скриншот (${e instanceof Error ? e.message : 'ошибка'}). Впиши суммы вручную.`)
      applyFound({}, keep)
    }
    setRecognizing(false)
  }

  // Шаг 2: выбрал скрины — открываем окно и распознаём.
  function handleFiles(list: FileList | null, extra: boolean) {
    const images = list ? [...list] : []
    if (extra && extraInput.current) extraInput.current.value = ''
    if (!extra && fileInput.current) fileInput.current.value = ''
    if (images.length === 0) return
    if (!extra) {
      setFromScreens(true)
      setCardFromPrevious(false)
      setOpen(true)
    }
    void recognize(images, extra ? values : {})
  }

  // «Ввести вручную»: то же окно, суммы — текущие остатки, их можно поправить.
  function openManual() {
    const current: Values = {}
    for (const kind of ROWS) {
      const b = balanceOf(money, kind, today)
      if (b) current[kind] = toInput(b.kop)
    }
    setFromScreens(false)
    setValues(current)
    setCardFromPrevious(false)
    setEditing(ENVELOPES.find((k) => !current[k]) ?? null)
    setError('')
    setOpen(true)
  }

  const parsed = Object.fromEntries(ROWS.map((k) => [k, values[k] ? parseRubInput(values[k]!) : null])) as Record<
    BalanceKind,
    number | null
  >
  const missing = ENVELOPES.filter((k) => parsed[k] === null)
  const cardInvalid = Boolean(values.card) && parsed.card === null

  // Шаг 3: «Всё верно».
  function handleConfirm() {
    if (missing.length > 0 || cardInvalid) return
    const balances: Partial<Record<BalanceKind, number>> = {}
    for (const kind of ENVELOPES) balances[kind] = parsed[kind]!
    // Карта с прошлой сверки и не исправлена — не пересохраняем (остаётся старое время сверки).
    const cardUnchanged = cardFromPrevious && previousCard !== undefined && parsed.card === previousCard.kop
    if (parsed.card !== null && !cardUnchanged) balances.card = parsed.card
    onSave(balances)
    setOpen(false)
  }

  return (
    <>
      {/* Шаг 1: кнопка сразу открывает выбор картинок. */}
      <Button variant={variant} size="sm" icon={<ScanLine size={16} />} onClick={() => fileInput.current?.click()}>
        {label}
      </Button>
      {withManual && (
        <Button variant="text" size="sm" onClick={openManual}>
          Ввести вручную
        </Button>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className={styles.hiddenInput}
        aria-label="Скриншоты банка для сверки"
        onChange={(e) => handleFiles(e.target.files, false)}
      />

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={fromScreens ? 'Сверка по скриншоту' : 'Ввести остатки'}
        subtitle="Суммы как в приложении банка, до копейки"
      >
        {recognizing ? (
          <p className={styles.reconcileProgress} role="status">
            Распознаю скриншот… {Math.round(progress * 100)} %
            <span className={styles.caption}>Всё распознаётся здесь, на устройстве: картинки никуда не отправляются.</span>
          </p>
        ) : (
          <>
            {error && <p className={styles.error}>{error}</p>}
            <ul className={styles.reconcileRows}>
              {ROWS.map((kind) => {
                const name = ACCOUNT_LABELS[kind]
                const isEditing = editing === kind || (kind !== 'card' && !values[kind])
                return (
                  <li key={kind} className={styles.reconcileRow}>
                    <span className={styles.reconcileName}>
                      {name}
                      {kind === 'card' && cardFromPrevious && previousCard && (
                        <span className={styles.caption}>с прошлой сверки, {formatStamp(previousCard.at)}</span>
                      )}
                      {kind === 'card' && !values.card && <span className={styles.caption}>необязательно</span>}
                    </span>
                    {/* Карты нет на скринах — мелкая кнопка: добавить скрин главного экрана. */}
                    {kind === 'card' && fromScreens && (cardFromPrevious || !values.card) && (
                      <Button variant="text" size="sm" onClick={() => extraInput.current?.click()}>
                        + скрин
                      </Button>
                    )}
                    {isEditing ? (
                      <Input
                        className={styles.reconcileInput}
                        aria-label={`${name}, ₽`}
                        inputMode="decimal"
                        placeholder="0,00"
                        autoFocus={editing === kind}
                        value={values[kind] ?? ''}
                        error={values[kind] && parsed[kind] === null ? 'Число, например 234,56' : undefined}
                        onChange={(e) => setValues((v) => ({ ...v, [kind]: e.target.value }))}
                        onBlur={() => setEditing((cur) => (cur === kind ? null : cur))}
                      />
                    ) : (
                      // Нажатие на сумму — исправить вручную.
                      <button
                        type="button"
                        className={styles.reconcileAmount}
                        aria-label={`${name}: ${values[kind] ? `${values[kind]} ₽` : 'нет суммы'}. Исправить`}
                        onClick={() => setEditing(kind)}
                      >
                        {parsed[kind] !== null ? formatMoneyExact(parsed[kind]! / 100) : '—'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
            {missing.length > 0 && (
              <p className={styles.caption}>Впиши: {missing.map((k) => ACCOUNT_LABELS[k]).join(', ')}.</p>
            )}
            <Button
              variant="primary"
              size="lg"
              className={styles.reconcileConfirm}
              icon={<Check size={18} />}
              disabled={missing.length > 0 || cardInvalid}
              onClick={handleConfirm}
            >
              Всё верно
            </Button>
          </>
        )}
        <input
          ref={extraInput}
          type="file"
          accept="image/*"
          multiple
          className={styles.hiddenInput}
          aria-label="Ещё скриншот (главный экран с основным счётом)"
          onChange={(e) => handleFiles(e.target.files, true)}
        />
      </Sheet>
    </>
  )
}
