// Окно поверх страницы: на телефоне (≤ 640 px) — нижняя панель, выезжает снизу;
// на компьютере — окно по центру. Сделано на нативном <dialog> (showModal):
// браузер сам затемняет фон, держит фокус внутри окна и закрывает его по Esc.
// Закрыть можно: крестиком, кликом по затемнённому фону, Esc, свайпом вниз за шапку.
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import styles from './Sheet.module.css'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
}

// На сколько пикселей потянуть шапку вниз, чтобы панель закрылась.
const SWIPE_CLOSE_PX = 80

export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  // Свайп: где палец начал и насколько панель сейчас сдвинута вниз.
  const startY = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)

  // Последняя версия onClose — для событий браузера ниже (подписываемся один раз).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Браузер сам закрывает <dialog> по Esc. Слушаем его события напрямую:
  // cancel — нажали Esc (закрытие делаем сами, через open), close — окно закрылось
  // любым способом. В обоих случаях сообщаем наверх, чтобы open стал false
  // и окно потом снова открывалось.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onCloseRef.current()
    }
    const handleClose = () => onCloseRef.current()
    dialog.addEventListener('cancel', handleCancel)
    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
      dialog.removeEventListener('close', handleClose)
    }
  }, [])

  // Открываем/закрываем сам <dialog>, когда меняется open.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Клик по затемнённому фону: событие приходит на сам <dialog>,
  // а клики внутри панели — на её содержимое.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === ref.current) onClose()
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') return // свайп — только пальцем
    // Нажатие на крестик — это нажатие, а не свайп: иначе «захват» пальца ниже
    // забрал бы клик у кнопки.
    if ((event.target as HTMLElement).closest('button')) return
    startY.current = event.clientY
    // «Захват»: палец может уйти за шапку, а движения всё равно придут сюда.
    // Если браузер не может захватить указатель — свайп работает и без этого.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* ничего страшного */
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (startY.current === null) return
    setDragY(Math.max(0, event.clientY - startY.current)) // вверх не тянется
  }

  function handlePointerUp() {
    if (startY.current === null) return
    startY.current = null
    if (dragY > SWIPE_CLOSE_PX) onClose()
    setDragY(0)
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClick={handleClick}
      style={dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
    >
      <div className={styles.panel}>
        {/* Шапка — за неё можно тянуть вниз, чтобы закрыть. */}
        <div
          className={styles.header}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span className={styles.grabber} aria-hidden="true" />
          <div className={styles.headings}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <Button
            variant="text"
            size="lg"
            iconOnly
            icon={<X size={20} />}
            aria-label="Закрыть"
            onClick={onClose}
          />
        </div>
        {open && children}
      </div>
    </dialog>
  )
}
