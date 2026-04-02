'use client'
// Past Lists screen — saved shopping lists for reuse
import { useState, useEffect, useCallback } from 'react'
import { LayoutList, ShoppingCart, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { EmptyState } from '@/components/EmptyState'
import type { ShoppingList, ListItem } from '@/types/database'

interface TemplateWithStats extends ShoppingList {
  itemCount: number
  totalPrice: number
}

interface Props {
  onUseTemplate: () => void
}

export function TemplatesScreen({ onUseTemplate }: Props) {
  const [templates, setTemplates] = useState<TemplateWithStats[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  // Load all saved lists
  const loadTemplates = useCallback(async () => {
    const { data: lists } = await supabase
      .from('sl_shopping_lists')
      .select('*')
      .eq('is_template', true)
      .order('created_at', { ascending: false })

    if (!lists) return

    // Calculate item count and total price for each list
    const withStats = await Promise.all(
      lists.map(async (list) => {
        const { data: items } = await supabase
          .from('sl_list_items')
          .select('price, qty')
          .eq('list_id', list.id)
        const itemCount = items?.length ?? 0
        const totalPrice = (items as Pick<ListItem, 'price' | 'qty'>[] | null)
          ?.reduce((sum, i) => sum + i.price * i.qty, 0) ?? 0
        return { ...list, itemCount, totalPrice }
      })
    )
    setTemplates(withStats)
  }, [])

  // Load a past list into today's list
  const useTemplate = async (template: TemplateWithStats) => {
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
      } else {
        const { data: newList } = await supabase
          .from('sl_shopping_lists')
          .insert({ name: today, is_template: false })
          .select()
          .single()
        if (!newList) return
        listId = newList.id
      }

      // Copy all items from the past list
      const { data: tmplItems } = await supabase
        .from('sl_list_items')
        .select('*')
        .eq('list_id', template.id)

      if (tmplItems && tmplItems.length > 0) {
        await supabase.from('sl_list_items').insert(
          tmplItems.map((item, i) => ({
            list_id: listId,
            master_item_id: item.master_item_id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            is_checked: false,
            sort_order: i,
          }))
        )
      }

      onUseTemplate()
    } finally {
      setLoading(null)
    }
  }

  // Delete a past list
  const deleteTemplate = async (id: string) => {
    await supabase.from('sl_shopping_lists').delete().eq('id', id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-xl font-bold text-rose-800">💾 Past Lists</h1>
        <p className="text-xs text-rose-400 mt-1">Reuse a previous shopping list</p>
      </div>

      {/* List */}
      <div className="px-4 space-y-3">
        {templates.length === 0 && (
          <EmptyState
            icon={<LayoutList size={40} />}
            title="No saved lists yet"
            subtitle={'Tap "Save as Past List" on Today\'s List to save one'}
          />
        )}

        {templates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-white rounded-2xl border border-rose-100 p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-rose-800">{tmpl.name}</p>
                <p className="text-xs text-rose-400 mt-0.5">
                  {tmpl.itemCount} items · Total ¥{tmpl.totalPrice.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => deleteTemplate(tmpl.id)}
                className="p-1.5 text-rose-200 hover:text-rose-400 transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <button
              onClick={() => useTemplate(tmpl)}
              disabled={loading === tmpl.id}
              className="w-full flex items-center justify-center gap-2 bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
            >
              <ShoppingCart size={16} />
              {loading === tmpl.id ? 'Loading...' : 'Use This List'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
