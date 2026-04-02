'use client'
// ボトムナビゲーションバー
import { ShoppingCart, BookOpen, LayoutList } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabId = 'today' | 'master' | 'templates'

const TABS: { id: TabId; icon: typeof ShoppingCart; label: string }[] = [
  { id: 'today',     icon: ShoppingCart, label: "Today's List" },
  { id: 'master',    icon: BookOpen,     label: 'My Items' },
  { id: 'templates', icon: LayoutList,   label: 'Past Lists' },
]

interface Props {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function TabBar({ activeTab, onTabChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-rose-100 flex safe-area-pb">
      {TABS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
            activeTab === id ? 'text-rose-500' : 'text-rose-300 hover:text-rose-400'
          )}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
