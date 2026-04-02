'use client'
// Past Lists — 画像プレビュー付きで視覚的にわかるUI
import { useState, useEffect, useCallback } from 'react'
import { LayoutList, ShoppingCart, Trash2 } from 'lucide-react'
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
}

export function TemplatesScreen({ onUseTemplate }: Props) {
  const [templates, setTemplates] = useState<TemplateWithItems[]>([])
  const [masterMap, setMasterMap] = useState<Map<string, MasterItem>>(new Map())
  const [loading, setLoading] = useState<string | null>(null)

  // マスターアイテム読み込み（画像取得用）
  const loadMasterItems = useCallback(async () => {
    const { data } = await supabase.from('sl_master_items').select('*')
    if (data) {
      const m = new Map<string, MasterItem>()
      for (const item of data) m.set(item.id, item)
      setMasterMap(m)
    }
  }, [])

  // テンプレート読み込み（アイテム含む）
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

      if (template.items.length > 0) {
        await supabase.from('sl_list_items').insert(
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
      }

      onUseTemplate()
    } finally {
      setLoading(null)
    }
  }

  const deleteTemplate = async (id: string) => {
    await supabase.from('sl_shopping_lists').delete().eq('id', id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  useEffect(() => {
    loadMasterItems()
    loadTemplates()
  }, [loadMasterItems, loadTemplates])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <h1 className="text-lg font-bold text-rose-800">💾 過去のリスト</h1>
      </div>

      {/* リスト */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {templates.length === 0 && (
          <EmptyState
            icon={<LayoutList size={40} />}
            title="まだ保存されたリストがないよ"
            subtitle={'今日のリストで「保存」ボタンを押すと、ここに表示されます'}
          />
        )}

        {templates.map((tmpl) => (
          <div key={tmpl.id}
            className="bg-white rounded-2xl border border-rose-100 p-3 space-y-2">
            {/* 日付 & 削除 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-400">{tmpl.name}</span>
                <span className="text-[10px] text-rose-300">
                  {tmpl.items.length}品 · ¥{tmpl.totalPrice.toLocaleString()}
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

            {/* アイテム画像プレビューグリッド — 視覚的に中身がわかる！ */}
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

            {/* このリストを使うボタン */}
            <button
              onClick={() => useTemplate(tmpl)}
              disabled={loading === tmpl.id}
              className="w-full flex items-center justify-center gap-1.5 bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2 text-sm transition-colors"
            >
              <ShoppingCart size={15} />
              {loading === tmpl.id ? '読み込み中...' : 'このリストを使う'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
