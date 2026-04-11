'use client'
import { useState, useEffect, useCallback } from 'react'
import { LayoutList, ShoppingCart, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { EmptyState } from '@/components/EmptyState'
import type { ShoppingList, ListItem, MasterItem } from '@/types/database'

const EMOJI: Record<string, string> = {
  meat: '🥩', fish: '🐟', dairy: '🥛', fruits: '🍎',
  vegetables: '🥦', frozen: '🧊', bakery: '🍞', drinks: '🥤',
  snacks: '🍿', other: '📦',
}

interface TemplateWithItems extends ShoppingList {
  items: Pick<ListItem, 'id' | 'name' | 'master_item_id' | 'price' | 'qty'>[]
  totalPrice: number
}

interface Props {
  onUseTemplate: () => void
  userId: string
}

export function TemplatesScreen({ onUseTemplate, userId }: Props) {
  const [templates, setTemplates] = useState<TemplateWithItems[]>([])
  const [masterMap, setMasterMap] = useState<Map<string, MasterItem>>(new Map())
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmTemplate, setConfirmTemplate] = useState<TemplateWithItems | null>(null)

  const loadMasterItems = useCallback(async () => {
    const { data } = await supabase.from('sl_master_items').select('*')
    if (data) {
      const m = new Map<string, MasterItem>()
      for (const item of data) m.set(item.id, item)
      setMasterMap(m)
    }
  }, [])

  const loadTemplates = useCallback(async () => {
    const { data: lists } = await supabase
      .from('sl_shopping_lists')
      .select('*')
      .eq('is_template', true)
      .order('created_at', { ascending: false })

    if (!lists) return

    const withItems = await Promise.all(
      lists.map(async (list) => {
        const { data: items } = await supabase
          .from('sl_list_items')
          .select('id, name, master_item_id, price, qty')
          .eq('list_id', list.id)
        const listItems = items ?? []
        const totalPrice = listItems.reduce((sum, i) => sum + i.price * i.qty, 0)
        return { ...list, items: listItems, totalPrice }
      })
    )
    setTemplates(withItems)
  }, [])

  const useTemplate = async (template: TemplateWithItems) => {
    setConfirmTemplate(null)
    setLoading(template.id)
    try {
      const today = new Date().toLocaleDateString('en-CA')
      const { data: existing } = await supabase
        .from('sl_shopping_lists')
        .select('id')
        .eq('is_template', false)
        .eq('name', today)
        .limit(1)

      let listId: string
      if (existing && existing.length > 0) {
        listId = existing[0].id
        // Delete all existing items first (overwrite, not merge)
        await supabase.from('sl_list_items').delete().eq('list_id', listId)
      } else {
        const { data: newList } = await supabase
          .from('sl_shopping_lists')
          .insert({ name: today, is_template: false, user_id: userId })
          .select()
          .single()
        if (!newList) return
        listId = newList.id
      }

      if (template.items.length > 0) {
        const { error: insertErr } = await supabase.from('sl_list_items').insert(
          template.items.map((item, i) => ({
            list_id: listId,
            master_item_id: item.master_item_id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            is_checked: false,
            sort_order: i,
          }))
        )
        if (insertErr) { alert(`テンプレートの読み込みに失敗しました: ${insertErr.message}`); return }
      }

      onUseTemplate()
    } finally {
      setLoading(null)
    }
  }

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('sl_shopping_lists').delete().eq('id', id)
    if (error) { alert(`削除に失敗しました: ${error.message}`); return }
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  useEffect(() => {
    loadMasterItems()
    loadTemplates()
  }, [loadMasterItems, loadTemplates])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 pt-5 pb-3 shrink-0">
        <h1 className="text-lg font-bold text-rose-800">💾 Past Lists</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {templates.length === 0 && (
          <EmptyState
            icon={<LayoutList size={40} />}
            title="No saved lists yet"
            subtitle={'Save your Today\'s List to reuse it later!'}
          />
        )}

        {templates.map((tmpl) => (
          <div key={tmpl.id}
            className="bg-white rounded-2xl border border-rose-100 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-rose-700">{tmpl.name}</span>
                <span className="text-[10px] text-rose-300">
                  {tmpl.items.length} items · ¥{tmpl.totalPrice.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => deleteTemplate(tmpl.id)}
                className="p-1 text-rose-200 hover:text-rose-400 transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Item preview grid */}
            <div className="flex flex-wrap gap-1.5">
              {tmpl.items.slice(0, 12).map((item) => {
                const mi = item.master_item_id ? masterMap.get(item.master_item_id) : undefined
                return (
                  <div key={item.id}
                    className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center overflow-hidden border border-rose-100">
                    {mi?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mi.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">
                        {mi ? (EMOJI[mi.category] ?? '🛒') : '🛒'}
                      </span>
                    )}
                  </div>
                )
              })}
              {tmpl.items.length > 12 && (
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center border border-rose-100">
                  <span className="text-[10px] text-rose-400 font-bold">+{tmpl.items.length - 12}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setConfirmTemplate(tmpl)}
              disabled={loading === tmpl.id}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-all shadow-md shadow-rose-200/50 active:scale-[0.98]"
            >
              <ShoppingCart size={15} />
              {loading === tmpl.id ? 'Loading...' : 'Use This List'}
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation popup */}
      {confirmTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/30" onClick={() => setConfirmTemplate(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-[320px] text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-amber-500" />
            </div>
            <p className="font-bold text-rose-800">Replace Today&apos;s List?</p>
            <p className="text-sm text-rose-400">
              This will <span className="font-semibold text-rose-500">overwrite</span> your current Today&apos;s List with this past list ({confirmTemplate.items.length} items).
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmTemplate(null)}
                className="flex-1 border border-rose-200 text-rose-400 rounded-2xl py-2.5 text-sm font-medium hover:bg-rose-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => useTemplate(confirmTemplate)}
                className="flex-1 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-2xl py-2.5 text-sm font-semibold transition-colors">
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
