'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Save, X, Trash2, Camera } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { offlineCache } from '@/lib/offlineCache'
import { ItemRow } from '@/components/ItemRow'
import { TotalBar } from '@/components/TotalBar'
import { EmptyState } from '@/components/EmptyState'
import { ItemPickerModal } from '@/components/ItemPickerModal'
import { AiScanModal } from '@/components/AiScanModal'
import { Celebration } from '@/components/Celebration'
import type { ListItem, MasterItem, ShoppingList } from '@/types/database'

interface Props { masterItems: MasterItem[]; userId: string }

export function TodayScreen({ masterItems, userId }: Props) {
  const [list, setList] = useState<ShoppingList | null>(() =>
    offlineCache.loadTodayList<ShoppingList>()
  )
  const [items, setItems] = useState<ListItem[]>(() =>
    offlineCache.loadTodayItems<ListItem[]>() ?? []
  )
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [showSaveSheet, setShowSaveSheet] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [saving, setSaving] = useState(false)
  const celebratedRef = useRef(false)

  const masterMap = useMemo(() => {
    const m = new Map<string, MasterItem>()
    for (const mi of masterItems) m.set(mi.id, mi)
    return m
  }, [masterItems])

  const loadTodayList = useCallback(async () => {
    const today = new Date().toLocaleDateString('en-CA')
    const { data, error } = await supabase.from('sl_shopping_lists').select('*')
      .eq('is_template', false).eq('name', today).limit(1)
    if (error) {
      // Network error → keep cached data, don't reset
      console.error('loadTodayList error (offline?):', error.message)
      return
    }
    // Only reset when API succeeds but returns empty (truly no list)
    if (data && data.length > 0) {
      setList(data[0])
      offlineCache.saveTodayList(data[0])
    } else {
      setList(null)
      setItems([])
      offlineCache.saveTodayList(null)
      offlineCache.saveTodayItems([])
    }
  }, [])

  const loadItems = useCallback(async (listId: string) => {
    const { data, error } = await supabase.from('sl_list_items').select('*')
      .eq('list_id', listId).order('sort_order')
    if (error) {
      // Network error → reload from local cache (which includes offline-added items)
      console.error('loadItems error (offline?):', error.message)
      const cached = offlineCache.loadTodayItems<ListItem[]>()
      if (cached) setItems(cached)
      return
    }
    if (data) {
      setItems(data)
      offlineCache.saveTodayItems(data)
    }
  }, [])

  const createTodayList = async () => {
    if (!navigator.onLine) {
      alert('You need internet to create a new list. Please connect to WiFi.')
      return
    }
    const today = new Date().toLocaleDateString('en-CA')
    const { data, error } = await supabase.from('sl_shopping_lists')
      .insert({ name: today, is_template: false, user_id: userId }).select().single()
    if (error) {
      console.error('createTodayList error:', error.message)
      alert(`Failed to create list: ${error.message}`)
      return
    }
    if (data) { setList(data); celebratedRef.current = false }
  }

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      setAnimatingIds(prev => new Set([...prev, id]))
      setTimeout(() => {
        setAnimatingIds(prev => { const s = new Set(prev); s.delete(id); return s })
        setItems(prev => {
          const next = prev.map(i => i.id === id ? { ...i, is_checked: true } : i)
          offlineCache.saveTodayItems(next)
          return next
        })
        supabase.from('sl_list_items').update({ is_checked: true }).eq('id', id)
          .then(({ error }) => error && console.warn('Toggle sync failed (offline?):', error.message))
      }, 500)
    } else {
      setItems(prev => {
        const next = prev.map(i => i.id === id ? { ...i, is_checked: false } : i)
        offlineCache.saveTodayItems(next)
        return next
      })
      supabase.from('sl_list_items').update({ is_checked: false }).eq('id', id)
        .then(({ error }) => error && console.warn('Toggle sync failed (offline?):', error.message))
    }
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    const id = pendingDeleteId
    setPendingDeleteId(null)
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      offlineCache.saveTodayItems(next)
      return next
    })
    const { error } = await supabase.from('sl_list_items').delete().eq('id', id)
    if (error) console.warn('Delete sync failed (offline?):', error.message)
  }

  const clearAllItems = async () => {
    if (!list) return
    setShowClearConfirm(false)
    const oldItems = items
    setItems([])
    offlineCache.saveTodayItems([])
    celebratedRef.current = false
    // Delete all items for this list from DB
    const { error } = await supabase.from('sl_list_items').delete().eq('list_id', list.id)
    if (error) {
      console.warn('Clear all sync failed (offline?):', error.message)
      // Restore if online failure (offline items already cleared)
      if (navigator.onLine) { setItems(oldItems); offlineCache.saveTodayItems(oldItems) }
    }
  }

  const saveAsPastList = async () => {
    if (!list) return
    setSaving(true)
    try {
      const name = `Shopping ${new Date().toLocaleDateString('en-CA')}`
      const { data: saved } = await supabase.from('sl_shopping_lists')
        .insert({ name, is_template: true, user_id: userId }).select().single()
      if (saved && items.length > 0) {
        await supabase.from('sl_list_items').insert(
          items.map((item, i) => ({
            list_id: saved.id, master_item_id: item.master_item_id,
            name: item.name, price: item.price, qty: item.qty,
            is_checked: false, sort_order: i,
          }))
        )
      }
      setShowSaveSheet(false)
    } finally { setSaving(false) }
  }

  // Celebration when all done
  useEffect(() => {
    const allDone = items.length > 0 && items.every(i => i.is_checked)
    const noneAnimating = animatingIds.size === 0
    if (allDone && noneAnimating && !celebratedRef.current) {
      celebratedRef.current = true
      setTimeout(() => setShowCelebration(true), 300)
    }
  }, [items, animatingIds])

  useEffect(() => { loadTodayList() }, [loadTodayList])
  useEffect(() => {
    if (!list) return
    loadItems(list.id)
    const channel = supabase.channel(`list-${list.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sl_list_items', filter: `list_id=eq.${list.id}` },
        () => loadItems(list.id))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [list, loadItems])

  const unchecked = items.filter(i => !i.is_checked && !animatingIds.has(i.id))
  const inCart = items.filter(i => i.is_checked)
  const leaving = items.filter(i => animatingIds.has(i.id))
  const remaining = unchecked.length + leaving.length

  // No list yet — Start Shopping screen
  if (!list) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-6xl">🛒</p>
          <p className="text-rose-800 font-bold text-xl">Today&apos;s Shopping</p>
          <p className="text-rose-400 text-sm">No list created for today yet</p>
          <button onClick={createTodayList}
            className="bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white font-semibold rounded-2xl px-8 py-3 transition-all shadow-lg shadow-rose-200/50 active:scale-95">
            Start Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-1 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-rose-800">🛒 Today&apos;s List</h1>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <button onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1 text-xs text-rose-300 hover:text-rose-500 transition-colors">
              <Trash2 size={13} /> Clear
            </button>
          )}
          <button onClick={() => setShowSaveSheet(true)} disabled={items.length === 0}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-600 disabled:opacity-40 transition-colors">
            <Save size={14} /> Save
          </button>
        </div>
      </div>

      {/* Remaining counter */}
      {items.length > 0 && (
        <div className="px-4 pb-1 shrink-0">
          <p className={`text-sm font-bold
            ${remaining === 0 ? 'text-emerald-500' : remaining === 1 ? 'text-orange-500' : remaining <= 3 ? 'text-rose-500' : 'text-rose-400'}`}>
            {remaining === 0 ? '🎉 All done!' : remaining === 1 ? '🔥 Last one!' : remaining <= 3 ? `✨ ${remaining} left!` : `${remaining} items left`}
          </p>
        </div>
      )}

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 pb-4">
        {items.length === 0 && (
          <button onClick={() => setPickerOpen(true)}
            className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8 w-full hover:opacity-80 active:scale-95 transition-all cursor-pointer">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-pink-500 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-200/50">
              <Plus size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <p className="text-rose-800 font-semibold text-lg">Add items</p>
            <p className="text-rose-400 text-sm">Tap here to pick from My Items</p>
          </button>
        )}

        <AnimatePresence mode="popLayout">
          {leaving.map(item => (
            <ItemRow key={item.id} item={item} isLeaving
              masterItem={item.master_item_id ? masterMap.get(item.master_item_id) : undefined}
              onToggle={handleToggle} onDeleteRequest={setPendingDeleteId} />
          ))}
          {unchecked.map(item => (
            <ItemRow key={item.id} item={item}
              masterItem={item.master_item_id ? masterMap.get(item.master_item_id) : undefined}
              onToggle={handleToggle} onDeleteRequest={setPendingDeleteId} />
          ))}
        </AnimatePresence>

        {/* In Cart (checked) — compact grid */}
        {inCart.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-wide mb-2">
              ✅ In Cart ({inCart.length})
            </p>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {inCart.map(item => {
                const mi = item.master_item_id ? masterMap.get(item.master_item_id) : undefined
                return (
                  <button key={item.id} onClick={() => handleToggle(item.id, false)}
                    className="aspect-square rounded-xl bg-white border border-rose-100 flex items-center justify-center overflow-hidden opacity-60 hover:opacity-100 transition-opacity active:scale-95">
                    {mi?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mi.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">
                        {mi ? ({'meat':'🥩','fish':'🐟','dairy':'🥛','fruits':'🍎','vegetables':'🥦','frozen':'🧊','bakery':'🍞','drinks':'🥤','snacks':'🍿','other':'📦'}[mi.category] ?? '🛒') : '🛒'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Total bar + modern FAB */}
      <div className="px-3 pb-2 shrink-0 relative">
        {/* AI スキャンボタン */}
        <button onClick={() => setScanOpen(true)}
          className="absolute -top-16 right-20 w-14 h-14 bg-white border-2 border-rose-200 hover:border-rose-400 text-rose-400 hover:text-rose-600 rounded-2xl shadow-md flex items-center justify-center transition-all active:scale-90 z-10"
          aria-label="AI scan">
          <Camera size={22} />
        </button>
        {/* FAB — large, gradient, modern */}
        <button onClick={() => setPickerOpen(true)}
          className="absolute -top-16 right-2 w-14 h-14 bg-gradient-to-br from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white rounded-2xl shadow-xl shadow-rose-300/40 flex items-center justify-center transition-all active:scale-90 z-10"
          aria-label="Add items">
          <Plus size={28} strokeWidth={2.5} />
        </button>
        <TotalBar items={items} />
      </div>

      {/* Delete confirmation */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingDeleteId(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-[300px] text-center space-y-3 shadow-xl">
            <p className="text-2xl">🗑️</p>
            <p className="font-bold text-rose-800">Delete this item?</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingDeleteId(null)}
                className="flex-1 border border-rose-200 text-rose-400 rounded-2xl py-2 text-sm font-medium hover:bg-rose-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-2xl py-2 text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear all confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowClearConfirm(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-[300px] text-center space-y-3 shadow-xl">
            <p className="text-2xl">🗑️</p>
            <p className="font-bold text-rose-800">Clear entire list?</p>
            <p className="text-sm text-rose-400">All {items.length} items will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 border border-rose-200 text-rose-400 rounded-2xl py-2.5 text-sm font-medium hover:bg-rose-50 transition-colors">
                Cancel
              </button>
              <button onClick={clearAllItems}
                className="flex-1 bg-red-500 text-white rounded-2xl py-2.5 text-sm font-semibold transition-colors">
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as past list sheet */}
      {showSaveSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSaveSheet(false)} />
          <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-6 pb-24 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-rose-800">Save to Past Lists?</p>
              <button onClick={() => setShowSaveSheet(false)} className="text-rose-300 hover:text-rose-500">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-rose-400">
              Save this list so you can reuse it next time.
            </p>
            <button onClick={saveAsPastList} disabled={saving}
              className="w-full bg-gradient-to-r from-rose-400 to-pink-500 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 transition-colors shadow-lg shadow-rose-200/50">
              {saving ? 'Saving...' : 'Save ✨'}
            </button>
          </div>
        </div>
      )}

      <ItemPickerModal listId={list.id} isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)} masterItems={masterItems}
        onAdded={() => loadItems(list.id)} />

      <AiScanModal isOpen={scanOpen} onClose={() => setScanOpen(false)}
        listId={list.id} masterItems={masterItems}
        currentItemCount={items.length} userId={userId}
        onAdded={() => loadItems(list.id)} />

      {showCelebration && <Celebration onDismiss={() => setShowCelebration(false)} />}
    </div>
  )
}
