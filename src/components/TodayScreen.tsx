'use client'
// Today's shopping list screen
import { useState, useEffect, useCallback } from 'react'
import { Plus, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { ItemRow } from '@/components/ItemRow'
import { TotalBar } from '@/components/TotalBar'
import { EmptyState } from '@/components/EmptyState'
import { ItemPickerModal } from '@/components/ItemPickerModal'
import type { ListItem, MasterItem, ShoppingList } from '@/types/database'

interface Props {
  masterItems: MasterItem[]
}

export function TodayScreen({ masterItems }: Props) {
  const [list, setList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load today's list
  const loadTodayList = useCallback(async () => {
    const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD format
    const { data: lists } = await supabase
      .from('sl_shopping_lists')
      .select('*')
      .eq('is_template', false)
      .eq('name', today)
      .limit(1)

    if (lists && lists.length > 0) {
      setList(lists[0])
    }
  }, [])

  // Load items for a list
  const loadItems = useCallback(async (listId: string) => {
    const { data } = await supabase
      .from('sl_list_items')
      .select('*')
      .eq('list_id', listId)
      .order('sort_order')
    if (data) setItems(data)
  }, [])

  // Create a new list for today
  const createTodayList = async () => {
    const today = new Date().toLocaleDateString('en-CA')
    const { data } = await supabase
      .from('sl_shopping_lists')
      .insert({ name: today, is_template: false })
      .select()
      .single()
    if (data) setList(data)
  }

  // Toggle item checked (optimistic update)
  const toggleItem = async (id: string, checked: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_checked: checked } : i)))
    await supabase.from('sl_list_items').update({ is_checked: checked }).eq('id', id)
  }

  // Delete item
  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('sl_list_items').delete().eq('id', id)
  }

  // Save as past list
  const saveAsPastList = async () => {
    if (!list) return
    setSaving(true)
    try {
      const name = `Shopping ${new Date().toLocaleDateString('en-CA')}`
      const { data: saved } = await supabase
        .from('sl_shopping_lists')
        .insert({ name, is_template: true })
        .select()
        .single()
      if (saved && items.length > 0) {
        await supabase.from('sl_list_items').insert(
          items.map((item, i) => ({
            list_id: saved.id,
            master_item_id: item.master_item_id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            is_checked: false,
            sort_order: i,
          }))
        )
      }
      alert('Saved to Past Lists!')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadTodayList()
  }, [loadTodayList])

  useEffect(() => {
    if (!list) return
    loadItems(list.id)

    // Real-time sync
    const channel = supabase
      .channel(`list-${list.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sl_list_items', filter: `list_id=eq.${list.id}` },
        () => loadItems(list.id)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [list, loadItems])

  const unchecked = items.filter((i) => !i.is_checked)
  const checked = items.filter((i) => i.is_checked)

  if (!list) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-4xl">🛒</p>
          <p className="text-rose-800 font-bold text-xl">Today&apos;s Shopping List</p>
          <p className="text-rose-400 text-sm">No list yet for today</p>
          <button
            onClick={createTodayList}
            className="bg-rose-400 hover:bg-rose-500 text-white font-semibold rounded-2xl px-8 py-3 transition-colors"
          >
            Start Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-rose-800">🛒 Today&apos;s List</h1>
        <button
          onClick={saveAsPastList}
          disabled={saving || items.length === 0}
          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-600 disabled:opacity-40 transition-colors"
        >
          <Save size={14} />
          Save as Past List
        </button>
      </div>

      {/* Scrollable item list */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {unchecked.length === 0 && checked.length === 0 && (
          <EmptyState
            icon={<Plus size={40} />}
            title="Add items to your list"
            subtitle="Tap + to add items from My Items"
          />
        )}
        {unchecked.map((item) => (
          <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
        ))}

        {/* Done section */}
        {checked.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-rose-300 uppercase tracking-wide">Done ({checked.length})</p>
            {checked.map((item) => (
              <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
            ))}
          </div>
        )}
      </div>

      {/* Total bar — above TabBar, not overlapping FAB */}
      <div className="px-4 pb-2 shrink-0">
        <TotalBar items={items} />
      </div>

      {/* Add items FAB — fixed above bottom nav */}
      <button
        onClick={() => setPickerOpen(true)}
        className="fixed bottom-24 w-14 h-14 bg-rose-400 hover:bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-20"
        style={{ right: 'max(1rem, calc((100vw - 430px) / 2 + 1rem))' }}
        aria-label="Add items"
      >
        <Plus size={24} />
      </button>

      <ItemPickerModal
        listId={list.id}
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        masterItems={masterItems}
        onAdded={() => loadItems(list.id)}
      />
    </div>
  )
}
