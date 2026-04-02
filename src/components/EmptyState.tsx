// 空の状態表示コンポーネント
import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  subtitle: string
}

export function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-8">
      <div className="text-5xl opacity-40">{icon}</div>
      <p className="text-rose-800 font-semibold text-lg">{title}</p>
      <p className="text-rose-400 text-sm leading-relaxed">{subtitle}</p>
    </div>
  )
}
