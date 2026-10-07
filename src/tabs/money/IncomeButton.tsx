// Кнопка «Получил за смену» — одна и та же на «Сегодня» и во вкладке «Деньги».
// Нажатие открывает/закрывает форму ввода дохода (её показывает тот, кто вставил кнопку).
import { ActionTile } from '../../components/ui'

// Кошелёк со стрелкой внутрь — своего такого значка в lucide нет, рисуем сами
// в том же стиле (24 px, линия 2.2, скруглённые концы).
function WalletInIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      <path d="M14 13.5h7" />
      <path d="m17.5 10.5-3.5 3 3.5 3" />
    </svg>
  )
}

interface Props {
  open: boolean // форма сейчас открыта
  onToggle: () => void
}

export function IncomeButton({ open, onToggle }: Props) {
  return (
    <ActionTile
      icon={<WalletInIcon />}
      title="Получил за смену"
      caption="внести доход"
      aria-expanded={open}
      onClick={onToggle}
    />
  )
}
