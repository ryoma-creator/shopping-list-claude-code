'use client'
// Item picker — category tabs + grid selection (like a real shopping app)
import { useState } from 'react'
import { X, Plus, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { MasterItem } from '@/types/database'

const TABS = [
  { value: 'all',        emoji: '🛒', label: 'All' },
  { value: 'meat',       emoji: '🥩', label: 'Meat' },
  { value: 'fish',       emoji: '🐟', label: 'Fish' },
  { value: 'dairy',      emoji: '🥛', label: 'Dairy' },
  { value: 'fruits',     emoji: '🍎', label: 'Fruits' },
  { value: 'vegetables', emoji: '🥦', label: 'Veggies' },
  { value: 'frozen',     emoji: '🧊', label: 'Frozen' },
  { value: 'bakery',     emoji: '🍞', label: 'Bakery' },
  { value: 'drinks',     emoji: '🥤', label: 'Drinks' },
  { value: 'snacks',     emoji: '🍿', label: 'Snacks' },
  { value: 'other',      emoji: '📦', label: 'Other' },
]

const EMOJI: Record<string, string> = {
  meat: '🥩', fish: '🐟', dairy: '🥛', fruits: '🍎',
  vegetables: '🥦', frozen: '🧊', bakery: '🍞', drinks: '🥤',
  snacks: '🍿', other: '📦',
}

interface Props {
  listId: string
  isOpen: boolean
  onClose: () => void
  masterItems: MasterItem[]
  onAdded?: () => void
}

export function ItemPickerModal({ listId, isOpen, onClose, masterItems, onAdded }: Props) {
  const [activeTab, setActiveTab] = useState('all')
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPriceStr, setCustomPriceStr] = useState('')
  const [customQty, setCustomQty] = useState(1)
  const [addingCustom, setAddingCustom] = useState(false)

  const filtered = activeTab === 'all' ? masterItems
    : masterItems.filter(i => i.category === activeTab)

  const addItem = async (item: MasterItem) => {
    if (justAdded.has(item.id)) return
    setJustAdded(prev => new Set([...prev, item.id]))
    await supabase.from('sl_list_items').insert({
      list_id: listId, master_item_id: item.id, name: item.name,
      price: item.default_price, qty: item.default_qty,
      is_checked: false, sort_order: masterItems.length,
    })
    onAdded?.()
    setTimeout(() => setJustAdded(prev => { const s = new Set(prev); s.delete(item.id); return s }), 800)
  }

  const addCustom = async () => {
    if (!customName.trim()) return
    setAddingCustom(true)
    try {
      const customPrice = customPriceStr === '' ? 0 : Number(customPriceStr)
      await supabase.from('sl_list_items').insert({
        list_id: listId, master_item_id: null, name: customName.trim(),
        price: customPrice, qty: customQty, is_checked: false, sort_order: masterItems.length,
      })
      setCustomName(''); setCustomPriceStr(''); setCustomQty(1)
      onAdded?.(); setShowCustom(false)
    } finally { setAddingCustom(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-lg font-bold text-rose-800">Add to Today&apos;s List</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCustom(v => !v)}
              className="text-xs text-rose-400 hover:text-rose-600 border border-rose-200 rounded-xl px-3 py-1.5 transition-colors">
              + Custom
            </button>
            <button onClick={onClose} className="text-rose-300 hover:text-rose-500 p-1"><X size={20} /></button>
          </div>
        </div>

        {/* Custom item form */}
        {showCustom && (
          <div className="px-5 pb-3 space-y-2 shrink-0 border-b border-rose-50">
            <input type="text" placeholder="Item name" value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-rose-400 block mb-1">Price (¥)</label>
                <input type="text" inputMode="numeric" placeholder="0" value={customPriceStr}
                  onChange={e => setCustomPriceStr(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-rose-400 block mb-1">Quantity</label>
                <input type="number" min={1} value={customQty}
                  onChange={e => setCustomQty(Number(e.target.value))}
                  className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <button onClick={addCustom} disabled={addingCustom || !customName.trim()}
                className="self-end bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 transition-colors h-[38px]">
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 border-b border-rose-50" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button key={tab.value} onClick={() => setActiveTab(tab.value)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl shrink-0 transition-all text-center min-w-[52px]
                ${activeTab === tab.value ? 'bg-rose-400 text-white shadow-sm' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}>
              <span className="text-xl leading-none">{tab.emoji}</span>
              <span className="text-[10px] font-medium leading-none mt-0.5">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-rose-300 text-center py-8">
              {masterItems.length === 0 ? 'Go to My Items tab to add items first!' : 'No items in this category'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map(item => {
                const added = justAdded.has(item.id)
                return (
                  <button key={item.id} onClick={() => addItem(item)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95 relative overflow-hidden
                      ${added ? 'bg-rose-400' : 'bg-rose-50 hover:bg-rose-100'}`}>
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm overflow-hidden">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        EMOJI[item.category] ?? '📦'
                      )}
                    </div>
                    <p className={`text-xs font-semibold text-center leading-tight line-clamp-2 w-full ${added ? 'text-white' : 'text-rose-800'}`}>
                      {item.name}
                    </p>
                    <p className={`text-[10px] ${added ? 'text-rose-100' : 'text-rose-400'}`}>
                      ¥{item.default_price}
                    </p>
                    {added && (
                      <div className="absolute inset-0 flex items-center justify-center bg-rose-400/10">
                        <Check size={28} className="text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
