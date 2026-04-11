'use client'
import { useState, useEffect } from 'react'
import { X, Minus, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { loadDeleteConfirmSetting, saveDeleteConfirmSetting } from '@/lib/userSettings'
import type { Category, MasterItem } from '@/types/database'

const CATEGORIES: { value: Category; emoji: string; label: string }[] = [
  { value: 'meat',       emoji: '🥩', label: 'Meat' },
  { value: 'fish',       emoji: '🐟', label: 'Fish' },
  { value: 'dairy',      emoji: '🥛', label: 'Milk' },
  { value: 'fruits',     emoji: '🍎', label: 'Fruits' },
  { value: 'vegetables', emoji: '🥦', label: 'Veggies' },
  { value: 'frozen',     emoji: '🧊', label: 'Frozen' },
  { value: 'bakery',     emoji: '🍞', label: 'Bakery' },
  { value: 'drinks',     emoji: '🥤', label: 'Drinks' },
  { value: 'snacks',     emoji: '🍿', label: 'Snacks' },
  { value: 'other',      emoji: '📦', label: 'Other' },
]

interface Props {
  item: MasterItem | null
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

export function MasterItemEditSheet({ item, onClose, onSaved, onDeleted }: Props) {
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState<Category>('other')
  const [editPriceStr, setEditPriceStr] = useState('')
  const [editQty, setEditQty] = useState(1)
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [skipNextTime, setSkipNextTime] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!item) return
    setEditName(item.name)
    setEditCategory(item.category)
    setEditPriceStr(item.default_price > 0 ? String(item.default_price) : '')
    setEditQty(Math.max(0, item.default_qty))
    setShowCatPicker(false)
    setShowDeleteConfirm(false)
    setSkipNextTime(false)
  }, [item])

  if (!item) return null

  const activeCat = CATEGORIES.find(c => c.value === editCategory)

  const handleSave = async () => {
    if (!editName.trim()) return
    setSaving(true)
    const { error } = await supabase.from('sl_master_items').update({
      name: editName.trim(),
      category: editCategory,
      default_price: editPriceStr === '' ? 0 : Number(editPriceStr),
      default_qty: editQty,
    }).eq('id', item.id)
    setSaving(false)
    if (error) { alert(error.message); return }
    onSaved()
    onClose()
  }

  const handleDeleteClick = () => {
    // 確認スキップ設定を確認してから削除
    if (!loadDeleteConfirmSetting()) { void execDelete(); return }
    setShowDeleteConfirm(true)
  }

  const execDelete = async () => {
    if (skipNextTime) saveDeleteConfirmSetting(false)
    const { error } = await supabase.from('sl_master_items').delete().eq('id', item.id)
    if (error) { alert(error.message); return }
    onDeleted()
    onClose()
  }

  return (
    <>
      {/* メイン編集シート */}
      <div className="fixed inset-0 z-[75] flex items-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-5 pb-8 space-y-4 max-h-[88vh] overflow-y-auto">

          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-rose-800">Edit Item</p>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* アイテム名 */}
          <div>
            <label className="text-xs text-rose-400 mb-1 block">Item name</label>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full border border-rose-200 rounded-xl px-4 py-2.5 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </div>

          {/* カテゴリ — 選択中の1つだけ表示、タップで選択モーダルを開く */}
          <div>
            <label className="text-xs text-rose-400 mb-2 block">Category</label>
            <button onClick={() => setShowCatPicker(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-400 text-white font-semibold text-sm shadow-md active:scale-95 transition-all">
              <span className="text-xl leading-none">{activeCat?.emoji}</span>
              <span>{activeCat?.label}</span>
              <span className="text-[10px] opacity-70 ml-0.5">▼</span>
            </button>
          </div>

          {/* 価格 */}
          <div>
            <label className="text-xs text-rose-400 mb-1 block">Price (¥)</label>
            <input type="text" inputMode="numeric" placeholder="0"
              value={editPriceStr} onChange={e => setEditPriceStr(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full border border-rose-200 rounded-xl px-4 py-2.5 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </div>

          {/* 数量 — メインの操作、大きく目立たせる */}
          <div>
            <label className="text-xs text-rose-400 mb-4 block text-center tracking-widest uppercase">Quantity</label>
            <div className="flex items-center justify-center gap-8">
              <button onClick={() => setEditQty(q => Math.max(0, q - 1))}
                className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-500 hover:bg-rose-200 active:scale-90 transition-all shadow-sm">
                <Minus size={30} strokeWidth={2.5} />
              </button>
              <span className="text-6xl font-black text-rose-700 min-w-[64px] text-center leading-none">{editQty}</span>
              <button onClick={() => setEditQty(q => q + 1)}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white hover:from-rose-500 hover:to-pink-600 active:scale-90 transition-all shadow-lg shadow-rose-200/50">
                <Plus size={30} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* 保存 */}
          <button onClick={handleSave} disabled={saving || !editName.trim()}
            className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-white font-bold rounded-2xl py-3.5 disabled:opacity-50 shadow-lg shadow-rose-200/50 text-base">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* 削除ボタン or 確認UI */}
          {!showDeleteConfirm ? (
            <button onClick={handleDeleteClick}
              className="w-full border border-red-200 text-red-400 rounded-2xl py-2.5 text-sm font-semibold hover:bg-red-50 transition-colors">
              Delete from My Items
            </button>
          ) : (
            <div className="bg-red-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-red-600 text-center">「{item.name}」を削除しますか？</p>
              <p className="text-xs text-red-400 text-center">このアイテムに紐づくリストのデータも全て消えます。</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 border border-rose-200 text-rose-400 rounded-xl py-2 text-sm font-medium">
                  キャンセル
                </button>
                <button onClick={() => void execDelete()}
                  className="flex-1 bg-gradient-to-r from-red-400 to-rose-500 text-white rounded-xl py-2 text-sm font-semibold">
                  削除する
                </button>
              </div>
              <label className="flex items-center justify-center gap-2 text-xs text-rose-500">
                <input type="checkbox" checked={skipNextTime} onChange={e => setSkipNextTime(e.target.checked)}
                  className="w-4 h-4 accent-rose-500" />
                次回から確認を表示しない
              </label>
            </div>
          )}
        </div>
      </div>

      {/* カテゴリ選択サブモーダル */}
      {showCatPicker && (
        <div className="fixed inset-0 z-[85] flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCatPicker(false)} />
          <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-5 pb-8">
            <p className="text-sm font-bold text-rose-800 mb-3">Select Category</p>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => { setEditCategory(c.value); setShowCatPicker(false) }}
                  className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all active:scale-95
                    ${editCategory === c.value
                      ? 'bg-rose-400 text-white shadow-md ring-2 ring-rose-300'
                      : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}>
                  <span className="text-2xl leading-none">{c.emoji}</span>
                  <span className="text-[10px] font-medium leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
