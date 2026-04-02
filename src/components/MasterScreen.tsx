'use client'
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
  vegetables: 'Veggies', frozen: 'Frozen', bakery: 'Bakery',
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
    // Also update parent so picker stays in sync
    onMasterItemsChange(items.filter(i => i.id !== id))
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
        <h1 className="text-lg font-bold text-rose-800">📋 My Items</h1>
        <button onClick={() => { setEditItem(undefined); setModalOpen(true) }}
          className="flex items-center gap-1.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-all shadow-md shadow-rose-200/50 active:scale-95">
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        {items.length === 0 && (
          <EmptyState icon={<Plus size={40} />} title="No items yet"
            subtitle="Register items you buy often so you can quickly add them to your list!" />
        )}

        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">{CATEGORY_EMOJI[cat] ?? '📦'}</span>
              <span className="text-sm font-bold text-rose-700">{CATEGORY_LABEL[cat] ?? cat}</span>
              <span className="text-[10px] text-rose-300">({catItems.length})</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {catItems.map(item => (
                <div key={item.id}
                  className="bg-white rounded-xl border border-rose-100 overflow-hidden relative group">
                  <div className="aspect-square flex items-center justify-center bg-rose-50 overflow-hidden">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{CATEGORY_EMOJI[item.category] ?? '📦'}</span>
                    )}
                  </div>
                  <div className="px-1.5 py-1 text-center">
                    <p className="text-[10px] font-semibold text-rose-800 line-clamp-1">{item.name}</p>
                    <p className="text-[9px] text-rose-400">¥{item.default_price.toLocaleString()}</p>
                  </div>
                  {/* Edit/Delete overlay on hover/long press */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
                    <button onClick={() => { setEditItem(item); setModalOpen(true) }}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow" aria-label="Edit">
                      <Pencil size={13} className="text-rose-500" />
                    </button>
                    <button onClick={() => deleteItem(item.id)}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow" aria-label="Delete">
                      <Trash2 size={13} className="text-rose-400" />
                    </button>
                  </div>
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
