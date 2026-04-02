'use client'
import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { MasterItem } from '@/types/database'

const CATS = [
  { value: 'all',        emoji: '🛒', label: 'All' },
  { value: 'fruits',     emoji: '🍎', label: 'Fruits' },
  { value: 'vegetables', emoji: '🥦', label: 'Veggies' },
  { value: 'meat',       emoji: '🥩', label: 'Meat' },
  { value: 'fish',       emoji: '🐟', label: 'Fish' },
  { value: 'dairy',      emoji: '🥛', label: 'Milk' },
  { value: 'bakery',     emoji: '🍞', label: 'Bread' },
  { value: 'snacks',     emoji: '🍿', label: 'Snacks' },
  { value: 'drinks',     emoji: '🥤', label: 'Drinks' },
  { value: 'frozen',     emoji: '🧊', label: 'Frozen' },
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
  const [activeCat, setActiveCat] = useState('all')
  const [addedCount, setAddedCount] = useState(0)
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const countRef = useRef(0)

  const filtered = activeCat === 'all' ? masterItems
    : masterItems.filter(i => i.category === activeCat)

  const addItem = async (item: MasterItem) => {
    if (justAdded.has(item.id)) return
    setJustAdded(prev => new Set([...prev, item.id]))
    countRef.current += 1
    setAddedCount(countRef.current)

    if (!navigator.onLine) {
      alert('You need internet to add items. Please connect to WiFi.')
      setJustAdded(prev => { const s = new Set(prev); s.delete(item.id); return s })
      countRef.current -= 1
      setAddedCount(countRef.current)
      return
    }

    const { error } = await supabase.from('sl_list_items').insert({
      list_id: listId, master_item_id: item.id, name: item.name,
      price: item.default_price, qty: item.default_qty,
      is_checked: false, sort_order: masterItems.length,
    })
    if (error) {
      console.error('Insert list item failed:', error.message)
      setJustAdded(prev => { const s = new Set(prev); s.delete(item.id); return s })
      countRef.current -= 1
      setAddedCount(countRef.current)
      alert(`Failed to add: ${error.message}`)
      return
    }
    onAdded?.()
  }

  const handleClose = () => {
    // Reset counts when closing
    countRef.current = 0
    setAddedCount(0)
    setJustAdded(new Set())
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />

      <div className="relative flex-1 flex flex-col mt-8 mx-auto w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden">

        {/* Header with added count */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-rose-800">Pick Items</h2>
            {addedCount > 0 && (
              <span className="bg-gradient-to-r from-rose-400 to-pink-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm animate-bounce-in">
                {addedCount} added
              </span>
            )}
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Main: sidebar + grid */}
        <div className="flex-1 flex overflow-hidden">

          {/* Category sidebar */}
          <div className="w-[60px] shrink-0 overflow-y-auto border-r border-rose-50 py-1" style={{ scrollbarWidth: 'none' }}>
            {CATS.map(cat => (
              <button key={cat.value} onClick={() => setActiveCat(cat.value)}
                className={`w-full flex flex-col items-center gap-0.5 py-2.5 transition-all
                  ${activeCat === cat.value
                    ? 'bg-gradient-to-r from-rose-400 to-pink-500 text-white'
                    : 'text-rose-500 hover:bg-rose-50'
                  }`}>
                <span className="text-lg leading-none">{cat.emoji}</span>
                <span className="text-[9px] font-medium leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Item grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-5xl mb-3">{activeCat === 'all' ? '📋' : EMOJI[activeCat] ?? '📦'}</p>
                <p className="text-sm font-semibold text-rose-400 mb-1">
                  {masterItems.length === 0 ? 'No items registered' : 'Nothing in this category'}
                </p>
                <p className="text-xs text-rose-300">
                  {masterItems.length === 0
                    ? 'Go to My Items tab to add your items first!'
                    : 'Try another category'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {filtered.map(item => {
                  const added = justAdded.has(item.id)
                  return (
                    <button key={item.id} onClick={() => addItem(item)}
                      className={`flex flex-col items-center p-2.5 rounded-2xl transition-all active:scale-90 relative overflow-hidden
                        ${added
                          ? 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-lg shadow-rose-200/50 scale-95'
                          : 'bg-white border border-rose-100 hover:border-rose-300 hover:shadow-md'}`}>
                      {/* Large image/emoji */}
                      <div className="w-16 h-16 flex items-center justify-center overflow-hidden rounded-xl mb-1.5">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name}
                            className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span className="text-4xl">{EMOJI[item.category] ?? '📦'}</span>
                        )}
                      </div>
                      {/* Name only — no price */}
                      <p className={`text-[11px] font-semibold text-center leading-tight line-clamp-2 w-full
                        ${added ? 'text-white' : 'text-rose-800'}`}>
                        {item.name}
                      </p>
                      {/* Added overlay — checkmark */}
                      {added && (
                        <div className="absolute inset-0 flex items-center justify-center bg-rose-400/30 rounded-2xl">
                          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                            <span className="text-rose-500 font-black text-lg">✓</span>
                          </div>
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
    </div>
  )
}
