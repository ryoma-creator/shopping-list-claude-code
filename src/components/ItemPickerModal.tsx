'use client'
// アイテム選択モーダル（マスターから追加 or カスタム追加）
import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { CategoryBadge } from '@/components/CategoryBadge'
import type { Category, MasterItem } from '@/types/database'

interface Props {
  listId: string
  isOpen: boolean
  onClose: () => void
  masterItems: MasterItem[]
  onAdded?: () => void
}

export function ItemPickerModal({ listId, isOpen, onClose, masterItems, onAdded }: Props) {
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState(0)
  const [customQty, setCustomQty] = useState(1)
  const [adding, setAdding] = useState<string | null>(null)

  // マスターアイテムを追加
  const addMasterItem = async (masterItem: MasterItem) => {
    setAdding(masterItem.id)
    try {
      const maxOrder = masterItems.length
      await supabase.from('sl_list_items').insert({
        list_id: listId,
        master_item_id: masterItem.id,
        name: masterItem.name,
        price: masterItem.default_price,
        qty: masterItem.default_qty,
        is_checked: false,
        sort_order: maxOrder,
      })
      onAdded?.()
    } finally {
      setAdding(null)
    }
  }

  // カスタムアイテムを追加
  const addCustomItem = async () => {
    if (!customName.trim()) return
    setAdding('custom')
    try {
      await supabase.from('sl_list_items').insert({
        list_id: listId,
        master_item_id: null,
        name: customName.trim(),
        price: customPrice,
        qty: customQty,
        is_checked: false,
        sort_order: masterItems.length,
      })
      setCustomName('')
      setCustomPrice(0)
      setCustomQty(1)
      onAdded?.()
    } finally {
      setAdding(null)
    }
  }

  if (!isOpen) return null

  // カテゴリでグループ化
  const grouped = masterItems.reduce<Record<string, MasterItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-rose-800">アイテムを選ぶ</h2>
          <button onClick={onClose} className="text-rose-300 hover:text-rose-500">
            <X size={20} />
          </button>
        </div>

        {/* カスタム追加フォーム */}
        <div className="border border-rose-100 rounded-2xl p-4 mb-4 space-y-2">
          <p className="text-xs font-semibold text-rose-500 uppercase">カスタム追加</p>
          <input
            type="text"
            placeholder="商品名"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              placeholder="価格"
              value={customPrice}
              onChange={(e) => setCustomPrice(Number(e.target.value))}
              className="flex-1 border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <input
              type="number"
              min={1}
              placeholder="個数"
              value={customQty}
              onChange={(e) => setCustomQty(Number(e.target.value))}
              className="w-20 border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <button
              onClick={addCustomItem}
              disabled={adding === 'custom' || !customName.trim()}
              className="bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl px-3 py-2 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* マスターアイテム一覧 */}
        <div className="overflow-y-auto flex-1 space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <CategoryBadge category={cat as Category} className="mb-2" />
              <div className="space-y-1">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addMasterItem(item)}
                    disabled={adding === item.id}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm text-rose-800">{item.name}</span>
                    <span className="text-xs text-rose-400">¥{item.default_price} × {item.default_qty}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
