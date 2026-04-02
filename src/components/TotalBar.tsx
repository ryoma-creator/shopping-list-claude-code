import type { ListItem } from '@/types/database'

interface Props {
  items: ListItem[]
}

export function TotalBar({ items }: Props) {
  const unchecked = items.filter(i => !i.is_checked)
  const total = unchecked.reduce((sum, i) => sum + i.price * i.qty, 0)
  const remaining = unchecked.length

  return (
    <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl px-5 py-3 flex items-center justify-between shadow-lg shadow-rose-200/50">
      <div className="flex items-center gap-2">
        {remaining > 0 ? (
          <>
            <span className="text-white/80 text-xs font-medium">{remaining} left</span>
          </>
        ) : items.length > 0 ? (
          <span className="text-white/90 text-xs font-medium">✅ All done!</span>
        ) : (
          <span className="text-white/70 text-xs">No items yet</span>
        )}
      </div>
      <span className="text-lg font-bold tracking-tight">¥{total.toLocaleString()}</span>
    </div>
  )
}
