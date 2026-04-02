'use client'
// My Items screen — register frequently bought items（写真対応）
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { MasterItemModal } from '@/components/MasterItemModal'
import { EmptyState } from '@/components/EmptyState'
import type { Category, MasterItem } from '@/types/database'

const CATEGORY_EMOJI: Record<Category | string, string> = {
  meat: '🥩', fish: '🐟', dairy: '🥛', fruits: '🍎',
  vegetables: '🥦', frozen: '🧊', bakery: '🍞', drinks: '🥤',
  snacks: '🍿', other: '📦',
}

const CATEGORY_LABEL: Record<Category | string, string> = {
  meat: 'Meat', fish: 'Fish', dairy: 'Dairy', fruits: 'Fruits',
  vegetables: 'Vegetables', frozen: 'Frozen', bakery: 'Bakery',
  drinks: 'Drinks', snacks: 'Snacks', other: 'Other',
}

interface Props {
  onMasterItemsChange: (items: MasterItem[]) => void
}

export function MasterScreen({ onMasterItemsChange }: Props) {
  const [items, setItems] = useState<MasterItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<MasterItem | undefined>()

  const loadItems = useCallback(async () => {
    const { data } = await supabase.from('sl_master_items').select('*').order('category').order('name')
    if (data) { setItems(data); onMasterItemsChange(data) }
  }, [onMasterItemsChange])

  useEffect(() => { loadItems() }, [loadItems])

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('sl_master_items').delete().eq('id', id)
  }

  const grouped = items.reduce<Record<string, MasterItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-rose-800">📋 My Items</h1>
        <button onClick={() => { setEditItem(undefined); setModalOpen(true) }}
          className="flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors">
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-5">
        {items.length === 0 && (
          <EmptyState icon={<Plus size={40} />} title="No items yet"
            subtitle="Add the items you buy regularly. Then pick them quickly when shopping!" />
        )}

        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            {/* カテゴリヘッダー */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{CATEGORY_EMOJI[cat] ?? '📦'}</span>
              <span className="text-sm font-bold text-rose-700">{CATEGORY_LABEL[cat] ?? cat}</span>
              <span className="text-xs text-rose-300 ml-1">({catItems.length})</span>
            </div>

            {/* アイテムリスト（写真サムネイル対応） */}
            <div className="space-y-1.5">
              {catItems.map(item => (
                <div key={item.id}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-rose-100 px-3 py-2.5">
                  {/* サムネイル: 写真があれば写真、なければ絵文字 */}
                  <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      CATEGORY_EMOJI[item.category] ?? '📦'
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-rose-900 truncate">{item.name}</p>
                    <p className="text-xs text-rose-400">¥{item.default_price.toLocaleString()} × {item.default_qty}</p>
                  </div>
                  {/* Edit */}
                  <button onClick={() => { setEditItem(item); setModalOpen(true) }}
                    className="p-1.5 text-rose-300 hover:text-rose-500 transition-colors" aria-label="Edit">
                    <Pencil size={14} />
                  </button>
                  {/* Delete */}
                  <button onClick={() => deleteItem(item.id)}
                    className="p-1.5 text-rose-200 hover:text-rose-400 transition-colors" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <MasterItemModal item={editItem} isOpen={modalOpen}
        onClose={() => setModalOpen(false)} onSave={loadItems} />
    </div>
  )
}
