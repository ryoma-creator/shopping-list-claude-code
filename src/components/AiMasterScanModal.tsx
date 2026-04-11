'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Camera, Sparkles, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { prepareImageForAiScan } from '@/lib/aiScanImage'
import { getInitialScanLanguage, saveScanLanguage, type ScanLanguage } from '@/lib/scanLanguage'
import { resolveDefaultFoodImage } from '@/lib/defaultFoodImage'
import type { Category } from '@/types/database'

const VALID_CATS: Category[] = ['meat','fish','dairy','fruits','vegetables','frozen','bakery','drinks','snacks','other']
const CAT_EMOJI: Record<string, string> = {
  meat:'🥩', fish:'🐟', dairy:'🥛', fruits:'🍎', vegetables:'🥦',
  frozen:'🧊', bakery:'🍞', drinks:'🥤', snacks:'🍿', other:'📦',
}
const CAT_LABEL: Record<string, string> = {
  meat:'meat', fish:'fish', dairy:'dairy', fruits:'fruits', vegetables:'vegetables',
  frozen:'frozen', bakery:'bakery', drinks:'drinks', snacks:'snacks', other:'other',
}

interface ScannedItem { name: string; category: Category; price: number | null }

interface Props {
  isOpen: boolean
  onClose: () => void
  userId: string
  onAdded: () => void
}

type Phase = 'select' | 'preview' | 'scanning' | 'results'
const LANGUAGE_OPTIONS: { value: ScanLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'it', label: 'Italiano' },
  { value: 'es', label: 'Espanol' },
  { value: 'fr', label: 'Francais' },
  { value: 'ko', label: 'Korean' },
]

export function AiMasterScanModal({ isOpen, onClose, userId, onAdded }: Props) {
  const [phase, setPhase] = useState<Phase>('select')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('image/jpeg')
  const [items, setItems] = useState<ScannedItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<ScanLanguage>('en')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setLanguage(getInitialScanLanguage(userId))
  }, [isOpen, userId])

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    try {
      const prepared = await prepareImageForAiScan(file)
      setMimeType(prepared.mimeType)
      setImagePreview(prepared.previewDataUrl)
      setImageBase64(prepared.imageBase64)
      setPhase('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像の読み込みに失敗しました')
      setPhase('select')
    }
  }, [])

  const handleScan = async () => {
    if (!imageBase64) return
    setPhase('scanning')
    setError(null)
    try {
      const res = await fetch('/api/ai-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType, language }),
      })
      const json = await res.json() as { items?: { name: string; category: string; price?: number | null }[]; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? 'スキャン失敗')
      const scanned: ScannedItem[] = (json.items ?? []).map(i => ({
        name: i.name,
        category: (VALID_CATS.includes(i.category as Category) ? i.category : 'other') as Category,
        price: typeof i.price === 'number' ? i.price : null,
      }))
      setItems(scanned)
      setSelected(new Set(scanned.map((_, i) => i)))
      saveScanLanguage(userId, language)
      setPhase('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
      setPhase('preview')
    }
  }

  const toggleSelect = (i: number) => {
    setSelected(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })
  }

  const handleAdd = async () => {
    setAdding(true)
    const toAdd = items.filter((_, i) => selected.has(i))
    for (const item of toAdd) {
      const autoImage = await resolveDefaultFoodImage(item.name, item.category)
      await supabase.from('sl_master_items').insert({
        user_id: userId, name: item.name, category: item.category, image_url: autoImage,
        default_price: item.price ?? 0, default_qty: 1,
      })
    }
    setAdding(false)
    onAdded()
    handleClose()
  }

  const handleClose = () => {
    setPhase('select'); setImagePreview(null); setImageBase64(null)
    setItems([]); setSelected(new Set()); setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative flex-1 flex flex-col mt-16 mx-auto w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-rose-50">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-rose-400" />
            <h2 className="text-base font-bold text-rose-800">AI スキャンで追加</h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* 写真選択 */}
          {phase === 'select' && (
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-4 py-16 rounded-3xl border-2 border-dashed border-rose-200 hover:border-rose-400 hover:bg-rose-50 transition-all active:scale-95">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200/50">
                <Camera size={28} className="text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-rose-800">写真・スクショを選択</p>
                <p className="text-xs text-rose-400 mt-1">商品棚 / レシート / メモアプリのスクショ</p>
              </div>
            </button>
          )}
          {phase === 'select' && (
            <div className="mt-3">
              <label className="text-sm text-rose-600 font-semibold">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value as ScanLanguage)}
                className="mt-1 w-full rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-base font-semibold text-rose-700">
                {LANGUAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          )}

          {/* プレビュー */}
          {(phase === 'preview' || phase === 'scanning') && imagePreview && (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="選択した画像" className="w-full rounded-2xl object-contain max-h-64" />
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <div>
                <label className="text-sm text-rose-600 font-semibold">Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value as ScanLanguage)}
                  className="mt-1 w-full rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-base font-semibold text-rose-700"
                  disabled={phase === 'scanning'}>
                  {LANGUAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setPhase('select'); setImagePreview(null) }}
                  className="flex-1 border border-rose-200 text-rose-400 rounded-2xl py-3 text-sm font-medium hover:bg-rose-50 transition-colors">
                  選び直す
                </button>
                <button onClick={handleScan} disabled={phase === 'scanning'}
                  className="flex-1 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-2xl py-3 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {phase === 'scanning'
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />解析中...</>
                    : <><Sparkles size={15} />AIでスキャン</>}
                </button>
              </div>
            </div>
          )}

          {/* 結果 */}
          {phase === 'results' && (
            <div className="space-y-3">
              <p className="text-sm text-rose-500 font-medium">{items.length}件検出 — 名前と自動カテゴリで追加されます</p>
              {items.map((item, i) => (
                <div key={i} className={`rounded-2xl border transition-all ${selected.has(i) ? 'border-rose-300 bg-rose-50' : 'border-rose-100 opacity-50'}`}>
                  <div className="flex items-center gap-3 p-3">
                    <button onClick={() => toggleSelect(i)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                        ${selected.has(i) ? 'bg-gradient-to-br from-rose-400 to-pink-500 border-transparent' : 'border-rose-300'}`}>
                      {selected.has(i) && <span className="text-white text-xs font-black">✓</span>}
                    </button>
                    <p className="flex-1 text-sm font-semibold text-rose-800">{item.name}</p>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-white border border-rose-200 text-rose-500 shrink-0">
                      {CAT_EMOJI[item.category]} {CAT_LABEL[item.category]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 追加ボタン */}
        {phase === 'results' && selected.size > 0 && (
          <div className="px-5 pb-24 pt-3 shrink-0 border-t border-rose-50">
            <button onClick={handleAdd} disabled={adding}
              className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold rounded-2xl py-3.5 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-rose-200/50">
              <Plus size={18} />
              {adding ? '追加中...' : `${selected.size}件をMy Itemsに追加`}
            </button>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.bmp,.tif,.tiff,.avif,image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}
