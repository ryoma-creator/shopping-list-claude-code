'use client'
// Today's shopping list — 画像中心のカートUI
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
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

  // master_item_id → MasterItem のルックアップマップ
  const masterMap = useMemo(() => {
    const m = new Map<string, MasterItem>()
    for (const mi of masterItems) m.set(mi.id, mi)
    return m
  }, [masterItems])

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

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      setAnimatingIds(prev => new Set([...prev, id]))
      setTimeout(() => {
        setAnimatingIds(prev => { const s = new Set(prev); s.delete(id); return s })
        setItems(prev => prev.map(i => i.id === id ? { ...i, is_checked: true } : i))
        supabase.from('sl_list_items').update({ is_checked: true }).eq('id', id)
      }, 500)
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

  const counterText = items.length === 0 ? null
    : remaining === 0 ? '🎉 All done!'
    : remaining === 1 ? '🔥 Last one!'
    : remaining <= 3 ? `✨ あと${remaining}つ！`
    : `🛒 あと${remaining}つ`

  if (!list) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-6xl">🛒</p>
          <p className="text-rose-800 font-bold text-xl">今日のお買い物</p>
          <p className="text-rose-400 text-sm">まだリストがありません</p>
          <button onClick={createTodayList}
            className="bg-rose-400 hover:bg-rose-500 text-white font-semibold rounded-2xl px-8 py-3 transition-colors">
            お買い物を始める
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-1 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-rose-800">🛒 今日のリスト</h1>
        <button onClick={() => setShowSaveSheet(true)} disabled={items.length === 0}
          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-600 disabled:opacity-40 transition-colors">
          <Save size={14} /> 保存
        </button>
      </div>

      {/* 残りカウンター */}
      {counterText && (
        <div className="px-4 pb-1 shrink-0">
          <p key={remaining} className={`text-sm font-bold animate-pulse-scale
            ${remaining === 0 ? 'text-rose-400' : remaining === 1 ? 'text-orange-500' : 'text-rose-500'}`}>
            {counterText}
          </p>
        </div>
      )}

      {/* アイテムリスト */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 pb-4">
        {items.length === 0 && (
          <EmptyState icon={<Plus size={40} />} title="アイテムを追加"
            subtitle="＋ボタンで My Items から選ぼう" />
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

        {/* カート内（チェック済み）— 画像グリッド表示 */}
        {inCart.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-wide mb-2">
              ✅ カートに入れた ({inCart.length})
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

      {/* Total bar + FAB */}
      <div className="px-3 pb-2 shrink-0 relative">
        <button onClick={() => setPickerOpen(true)}
          className="absolute -top-14 right-1 w-12 h-12 bg-rose-400 hover:bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 z-10"
          aria-label="Add items">
          <Plus size={22} />
        </button>
        <TotalBar items={items} />
      </div>

      {/* 削除確認 */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingDeleteId(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-[300px] text-center space-y-3 shadow-xl">
            <p className="text-2xl">🗑️</p>
            <p className="font-bold text-rose-800">削除する？</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingDeleteId(null)}
                className="flex-1 border border-rose-200 text-rose-400 rounded-2xl py-2 text-sm font-medium hover:bg-rose-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 bg-rose-400 hover:bg-rose-500 text-white rounded-2xl py-2 text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存シート */}
      {showSaveSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSaveSheet(false)} />
          <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-6 pb-24 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-rose-800">リストを保存？</p>
              <button onClick={() => setShowSaveSheet(false)} className="text-rose-300 hover:text-rose-500">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-rose-400">
              Past Lists に保存して、次回再利用できます。
            </p>
            <button onClick={saveAsPastList} disabled={saving}
              className="w-full bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 transition-colors">
              {saving ? '保存中...' : '保存する ✨'}
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
