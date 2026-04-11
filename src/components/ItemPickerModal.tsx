'use client'
import { useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { offlineCache } from '@/lib/offlineCache'
import { MasterItemEditSheet } from '@/components/MasterItemEditSheet'
import type { MasterItem, ListItem } from '@/types/database'

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
  onMasterItemDeleted?: () => void
}

export function ItemPickerModal({ listId, isOpen, onClose, masterItems, onAdded, onMasterItemDeleted }: Props) {
  const [activeCat, setActiveCat] = useState('all')
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({})
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null)
  const [inFlight, setInFlight] = useState<Set<string>>(new Set())
  const [addedRowIds, setAddedRowIds] = useState<Record<string, string>>({})
  const longPressTimer = useRef<number | null>(null)
  const longPressTriggered = useRef(false)

  const filtered = activeCat === 'all' ? masterItems
    : masterItems.filter(i => i.category === activeCat)

  const selectedItemCount = useMemo(
    () => Object.values(selectedQty).filter(q => q > 0).length,
    [selectedQty]
  )
  const selectedTotalQty = useMemo(
    () => Object.values(selectedQty).reduce((sum, q) => sum + q, 0),
    [selectedQty]
  )
  const adjustingItem = masterItems.find(i => i.id === adjustingItemId) ?? null

  const markInflight = (itemId: string, on: boolean) => {
    setInFlight(prev => {
      const next = new Set(prev)
      if (on) next.add(itemId)
      else next.delete(itemId)
      return next
    })
  }

  const addOneLocal = (itemId: string, rowId: string) => {
    setSelectedQty(prev => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }))
    setAddedRowIds(prev => ({ ...prev, [itemId]: rowId }))
  }

  const removeOneLocal = (itemId: string, removeRowId: boolean) => {
    const rowId = addedRowIds[itemId]
    if (!rowId) return null
    if (removeRowId) {
      setAddedRowIds(prev => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
    }
    setSelectedQty(prev => {
      const nextQty = Math.max(0, (prev[itemId] ?? 0) - 1)
      const next = { ...prev }
      if (nextQty === 0) delete next[itemId]
      else next[itemId] = nextQty
      return next
    })
    return rowId
  }

  const startLongPress = (itemId: string) => {
    longPressTriggered.current = false
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      setAdjustingItemId(itemId)
    }, 450)
  }

  const endLongPress = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  const addOneAndPersist = async (item: MasterItem) => {
    if (inFlight.has(item.id)) return
    markInflight(item.id, true)
    try {
      const existingRowId = addedRowIds[item.id]
      const nextTapCount = (selectedQty[item.id] ?? 0) + 1
      const unitQty = Math.max(1, item.default_qty)
      const nextQty = nextTapCount * unitQty

      if (existingRowId) {
        if (existingRowId.startsWith('temp_')) {
          const cached = offlineCache.loadTodayItems<ListItem[]>() ?? []
          offlineCache.saveTodayItems(cached.map(i => i.id === existingRowId ? { ...i, qty: nextQty } : i))
          const ops = offlineCache.loadPendingOps()
          const old = ops.find(o => o.id === existingRowId && o.type === 'insert_list_item')
          if (old && old.type === 'insert_list_item') {
            offlineCache.removePendingOp(existingRowId)
            offlineCache.addPendingOp({
              ...old,
              payload: { ...old.payload, qty: nextQty },
            })
          }
          addOneLocal(item.id, existingRowId)
        } else {
          const { error } = await supabase.from('sl_list_items').update({ qty: nextQty }).eq('id', existingRowId)
          if (error) throw error
          addOneLocal(item.id, existingRowId)
        }
      } else {
        const { data: latest } = await supabase.from('sl_list_items')
          .select('sort_order').eq('list_id', listId)
          .order('sort_order', { ascending: false }).limit(1)
        const row = {
          list_id: listId,
          master_item_id: item.id,
          name: item.name,
          price: item.default_price,
          qty: unitQty,
          is_checked: false,
          sort_order: (latest?.[0]?.sort_order ?? -1) + 1,
        }
        if (!navigator.onLine) {
          const cached = offlineCache.loadTodayItems<ListItem[]>() ?? []
          const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`
          cached.push({ ...row, id: tempId, created_at: new Date().toISOString() })
          offlineCache.addPendingOp({
            id: tempId,
            type: 'insert_list_item',
            payload: row,
            createdAt: Date.now(),
          })
          offlineCache.saveTodayItems(cached)
          addOneLocal(item.id, tempId)
        } else {
          const { data, error } = await supabase.from('sl_list_items')
            .insert(row).select('id').single()
          if (error) throw error
          if (!data?.id) throw new Error('追加IDの取得に失敗しました')
          addOneLocal(item.id, data.id)
        }
      }

      onAdded?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to add item'
      alert(msg)
    } finally {
      markInflight(item.id, false)
    }
  }

  const removeOneAndPersist = async (item: MasterItem) => {
    if (inFlight.has(item.id)) return
    const rowId = addedRowIds[item.id]
    if (!rowId) return
    const currentTapCount = selectedQty[item.id] ?? 0
    const unitQty = Math.max(1, item.default_qty)
    const nextTapCount = Math.max(0, currentTapCount - 1)
    const nextQty = nextTapCount * unitQty
    removeOneLocal(item.id, nextTapCount === 0)
    markInflight(item.id, true)
    try {
      if (rowId.startsWith('temp_')) {
        if (nextTapCount === 0) {
          const cached = offlineCache.loadTodayItems<ListItem[]>() ?? []
          offlineCache.saveTodayItems(cached.filter(i => i.id !== rowId))
          offlineCache.removePendingOp(rowId)
        } else {
          const cached = offlineCache.loadTodayItems<ListItem[]>() ?? []
          offlineCache.saveTodayItems(cached.map(i => i.id === rowId ? { ...i, qty: nextQty } : i))
          const ops = offlineCache.loadPendingOps()
          const old = ops.find(o => o.id === rowId && o.type === 'insert_list_item')
          if (old && old.type === 'insert_list_item') {
            offlineCache.removePendingOp(rowId)
            offlineCache.addPendingOp({
              ...old,
              payload: { ...old.payload, qty: nextQty },
            })
          }
        }
      } else {
        const { error } = nextTapCount === 0
          ? await supabase.from('sl_list_items').delete().eq('id', rowId)
          : await supabase.from('sl_list_items').update({ qty: nextQty }).eq('id', rowId)
        if (error) throw error
      }
      onAdded?.()
    } catch (e) {
      addOneLocal(item.id, rowId)
      const msg = e instanceof Error ? e.message : 'Failed to remove item'
      alert(msg)
    } finally {
      markInflight(item.id, false)
    }
  }

  const handleMasterItemChanged = (itemId: string) => {
    // マスターアイテム編集・削除後にリストから除去してリフレッシュ
    setSelectedQty(prev => { const next = { ...prev }; delete next[itemId]; return next })
    setAddedRowIds(prev => { const next = { ...prev }; delete next[itemId]; return next })
    setAdjustingItemId(null)
    onMasterItemDeleted?.()
  }

  const handleClose = () => {
    setSelectedQty({})
    setAddedRowIds({})
    setAdjustingItemId(null)
    endLongPress()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />

      <div className="relative flex-1 flex flex-col mt-8 mx-auto w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden">

        {/* Header with added count */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-rose-800">Pick Items</h2>
            {selectedTotalQty > 0 && (
              <span className="bg-gradient-to-r from-rose-400 to-pink-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm animate-bounce-in">
                {selectedTotalQty} selected
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
                  const qty = selectedQty[item.id] ?? 0
                  const added = qty > 0
                  return (
                    <button key={item.id}
                      onMouseDown={() => startLongPress(item.id)}
                      onMouseUp={endLongPress}
                      onMouseLeave={endLongPress}
                      onTouchStart={() => startLongPress(item.id)}
                      onTouchEnd={endLongPress}
                      onClick={() => {
                        if (longPressTriggered.current) {
                          longPressTriggered.current = false
                          return
                        }
                        void addOneAndPersist(item)
                      }}
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
                          <div className="min-w-10 h-10 px-3 bg-white/90 rounded-full flex items-center justify-center">
                            <span className="text-rose-500 font-black text-base">x{qty}</span>
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

        {selectedItemCount > 0 && (
          <div className="px-3 pb-3 pt-1 border-t border-rose-100 shrink-0 text-xs text-rose-500">
            {selectedItemCount} items / {selectedTotalQty} qty added
          </div>
        )}
      </div>

      <MasterItemEditSheet
        item={adjustingItem}
        onClose={() => setAdjustingItemId(null)}
        onSaved={() => handleMasterItemChanged(adjustingItem?.id ?? '')}
        onDeleted={() => handleMasterItemChanged(adjustingItem?.id ?? '')}
      />
    </div>
  )
}
