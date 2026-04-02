// カテゴリバッジコンポーネント
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

// カテゴリ表示設定
const CATEGORY_CONFIG: Record<Category, { label: string; className: string }> = {
  meat:       { label: '🥩 お肉',   className: 'bg-rose-100 text-rose-700' },
  fish:       { label: '🐟 魚',     className: 'bg-blue-100 text-blue-700' },
  dairy:      { label: '🥛 乳製品', className: 'bg-sky-100 text-sky-700' },
  fruits:     { label: '🍎 果物',   className: 'bg-orange-100 text-orange-700' },
  vegetables: { label: '🥦 野菜',   className: 'bg-green-100 text-green-700' },
  frozen:     { label: '🧊 冷凍',   className: 'bg-blue-100 text-blue-700' },
  bakery:     { label: '🍞 パン',   className: 'bg-amber-100 text-amber-700' },
  drinks:     { label: '🥤 飲み物', className: 'bg-cyan-100 text-cyan-700' },
  snacks:     { label: '🍿 お菓子', className: 'bg-yellow-100 text-yellow-700' },
  other:      { label: 'その他',    className: 'bg-gray-100 text-gray-600' },
}

interface Props {
  category: Category
  className?: string
}

export function CategoryBadge({ category, className }: Props) {
  const config = CATEGORY_CONFIG[category]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
