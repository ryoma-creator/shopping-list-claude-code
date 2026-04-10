'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { MasterItemModal } from '@/components/MasterItemModal'
import { AiMasterScanModal } from '@/components/AiMasterScanModal'
import type { Category, MasterItem } from '@/types/database'

const CATEGORY_EMOJI: Record<Category | string, string> = {
  meat: '🥩', fish: '🐟', dairy: '🥛', fruits: '🍎',
  vegetables: '🥦', frozen: '🧊', bakery: '🍞', drinks: '🥤',
  snacks: '🍿', other: '📦',
}

const CATEGORY_LABEL: Record<Category | string, string> = {
  meat: 'Meat', fish: 'Fish', dairy: 'Milk', fruits: 'Fruits',
  vegetables: 'Veggies', frozen: 'Frozen', bakery: 'Bakery',
  drinks: 'Drinks', snacks: 'Snacks', other: 'Other',
}

interface Props {
  onMasterItemsChange: (items: MasterItem[]) => void
  userId: string
}

export function MasterScreen({ onMasterItemsChange, userId }: Props) {
  const [items, setItems] = useState<MasterItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [editItem, setEditItem] = useState<MasterItem | undefined>()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    const { data } = await supabase.from('sl_master_items').select('*').order('category').order('name')
    if (data) { setItems(data); onMasterItemsChange(data) }
  }, [onMasterItemsChange])

  useEffect(() => { loadItems() }, [loadItems])

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    const id = pendingDeleteId
    setPendingDeleteId(null)
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('sl_master_items').delete().eq('id', id)
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
        <div className="flex items-center gap-2">
          {/* AI スキャンボタン */}
          <button onClick={() => setScanOpen(true)}
            className="flex items-center gap-1.5 border border-rose-200 text-rose-400 text-sm font-semibold rounded-xl px-3 py-2 hover:border-rose-400 hover:text-rose-600 transition-all active:scale-95">
            <Camera size={15} /> Scan
          </button>
          <button onClick={() => { setEditItem(undefined); setModalOpen(true) }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-all shadow-md shadow-rose-200/50 active:scale-95">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        {/* Empty state — clickable to open Add modal */}
        {items.length === 0 && (
          <button onClick={() => { setEditItem(undefined); setModalOpen(true) }}
            className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8 w-full hover:opacity-80 active:scale-95 transition-all cursor-pointer">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-pink-500 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-200/50">
              <Plus size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <p className="text-rose-800 font-semibold text-lg">No items yet</p>
            <p className="text-rose-400 text-sm">Tap here to add items you buy often!</p>
          </button>
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
                <button key={item.id}
                  onClick={() => { setEditItem(item); setModalOpen(true) }}
                  className="bg-white rounded-xl border border-rose-100 overflow-hidden text-left active:scale-95 transition-transform">
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
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation popup */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingDeleteId(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-[300px] text-center space-y-3 shadow-xl">
            <p className="text-2xl">🗑️</p>
            <p className="font-bold text-rose-800">Delete this item?</p>
            <p className="text-sm text-rose-400">It will be removed from My Items.</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingDeleteId(null)}
                className="flex-1 border border-rose-200 text-rose-400 rounded-2xl py-2.5 text-sm font-medium hover:bg-rose-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-2xl py-2.5 text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <AiMasterScanModal isOpen={scanOpen} onClose={() => setScanOpen(false)}
        userId={userId} onAdded={loadItems} />

      <MasterItemModal item={editItem} isOpen={modalOpen} userId={userId}
        onClose={() => setModalOpen(false)} onSave={loadItems}
        onDelete={async (id) => {
          setItems(prev => prev.filter(i => i.id !== id))
          await supabase.from('sl_master_items').delete().eq('id', id)
          onMasterItemsChange(items.filter(i => i.id !== id))
        }} />
    </div>
  )
}
