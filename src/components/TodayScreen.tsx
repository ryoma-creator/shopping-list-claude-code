'use client'
// Today's shopping list — game-like experience
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { ItemRow } from '@/components/ItemRow'
import { TotalBar } from '@/components/TotalBar'
import { EmptyState } from '@/components/EmptyState'
import { ItemPickerModal } from '@/components/ItemPickerModal'
import { Celebration } from '@/components/Celebration'
import type { ListItem, MasterItem, ShoppingList } from '@/types/database'

interface Props { masterItems: MasterItem[] }

export function TodayScreen({ masterItems }: Props) {
  const [list, setList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showSaveSheet, setShowSaveSheet] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [saving, setSaving] = useState(false)
  const celebratedRef = useRef(false)

  const loadTodayList = useCallback(async () => {
    const today = new Date().toLocaleDateString('en-CA')
    const { data } = await supabase.from('sl_shopping_lists').select('*')
      .eq('is_template', false).eq('name', today).limit(1)
    if (data && data.length > 0) setList(data[0])
  }, [])

  const loadItems = useCallback(async (listId: string) => {
    const { data } = await supabase.from('sl_list_items').select('*')
      .eq('list_id', listId).order('sort_order')
    if (data) setItems(data)
  }, [])

  const createTodayList = async () => {
    const today = new Date().toLocaleDateString('en-CA')
    const { data } = await supabase.from('sl_shopping_lists')
      .insert({ name: today, is_template: false }).select().single()
    if (data) { setList(data); celebratedRef.current = false }
  }

  // Check with swipe-out animation
  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      setAnimatingIds(prev => new Set([...prev, id]))
      setTimeout(() => {
        setAnimatingIds(prev => { const s = new Set(prev); s.delete(id); return s })
        setItems(prev => prev.map(i => i.id === id ? { ...i, is_checked: true } : i))
        supabase.from('sl_list_items').update({ is_checked: true }).eq('id', id)
      }, 380)
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, is_checked: false } : i))
      supabase.from('sl_list_items').update({ is_checked: false }).eq('id', id)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    const id = pendingDeleteId
    setPendingDeleteId(null)
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('sl_list_items').delete().eq('id', id)
  }

  const saveAsPastList = async () => {
    if (!list) return
    setSaving(true)
    try {
      const name = `Shopping ${new Date().toLocaleDateString('en-CA')}`
      const { data: saved } = await supabase.from('sl_shopping_lists')
        .insert({ name, is_template: true }).select().single()
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

  // Trigger celebration when all items are checked
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

  // Remaining counter text
  const counterText = items.length === 0 ? null
    : remaining === 0 ? '🎉 All done!'
    : remaining === 1 ? '🔥 Last one!'
    : remaining <= 3 ? `✨ ${remaining} items left!`
    : `🛒 ${remaining} items left`

  if (!list) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-5xl">🛒</p>
          <p className="text-rose-800 font-bold text-xl">Today&apos;s Shopping List</p>
          <p className="text-rose-400 text-sm">No list yet for today</p>
          <button onClick={createTodayList}
            className="bg-rose-400 hover:bg-rose-500 text-white font-semibold rounded-2xl px-8 py-3 transition-colors">
            Start Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-2 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-rose-800">🛒 Today&apos;s List</h1>
        <button onClick={() => setShowSaveSheet(true)} disabled={items.length === 0}
          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-600 disabled:opacity-40 transition-colors">
          <Save size={14} /> Save
        </button>
      </div>

      {/* Remaining counter */}
      {counterText && (
        <div className="px-4 pb-2 shrink-0">
          <p key={remaining} className={`text-sm font-bold text-rose-500 animate-pulse-scale
            ${remaining === 0 ? 'text-rose-400' : remaining === 1 ? 'text-orange-500' : ''}`}>
            {counterText}
          </p>
        </div>
      )}

      {/* Scrollable item list */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {items.length === 0 && (
          <EmptyState icon={<Plus size={40} />} title="Add items to your list"
            subtitle="Tap + to add from My Items" />
        )}

        {/* Animating items: ポン！と縮んで消える */}
        {leaving.map(item => (
          <div key={item.id} className="animate-check-off overflow-hidden">
            <ItemRow item={item} onToggle={handleToggle} onDeleteRequest={setPendingDeleteId} />
          </div>
        ))}

        {/* Unchecked items */}
        {unchecked.map(item => (
          <ItemRow key={item.id} item={item}
            onToggle={handleToggle} onDeleteRequest={setPendingDeleteId} />
        ))}

        {/* In Cart section */}
        {inCart.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-rose-300 uppercase tracking-wide">
              In Cart ({inCart.length})
            </p>
            {inCart.map(item => (
              <ItemRow key={item.id} item={item}
                onToggle={handleToggle} onDeleteRequest={setPendingDeleteId} />
            ))}
          </div>
        )}
      </div>

      {/* Total bar + FAB — FAB is positioned above TotalBar, never overlaps */}
      <div className="px-4 pb-2 shrink-0 relative">
        {/* FAB sits 8px above the TotalBar */}
        <button onClick={() => setPickerOpen(true)}
          className="absolute -top-16 right-0 w-14 h-14 bg-rose-400 hover:bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 z-10"
          aria-label="Add items">
          <Plus size={24} />
        </button>
        <TotalBar items={items} />
      </div>

      {/* Delete confirmation dialog */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingDeleteId(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-[320px] text-center space-y-4 shadow-xl">
            <p className="text-2xl">🗑️</p>
            <p className="font-bold text-rose-800">Delete this item?</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingDeleteId(null)}
                className="flex-1 border border-rose-200 text-rose-400 rounded-2xl py-2.5 text-sm font-medium hover:bg-rose-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 bg-rose-400 hover:bg-rose-500 text-white rounded-2xl py-2.5 text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as Past List — bottom sheet */}
      {showSaveSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSaveSheet(false)} />
          <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-rose-800 text-lg">Save as Past List?</p>
              <button onClick={() => setShowSaveSheet(false)} className="text-rose-300 hover:text-rose-500">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-rose-400">
              This saves your current list so you can reuse it next time from Past Lists.
            </p>
            <button onClick={saveAsPastList} disabled={saving}
              className="w-full bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 transition-colors">
              {saving ? 'Saving...' : 'Save to Past Lists ✨'}
            </button>
          </div>
        </div>
      )}

      <ItemPickerModal listId={list.id} isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)} masterItems={masterItems}
        onAdded={() => loadItems(list.id)} />

      {showCelebration && <Celebration onDismiss={() => setShowCelebration(false)} />}
    </div>
  )
}
