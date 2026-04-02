// Total price bar component
import type { ListItem } from '@/types/database'

interface Props {
  items: ListItem[]
}

export function TotalBar({ items }: Props) {
  // Calculate total of unchecked items
  const total = items
    .filter((item) => !item.is_checked)
    .reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <div className="bg-rose-500 text-white rounded-2xl px-5 py-3 flex items-center justify-between shadow-lg">
      <span className="text-sm font-medium opacity-90">Remaining</span>
      <span className="text-lg font-bold">Total ¥{total.toLocaleString()}</span>
    </div>
  )
}
