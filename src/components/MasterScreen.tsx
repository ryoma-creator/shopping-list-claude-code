'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { offlineCache } from '@/lib/offlineCache'
import { MasterItemModal } from '@/components/MasterItemModal'
import { AiMasterScanModal } from '@/components/AiMasterScanModal'
import { saveDeleteConfirmSetting } from '@/lib/userSettings'
import { resolveDefaultFoodImage } from '@/lib/defaultFoodImage'
import type { Category, MasterItem } from '@/types/database'

const CATEGORY_EMOJI: Record<Category | string, string> = {
  meat: '🥩', fish: '🐟', dairy: '🥛', fruits: '🍎',
  vegetables: '🥦', frozen: '🧊', bakery: '🍞', drinks: '🥤',
  snacks: '🍿', other: '📦',
}

const CATEGORY_LABEL: Record<Category | string, string> = {
  meat: 'Meat', fish: 'Fish', dairy: 'Milk', fruits: 'Fruits',
  vegetables: 'Veggies', frozen: 'Frozen', bakery: 'Bakery',
  drinks: 'Drinks', snacks: 'Snacks', other: 'Other',
}

interface Props {
  onMasterItemsChange: (items: MasterItem[]) => void
  userId: string
  deleteConfirmEnabled: boolean
}

