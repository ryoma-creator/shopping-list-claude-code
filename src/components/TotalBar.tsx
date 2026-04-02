import type { ListItem } from '@/types/database'

interface Props {
  items: ListItem[]
}

export function TotalBar({ items }: Props) {
  // Total of ALL items (not just unchecked) — only decreases on delete
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  return (
    <div className="bg-white/80 backdrop-blur border border-rose-100 rounded-2xl px-5 py-3 flex items-center justify-between">
      <span className="text-xs text-rose-400 font-medium">Total</span>
      <span className="text-base font-bold text-rose-700 tracking-tight">¥{total.toLocaleString()}</span>
    </div>
  )
}
