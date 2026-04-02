'use client'
// 買うものを選択 — 参考画像のような画像中心グリッド
import { useState } from 'react'
import { X, Plus, Check, Minus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { MasterItem } from '@/types/database'

const CATS = [
  { value: 'all',        emoji: '🛒', label: 'All' },
  { value: 'fruits',     emoji: '🍎', label: 'Fruits' },
  { value: 'vegetables', emoji: '🥦', label: 'Veggies' },
  { value: 'meat',       emoji: '🥩', label: 'Meat' },
  { value: 'fish',       emoji: '🐟', label: 'Fish' },
  { value: 'dairy',      emoji: '🥛', label: 'Dairy' },
  { value: 'bakery',     emoji: '🍞', label: 'Bread' },
  { value: 'snacks',     emoji: '🍿', label: 'Snacks' },
  { value: 'drinks',     emoji: '🥤', label: 'Drinks' },
  { value: 'frozen',     emoji: '🧊', label: 'Frozen' },
  { value: 'other',      emoji: '📦', label: 'Other' },
]

const EMOJI: Record<string, string> = {
  meat: '🥩', fish: '🐟', dairy: '🥛', fruits: '🍎',
  vegetables: '🥦', frozen: '🧊', bakery: '🍞', drinks: '🥤',
  snacks: '🍿', other: '📦',
}

interface Props {
  listId: string
  isOpen: boolean
  onClose: () => void
  masterItems: MasterItem[]
  onAdded?: () => void
}

export function ItemPickerModal({ listId, isOpen, onClose, masterItems, onAdded }: Props) {
  const [activeCat, setActiveCat] = useState('all')
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPriceStr, setCustomPriceStr] = useState('')
  const [customQty, setCustomQty] = useState(1)
  const [addingCustom, setAddingCustom] = useState(false)

  const filtered = activeCat === 'all' ? masterItems
    : masterItems.filter(i => i.category === activeCat)

  const addItem = async (item: MasterItem) => {
    if (justAdded.has(item.id)) return
    setJustAdded(prev => new Set([...prev, item.id]))
    await supabase.from('sl_list_items').insert({
      list_id: listId, master_item_id: item.id, name: item.name,
      price: item.default_price, qty: item.default_qty,
      is_checked: false, sort_order: masterItems.length,
    })
    onAdded?.()
    setTimeout(() => setJustAdded(prev => { const s = new Set(prev); s.delete(item.id); return s }), 1000)
  }

  const addCustom = async () => {
    if (!customName.trim()) return
    setAddingCustom(true)
    try {
      const customPrice = customPriceStr === '' ? 0 : Number(customPriceStr)
      await supabase.from('sl_list_items').insert({
        list_id: listId, master_item_id: null, name: customName.trim(),
        price: customPrice, qty: customQty, is_checked: false, sort_order: masterItems.length,
      })
      setCustomName(''); setCustomPriceStr(''); setCustomQty(1)
      onAdded?.(); setShowCustom(false)
    } finally { setAddingCustom(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* ほぼフルスクリーンモーダル */}
      <div className="relative flex-1 flex flex-col mt-10 mx-auto w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-base font-bold text-rose-800">買うものを選択</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCustom(v => !v)}
              className="text-[11px] text-rose-400 hover:text-rose-600 border border-rose-200 rounded-lg px-2.5 py-1 transition-colors">
              + Custom
            </button>
            <button onClick={onClose} className="text-rose-300 hover:text-rose-500 p-1"><X size={18} /></button>
          </div>
        </div>

        {/* Custom フォーム */}
        {showCustom && (
          <div className="px-4 pb-3 space-y-2 shrink-0 border-b border-rose-50">
            <input type="text" placeholder="Item name" value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] text-rose-400 block mb-0.5">Price (¥)</label>
                <input type="text" inputMode="numeric" placeholder="0" value={customPriceStr}
                  onChange={e => setCustomPriceStr(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full border border-rose-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-rose-400 block mb-0.5">Qty</label>
                <div className="flex items-center border border-rose-200 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setCustomQty(q => Math.max(1, q - 1))}
                    className="w-8 h-[34px] flex items-center justify-center text-rose-400">
                    <Minus size={14} />
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold">{customQty}</span>
                  <button type="button" onClick={() => setCustomQty(q => q + 1)}
                    className="w-8 h-[34px] flex items-center justify-center text-rose-400">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <button onClick={addCustom} disabled={addingCustom || !customName.trim()}
                className="bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 transition-colors h-[34px]">
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        {/* メインエリア: 左にカテゴリサイドバー、右にグリッド */}
        <div className="flex-1 flex overflow-hidden">

          {/* カテゴリサイドバー（参考画像のように右側に縦並び → 左側に配置） */}
          <div className="w-16 shrink-0 overflow-y-auto border-r border-rose-50 py-1" style={{ scrollbarWidth: 'none' }}>
            {CATS.map(cat => (
              <button key={cat.value} onClick={() => setActiveCat(cat.value)}
                className={`w-full flex flex-col items-center gap-0.5 py-2.5 transition-all
                  ${activeCat === cat.value
                    ? 'bg-rose-400 text-white'
                    : 'text-rose-500 hover:bg-rose-50'
                  }`}>
                <span className="text-lg leading-none">{cat.emoji}</span>
                <span className="text-[9px] font-medium leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* アイテムグリッド — 大きなタイル */}
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-4xl mb-2">{activeCat === 'all' ? '📋' : EMOJI[activeCat] ?? '📦'}</p>
                <p className="text-sm text-rose-300">
                  {masterItems.length === 0 ? 'My Items で商品を登録してね！' : 'このカテゴリにはまだ商品がないよ'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filtered.map(item => {
                  const added = justAdded.has(item.id)
                  return (
                    <button key={item.id} onClick={() => addItem(item)}
                      className={`flex flex-col items-center p-2 rounded-2xl transition-all active:scale-95 relative overflow-hidden aspect-square
                        ${added ? 'bg-rose-400 ring-2 ring-rose-500' : 'bg-white border border-rose-100 hover:border-rose-300'}`}>
                      {/* 大きな画像/絵文字 */}
                      <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-xl">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name}
                            className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span className="text-4xl">{EMOJI[item.category] ?? '📦'}</span>
                        )}
                      </div>
                      {/* 名前だけ（文字最小限） */}
                      <p className={`text-[11px] font-semibold text-center leading-tight line-clamp-1 w-full mt-1
                        ${added ? 'text-white' : 'text-rose-800'}`}>
                        {item.name}
                      </p>
                      {/* 追加済みチェック */}
                      {added && (
                        <div className="absolute inset-0 flex items-center justify-center bg-rose-400/80 rounded-2xl">
                          <Check size={32} className="text-white drop-shadow-lg" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