export function MasterScreen({ onMasterItemsChange, userId, deleteConfirmEnabled }: Props) {
  const [items, setItems] = useState<MasterItem[]>(() => offlineCache.loadMasterItems<MasterItem[]>() ?? [])
  const [modalOpen, setModalOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [editItem, setEditItem] = useState<MasterItem | undefined>()
  const [quickItem, setQuickItem] = useState<MasterItem | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [skipDeleteConfirmChecked, setSkipDeleteConfirmChecked] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const longPressTimer = useRef<number | null>(null)
  const longPressTriggered = useRef(false)

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase.from('sl_master_items').select('*').order('category').order('name')
    if (error) {
      // オフライン時はキャッシュをそのまま使う
      const cached = offlineCache.loadMasterItems<MasterItem[]>()
      if (cached) { setItems(cached); onMasterItemsChange(cached) }
      return
    }
    if (data) {
      setItems(data)
      offlineCache.saveMasterItems(data)
      onMasterItemsChange(data)
    }
  }, [onMasterItemsChange])

  useEffect(() => { loadItems() }, [loadItems])

  // 画像がないアイテムをバックグラウンドで自動補完する
  useEffect(() => {
    if (items.length === 0) return
    const missing = items.filter(i => !i.image_url)
    if (missing.length === 0) return
    void (async () => {
      for (const item of missing) {
        const url = await resolveDefaultFoodImage(item.name, item.category)
        if (!url) continue
        await supabase.from('sl_master_items').update({ image_url: url }).eq('id', item.id)
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, image_url: url } : i))
      }
    })()
  }, [items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const confirmDelete = async (directId?: string) => {
    const id = directId ?? pendingDeleteId
    if (!id) return
    setPendingDeleteId(null)
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('sl_master_items').delete().eq('id', id)
    onMasterItemsChange(items.filter(i => i.id !== id))
  }

  const grouped = items.reduce<Record<string, MasterItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const startLongPress = (item: MasterItem) => {
    longPressTriggered.current = false
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      setQuickItem(item)
    }, 450)
  }

  const endLongPress = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  const updateQtyQuick = async (delta: number) => {
    if (!quickItem) return
    const nextQty = Math.max(1, quickItem.default_qty + delta)
    const id = quickItem.id
    setItems(prev => prev.map(i => i.id === id ? { ...i, default_qty: nextQty } : i))
    setQuickItem({ ...quickItem, default_qty: nextQty })
    const { error } = await supabase.from('sl_master_items').update({ default_qty: nextQty }).eq('id', id)
    if (error) console.error('数量更新エラー:', error.message)
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
    setShowBulkConfirm(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const bulkDelete = async () => {
    const ids = [...selectedIds]
    exitSelectMode()
    setItems(prev => prev.filter(i => !ids.includes(i.id)))
    const { error } = await supabase.from('sl_master_items').delete().in('id', ids)
    if (error) { alert(`Delete failed: ${error.message}`); await loadItems(); return }
    onMasterItemsChange(items.filter(i => !ids.includes(i.id)))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-rose-800">📋 My Items</h1>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <button onClick={exitSelectMode}
              className="border border-rose-200 text-rose-400 text-sm font-semibold rounded-xl px-3 py-2 active:scale-95 transition-all">
              Cancel
            </button>
          ) : (
            <>
              <button onClick={() => setScanOpen(true)}
                className="flex items-center gap-1.5 border border-rose-200 text-rose-400 text-sm font-semibold rounded-xl px-3 py-2 hover:border-rose-400 hover:text-rose-600 transition-all active:scale-95">
                <Camera size={15} /> Scan
              </button>
              <button onClick={() => setSelectMode(true)}
                className="border border-rose-200 text-rose-400 text-sm font-semibold rounded-xl px-3 py-2 hover:border-rose-400 hover:text-rose-600 transition-all active:scale-95">
                Select
              </button>
              <button onClick={() => { setEditItem(undefined); setModalOpen(true) }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-all shadow-md shadow-rose-200/50 active:scale-95">
                <Plus size={16} /> Add
              </button>
            </>
          )}
        </div>
      </div>

      {/* 選択モード時の薄暗いオーバーレイ */}
      {selectMode && <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none" />}

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4 relative z-20">
        {/* Empty state — clickable to open Add modal */}
        {items.length === 0 && (
          <button onClick={() => { setEditItem(undefined); setModalOpen(true) }}
            className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8 w-full hover:opacity-80 active:scale-95 transition-all cursor-pointer">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-pink-500 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-200/50">
              <Plus size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <p className="text-rose-800 font-semibold text-lg">No items yet</p>
            <p className="text-rose-400 text-sm">Tap here to add items you buy often!</p>
          </button>
        )}

        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">{CATEGORY_EMOJI[cat] ?? '📦'}</span>
              <span className="text-sm font-bold text-rose-700">{CATEGORY_LABEL[cat] ?? cat}</span>
              <span className="text-[10px] text-rose-300">({catItems.length})</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {catItems.map(item => {
                const isSelected = selectedIds.has(item.id)
                return (
                  <button key={item.id}
                    onMouseDown={() => { if (!selectMode) startLongPress(item) }}
                    onMouseUp={endLongPress}
                    onMouseLeave={endLongPress}
                    onTouchStart={() => { if (!selectMode) startLongPress(item) }}
                    onTouchEnd={endLongPress}
                    onClick={() => {
                      if (selectMode) { toggleSelect(item.id); return }
                      if (longPressTriggered.current) { longPressTriggered.current = false; return }
                      setEditItem(item); setModalOpen(true)
                    }}
                    className={`rounded-xl border overflow-hidden text-left transition-all active:scale-95 relative
                      ${selectMode && isSelected
                        ? 'border-rose-400 ring-2 ring-rose-400 bg-white scale-95 shadow-lg shadow-rose-200/50'
                        : selectMode
                          ? 'border-rose-100 bg-white opacity-50'
                          : 'border-rose-100 bg-white'
                      }`}>
                    <div className="aspect-square flex items-center justify-center bg-rose-50 overflow-hidden">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">{CATEGORY_EMOJI[item.category] ?? '📦'}</span>
                      )}
                    </div>
                    <div className="px-1.5 py-1 text-center">
                      <p className="text-[10px] font-semibold text-rose-800 line-clamp-1">{item.name}</p>
                      <p className="text-[9px] text-rose-400">¥{item.default_price.toLocaleString()}</p>
                    </div>
                    {/* 選択チェックマーク */}
                    {selectMode && isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
                        <span className="text-white text-[10px] font-black">✓</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 選択モード時の一括削除ボタン */}
      {selectMode && (
        <div className="absolute bottom-16 left-0 right-0 z-30 px-4 pb-3 pt-2 bg-white/90 backdrop-blur-sm border-t border-rose-100">
          <button
            onClick={() => { if (selectedIds.size > 0) setShowBulkConfirm(true) }}
            disabled={selectedIds.size === 0}
            className="w-full bg-gradient-to-r from-red-400 to-rose-500 disabled:from-rose-200 disabled:to-pink-200 text-white font-bold rounded-2xl py-3.5 transition-all shadow-lg shadow-rose-200/50 disabled:shadow-none">
            {selectedIds.size === 0 ? 'Select items to delete' : `Delete ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Delete confirmation popup */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPendingDeleteId(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-[300px] text-center space-y-3 shadow-xl">
            <p className="text-2xl">🗑️</p>
            <p className="font-bold text-rose-800">Delete this item?</p>
            <p className="text-sm text-rose-400">It will be removed from My Items.</p>
            <div className="flex gap-3">
              <button onClick={() => { setPendingDeleteId(null); setSkipDeleteConfirmChecked(false) }}
                className="flex-1 border border-rose-200 text-rose-400 rounded-2xl py-2.5 text-sm font-medium hover:bg-rose-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => {
                if (skipDeleteConfirmChecked) saveDeleteConfirmSetting(false)
                setSkipDeleteConfirmChecked(false)
                void confirmDelete()
              }}
                className="flex-1 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-2xl py-2.5 text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
            <label className="flex items-center justify-center gap-2 text-xs text-rose-500">
              <input type="checkbox" checked={skipDeleteConfirmChecked}
                onChange={(e) => setSkipDeleteConfirmChecked(e.target.checked)}
                className="w-4 h-4 accent-rose-500" />
              Don't ask again
            </label>
          </div>
        </div>
      )}

      {/* 一括削除確認ダイアログ */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBulkConfirm(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-[300px] text-center space-y-3 shadow-xl">
            <p className="text-2xl">🗑️</p>
            <p className="font-bold text-rose-800">Delete {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}?</p>
            <p className="text-sm text-red-400">All list data for selected items will also be deleted.</p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowBulkConfirm(false)}
                className="flex-1 border border-rose-200 text-rose-400 rounded-2xl py-2.5 text-sm font-medium hover:bg-rose-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => void bulkDelete()}
                className="flex-1 bg-gradient-to-r from-red-400 to-rose-500 text-white rounded-2xl py-2.5 text-sm font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {quickItem && (
        <div className="fixed inset-0 z-[75] flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setQuickItem(null)} />
          <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-5 pb-8 mb-16 space-y-4">
            <p className="font-bold text-rose-800">{quickItem.name}</p>
            <div>
              <p className="text-xs text-rose-400 mb-2">Quantity</p>
              <div className="flex items-center border border-rose-200 rounded-xl overflow-hidden">
                <button onClick={() => updateQtyQuick(-1)}
                  className="w-12 h-11 text-rose-500 text-xl">-</button>
                <span className="flex-1 text-center font-bold text-rose-800">{quickItem.default_qty}</span>
                <button onClick={() => updateQtyQuick(1)}
                  className="w-12 h-11 text-rose-500 text-xl">+</button>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setQuickItem(null)}
                className="flex-1 border border-rose-200 text-rose-500 rounded-2xl py-2.5 text-sm font-semibold">
                Close
              </button>
              <button onClick={() => {
                const id = quickItem.id
                setQuickItem(null)
                if (deleteConfirmEnabled) setPendingDeleteId(id)
                else void confirmDelete(id)
              }}
                className="flex-1 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-2xl py-2.5 text-sm font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <AiMasterScanModal isOpen={scanOpen} onClose={() => setScanOpen(false)}
        userId={userId} onAdded={loadItems} />

      <MasterItemModal item={editItem} isOpen={modalOpen} userId={userId}
        deleteConfirmEnabled={deleteConfirmEnabled}
        onClose={() => setModalOpen(false)} onSave={loadItems}
        onDelete={async (id) => {
          setItems(prev => prev.filter(i => i.id !== id))
          await supabase.from('sl_master_items').delete().eq('id', id)
          onMasterItemsChange(items.filter(i => i.id !== id))
        }} />
    </div>
  )
}
