// 合計金額バーコンポーネント
import type { ListItem } from '@/types/database'

interface Props {
  items: ListItem[]
}

export function TotalBar({ items }: Props) {
  // 未購入アイテムの合計金額を計算
  const total = items
    .filter((item) => !item.is_checked)
    .reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto px-4 py-2 pointer-events-none">
      <div className="bg-rose-500 text-white rounded-2xl px-5 py-3 flex items-center justify-between shadow-lg">
        <span className="text-sm font-medium opacity-90">残りの合計</span>
        <span className="text-lg font-bold">合計 ¥{total.toLocaleString()}</span>
      </div>
    </div>
  )
}
