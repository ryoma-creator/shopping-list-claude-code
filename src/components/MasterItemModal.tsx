'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Camera, Minus, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
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
  item?: MasterItem
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onDelete?: (id: string) => void
}

export function MasterItemModal({ item, isOpen, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('other')
  const [priceStr, setPriceStr] = useState('')
  const [qty, setQty] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setCategory(item.category)
      setPriceStr(item.default_price > 0 ? String(item.default_price) : '')
      setQty(item.default_qty)
      setImageUrl(item.image_url ?? null)
    } else {
      setName('')
      setCategory('other')
      setPriceStr('')
      setQty(1)
      setImageUrl(null)
    }
    setError(null)
    setShowDeleteConfirm(false)
  }, [item, isOpen])

  const priceNum = priceStr === '' ? 0 : Number(priceStr)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filePath = `items/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        console.error('Upload error:', uploadError)
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
    setError(null)
    try {
      // Base payload (always works even without image_url column)
      const base = { name: name.trim(), category, default_price: priceNum, default_qty: qty }
      // Only include image_url if user uploaded a photo
      const payload = imageUrl ? { ...base, image_url: imageUrl } : base

      if (item) {
        // Try with image_url first, fallback without it
        let { error: err } = await supabase.from('sl_master_items').update(payload).eq('id', item.id)
        if (err && imageUrl) {
          // image_url column might not exist yet — retry without it
          const result = await supabase.from('sl_master_items').update(base).eq('id', item.id)
          err = result.error
        }
        if (err) { setError(`Save failed: ${err.message}`); return }
      } else {
        let { error: err } = await supabase.from('sl_master_items').insert(payload)
        if (err && imageUrl) {
          const result = await supabase.from('sl_master_items').insert(base)
          err = result.error
        }
        if (err) { setError(`Save failed: ${err.message}`); return }
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
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-5 pb-24 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-rose-800">
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button onClick={onClose} className="text-rose-300 hover:text-rose-500">
            <X size={20} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2">
            {error}
          </div>
        )}

        {/* Photo upload */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-16 h-16 rounded-2xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center gap-0.5 hover:border-rose-400 hover:bg-rose-50 transition-colors overflow-hidden flex-shrink-0"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Item" className="w-full h-full object-cover" />
            ) : uploading ? (
              <span className="text-xs text-rose-400">...</span>
            ) : (
              <>
                <Camera size={18} className="text-rose-300" />
                <span className="text-[9px] text-rose-300 font-medium">Photo</span>
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
          <p className="text-xs text-rose-400">
            {imageUrl ? 'Tap to change photo' : 'Optional: add a photo'}
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
            <label className="text-xs text-rose-400 mb-2 block">Category</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all active:scale-95
                    ${category === c.value
                      ? 'bg-rose-400 text-white shadow-md ring-2 ring-rose-300'
                      : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    }`}
                >
                  <span className="text-xl leading-none">{c.emoji}</span>
                  <span className="text-[10px] font-medium leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-rose-400 mb-1 block">Price (¥)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full border border-rose-200 rounded-xl px-4 py-2.5 text-sm text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-rose-400 mb-1 block">Quantity</label>
              <div className="flex items-center border border-rose-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-10 h-[42px] flex items-center justify-center text-rose-400 hover:bg-rose-50 active:bg-rose-100 transition-colors">
                  <Minus size={16} />
                </button>
                <span className="flex-1 text-center text-sm font-semibold text-rose-900">{qty}</span>
                <button type="button" onClick={() => setQty(q => q + 1)}
                  className="w-10 h-[42px] flex items-center justify-center text-rose-400 hover:bg-rose-50 active:bg-rose-100 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="w-full bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 disabled:opacity-50 text-white font-bold rounded-2xl py-3.5 transition-all shadow-lg shadow-rose-200/50 text-base"
        >
          {loading ? 'Saving...' : item ? 'Save Changes' : 'Add Item ✨'}
        </button>

        {/* Delete button (edit mode only) */}
        {item && onDelete && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-rose-300 hover:text-rose-500 text-sm font-medium py-2 transition-colors"
          >
            Delete this item
          </button>
        )}

        {/* Delete confirmation */}
        {item && onDelete && showDeleteConfirm && (
          <div className="bg-red-50 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-red-600 text-center">Delete &ldquo;{item.name}&rdquo;?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border border-rose-200 text-rose-400 rounded-xl py-2 text-sm font-medium">
                Cancel
              </button>
              <button onClick={() => { onDelete(item.id); onClose() }}
                className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold">
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
