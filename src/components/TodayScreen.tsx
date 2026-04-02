'use client'
// 今日の買い物リスト画面
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

  // 今日のリストを取得または作成
  const loadTodayList = useCallback(async () => {
    const today = new Date().toLocaleDateString('ja-JP')
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

  // リストのアイテムを取得
  const loadItems = useCallback(async (listId: string) => {
    const { data } = await supabase
      .from('sl_list_items')
      .select('*')
      .eq('list_id', listId)
      .order('sort_order')
    if (data) setItems(data)
  }, [])

  // 今日のリストを新規作成
  const createTodayList = async () => {
    const today = new Date().toLocaleDateString('ja-JP')
    const { data } = await supabase
      .from('sl_shopping_lists')
      .insert({ name: today, is_template: false })
      .select()
      .single()
    if (data) setList(data)
  }

  // チェックを切り替え（楽観的更新）
  const toggleItem = async (id: string, checked: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_checked: checked } : i)))
    await supabase.from('sl_list_items').update({ is_checked: checked }).eq('id', id)
  }

  // アイテムを削除
  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('sl_list_items').delete().eq('id', id)
  }

  // テンプレートとして保存
  const saveAsTemplate = async () => {
    if (!list) return
    setSaving(true)
    try {
      const name = `テンプレート ${new Date().toLocaleDateString('ja-JP')}`
      const { data: tmpl } = await supabase
        .from('sl_shopping_lists')
        .insert({ name, is_template: true })
        .select()
        .single()
      if (tmpl && items.length > 0) {
        await supabase.from('sl_list_items').insert(
          items.map((item, i) => ({
            list_id: tmpl.id,
            master_item_id: item.master_item_id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            is_checked: false,
            sort_order: i,
          }))
        )
      }
      alert('テンプレートに保存しました！')
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

    // リアルタイム同期
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
          <p className="text-rose-800 font-bold text-xl">今日の買い物リスト</p>
          <p className="text-rose-400 text-sm">まだリストがありません</p>
          <button
            onClick={createTodayList}
            className="bg-rose-400 hover:bg-rose-500 text-white font-semibold rounded-2xl px-8 py-3 transition-colors"
          >
            買い物リストを作る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col pb-32">
      {/* ヘッダー */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-rose-800">🛒 今日の買い物</h1>
        <button
          onClick={saveAsTemplate}
          disabled={saving || items.length === 0}
          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-600 disabled:opacity-40 transition-colors"
        >
          <Save size={14} />
          テンプレに保存
        </button>
      </div>

      {/* 未購入リスト */}
      <div className="px-4 space-y-2">
        {unchecked.length === 0 && checked.length === 0 && (
          <EmptyState
            icon={<Plus size={40} />}
            title="アイテムを追加しよう"
            subtitle="右下の＋ボタンからマスターリストのアイテムを追加できます"
          />
        )}
        {unchecked.map((item) => (
          <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
        ))}
      </div>

      {/* 購入済みリスト */}
      {checked.length > 0 && (
        <div className="px-4 mt-4 space-y-2">
          <p className="text-xs font-semibold text-rose-300 uppercase tracking-wide">購入済み</p>
          {checked.map((item) => (
            <ItemRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
          ))}
        </div>
      )}

      {/* 合計金額バー */}
      <TotalBar items={items} />

      {/* アイテム追加ボタン */}
      <button
        onClick={() => setPickerOpen(true)}
        className="fixed bottom-24 right-4 max-w-[430px] w-14 h-14 bg-rose-400 hover:bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        style={{ right: 'max(1rem, calc((100vw - 430px) / 2 + 1rem))' }}
        aria-label="アイテムを追加"
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
