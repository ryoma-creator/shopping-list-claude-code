'use client'
// Shopping list item row
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ListItem } from '@/types/database'

interface Props {
  item: ListItem
  onToggle: (id: string, checked: boolean) => void
  onDeleteRequest: (id: string) => void
}

export function ItemRow({ item, onToggle, onDeleteRequest }: Props) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-rose-100 animate-fall-in',
      item.is_checked && 'opacity-40'
    )}>
      {/* Check circle */}
      <button
        onClick={() => onToggle(item.id, !item.is_checked)}
        className={cn(
          'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90',
          item.is_checked
            ? 'bg-rose-400 border-rose-400'
            : 'border-rose-300 hover:border-rose-400'
        )}
        aria-label={item.is_checked ? 'Uncheck' : 'Check off'}
      >
        {item.is_checked && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-rose-900 truncate">{item.name}</p>
        <p className="text-xs text-rose-400">Price: ¥{item.price.toLocaleString()} · Qty: {item.qty}</p>
      </div>

      {/* Subtotal */}
      <span className="text-sm font-semibold text-rose-700 flex-shrink-0">
        ¥{(item.price * item.qty).toLocaleString()}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDeleteRequest(item.id)}
        className="p-1 text-rose-300 hover:text-rose-500 transition-colors flex-shrink-0 active:scale-90"
        aria-label="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
