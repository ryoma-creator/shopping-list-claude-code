'use client'
// Item picker modal — add items from My Items or add custom
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

  // Add an item from My Items
  const addMasterItem = async (masterItem: MasterItem) => {
    setAdding(masterItem.id)
    try {
      await supabase.from('sl_list_items').insert({
        list_id: listId,
        master_item_id: masterItem.id,
        name: masterItem.name,
        price: masterItem.default_price,
        qty: masterItem.default_qty,
        is_checked: false,
        sort_order: masterItems.length,
      })
      onAdded?.()
    } finally {
      setAdding(null)
    }
  }

  // Add a custom one-off item
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

  // Group master items by category
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
          <h2 className="text-lg font-bold text-rose-800">Add to Today&apos;s List</h2>
          <button onClick={onClose} className="text-rose-300 hover:text-rose-500">
            <X size={20} />
          </button>
        </div>

        {/* Custom item form */}
        <div className="border border-rose-100 rounded-2xl p-4 mb-4 space-y-2">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide">Add Custom Item</p>
          <div>
            <label className="text-xs text-rose-400 mb-1 block">Item name</label>
            <input
              type="text"
              placeholder="e.g. Chocolate"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-rose-400 mb-1 block">Price (¥)</label>
              <input
                type="number"
                min={0}
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-rose-400 mb-1 block">Quantity</label>
              <input
                type="number"
                min={1}
                value={customQty}
                onChange={(e) => setCustomQty(Number(e.target.value))}
                className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div className="flex items-end pb-0.5">
              <button
                onClick={addCustomItem}
                disabled={adding === 'custom' || !customName.trim()}
                className="bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl px-3 py-2 transition-colors h-[38px]"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* My Items list */}
        <div className="overflow-y-auto flex-1 space-y-4">
          {masterItems.length === 0 && (
            <p className="text-sm text-rose-300 text-center py-4">
              No items in My Items yet. Add some first!
            </p>
          )}
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
                    <span className="text-xs text-rose-400">
                      ¥{item.default_price} · Qty {item.default_qty}
                    </span>
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
