'use client'
// Add / Edit item modal for My Items（写真アップロード対応）
import { useState, useEffect, useRef } from 'react'
import { X, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { Category, MasterItem } from '@/types/database'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'meat',       label: '🥩 Meat' },
  { value: 'fish',       label: '🐟 Fish' },
  { value: 'dairy',      label: '🥛 Dairy' },
  { value: 'fruits',     label: '🍎 Fruits' },
  { value: 'vegetables', label: '🥦 Vegetables' },
  { value: 'frozen',     label: '🧊 Frozen' },
  { value: 'bakery',     label: '🍞 Bakery' },
  { value: 'drinks',     label: '🥤 Drinks' },
  { value: 'snacks',     label: '🍿 Snacks' },
  { value: 'other',      label: 'Other' },
]

const CATEGORY_EMOJI: Record<string, string> = {
  meat: '🥩', fish: '🐟', dairy: '🥛', fruits: '🍎',
  vegetables: '🥦', frozen: '🧊', bakery: '🍞', drinks: '🥤',
  snacks: '🍿', other: '📦',
}

interface Props {
  item?: MasterItem
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export function MasterItemModal({ item, isOpen, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('other')
  const [price, setPrice] = useState(0)
  const [qty, setQty] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // フォーム初期化
  useEffect(() => {
    if (item) {
      setName(item.name)
      setCategory(item.category)
      setPrice(item.default_price)
      setQty(item.default_qty)
      setImageUrl(item.image_url ?? null)
    } else {
      setName('')
      setCategory('other')
      setPrice(0)
      setQty(1)
      setImageUrl(null)
    }
  }, [item, isOpen])

  // 写真アップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filePath = `items/${fileName}`

      const { error } = await supabase.storage
        .from('item-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (error) {
        console.error('Upload error:', error)
        return
      }

      const { data: urlData } = supabase.storage
        .from('item-images')
        .getPublicUrl(filePath)

      setImageUrl(urlData.publicUrl)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      if (item) {
        await supabase
          .from('sl_master_items')
          .update({ name, category, default_price: price, default_qty: qty, image_url: imageUrl })
          .eq('id', item.id)
      } else {
        await supabase
          .from('sl_master_items')
          .insert({ name, category, default_price: price, default_qty: qty, image_url: imageUrl })
      }
      onSave()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Modal */}
      <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-rose-800">
            {item ? 'Edit Item' : 'Add Item'}
          </h2>
          <button onClick={onClose} className="text-rose-300 hover:text-rose-500">
            <X size={20} />
          </button>
        </div>

        {/* 写真アップロード */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded-2xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center gap-1 hover:border-rose-400 hover:bg-rose-50 transition-colors overflow-hidden flex-shrink-0"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Item" className="w-full h-full object-cover" />
            ) : uploading ? (
              <span className="text-xs text-rose-400">...</span>
            ) : (
              <>
                <Camera size={20} className="text-rose-300" />
                <span className="text-[10px] text-rose-300 font-medium">Add Photo</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* カテゴリ絵文字プレビュー */}
          {!imageUrl && (
            <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">
              {CATEGORY_EMOJI[category] ?? '📦'}
            </div>
          )}

          <p className="text-xs text-rose-400 flex-1">
            {imageUrl ? 'Tap photo to change' : 'Take a photo or pick from gallery'}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-rose-400 mb-1 block">Item name</label>
            <input
              type="text"
              placeholder="e.g. Milk"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-rose-200 rounded-xl px-4 py-2.5 text-sm text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          <div>
            <label className="text-xs text-rose-400 mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full border border-rose-200 rounded-xl px-4 py-2.5 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-rose-400 mb-1 block">Price (¥)</label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full border border-rose-200 rounded-xl px-4 py-2.5 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-rose-400 mb-1 block">Quantity</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full border border-rose-200 rounded-xl px-4 py-2.5 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="w-full bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 transition-colors"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
