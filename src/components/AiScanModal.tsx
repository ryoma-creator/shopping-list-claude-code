'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Camera, Sparkles, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { offlineCache } from '@/lib/offlineCache'
import { prepareImageForAiScan } from '@/lib/aiScanImage'
import { getInitialScanLanguage, saveScanLanguage, type ScanLanguage } from '@/lib/scanLanguage'
import type { MasterItem, ListItem } from '@/types/database'

interface DetectedItem {
  name: string
  price: number | null
  masterItem?: MasterItem
}

interface Props {
  isOpen: boolean
  onClose: () => void
  listId: string
  masterItems: MasterItem[]
  currentItemCount: number
  userId: string
  onAdded: () => void
}

// マスターアイテムとの名前マッチング（部分一致）
function matchMaster(name: string, items: MasterItem[]): MasterItem | undefined {
  const n = name.toLowerCase().replace(/\s/g, '')
  return items.find(m => {
    const mn = m.name.toLowerCase().replace(/\s/g, '')
    return mn.includes(n) || n.includes(mn)
  })
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

export function AiScanModal({ isOpen, onClose, listId, masterItems, currentItemCount, userId, onAdded }: Props) {
  const [phase, setPhase] = useState<Phase>('select')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('image/jpeg')
  const [detected, setDetected] = useState<DetectedItem[]>([])
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
      const items = (json.items ?? []).map(({ name, price }) => ({
        name,
        price: typeof price === 'number' ? price : null,
        masterItem: matchMaster(name, masterItems),
      }))
      setDetected(items)
      setSelected(new Set(items.map((_, i) => i)))
      saveScanLanguage(userId, language)
      setPhase('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
      setPhase('preview')
    }
  }

  const toggleSelect = (i: number) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(i) ? s.delete(i) : s.add(i)
      return s
    })
  }

  const handleAdd = async () => {
    setAdding(true)
    const toAdd = detected.filter((_, i) => selected.has(i))
    for (let i = 0; i < toAdd.length; i++) {
      const { name, price, masterItem } = toAdd[i]
      const row = {
        list_id: listId,
        master_item_id: masterItem?.id ?? null,
        // 言語選択の結果を優先するため、検出名をそのまま使う
        name,
        price: masterItem?.default_price ?? (price ?? 0),
        qty: masterItem?.default_qty ?? 1,
        is_checked: false,
        sort_order: currentItemCount + i,
      }
      if (!navigator.onLine) {
        const tempId = `temp_${Date.now()}_${i}`
        const localItem: ListItem = { ...row, id: tempId, created_at: new Date().toISOString() }
        const cached = offlineCache.loadTodayItems<ListItem[]>() ?? []
        offlineCache.saveTodayItems([...cached, localItem])
        offlineCache.addPendingOp({ id: tempId, type: 'insert_list_item', payload: row, createdAt: Date.now() })
      } else {
        await supabase.from('sl_list_items').insert(row)
      }
    }
    setAdding(false)
    onAdded()
    handleClose()
  }

  const handleClose = () => {
    setPhase('select')
    setImagePreview(null)
    setImageBase64(null)
    setDetected([])
    setSelected(new Set())
    setError(null)
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
            <h2 className="text-base font-bold text-rose-800">AI スキャン</h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* 写真選択フェーズ */}
          {phase === 'select' && (
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-4 py-16 rounded-3xl border-2 border-dashed border-rose-200 hover:border-rose-400 hover:bg-rose-50 transition-all active:scale-95">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200/50">
                <Camera size={28} className="text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-rose-800">写真・スクショを選択</p>
                <p className="text-xs text-rose-400 mt-1">レシート / メモアプリのスクショ / 商品棚</p>
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

          {/* プレビューフェーズ */}
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
                  className="flex-1 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-2xl py-3 text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {phase === 'scanning' ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />解析中...</>
                  ) : (
                    <><Sparkles size={15} />AIでスキャン</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 結果フェーズ */}
          {phase === 'results' && (
            <div className="space-y-3">
              <p className="text-sm text-rose-500 font-medium">{detected.length}件検出 — 追加するものを選んでください</p>
              {detected.map((item, i) => (
                <button key={i} onClick={() => toggleSelect(i)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left
                    ${selected.has(i) ? 'border-rose-300 bg-rose-50' : 'border-rose-100 bg-white opacity-50'}`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                    ${selected.has(i) ? 'bg-gradient-to-br from-rose-400 to-pink-500 border-transparent' : 'border-rose-300'}`}>
                    {selected.has(i) && <span className="text-white text-xs font-black">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-rose-800 truncate">
                      {item.masterItem?.name ?? item.name}
                    </p>
                    {!item.masterItem && (
                      <p className="text-[10px] text-rose-300">My Itemsに未登録</p>
                    )}
                  </div>
                  {item.masterItem && (
                    <span className="text-xs bg-rose-100 text-rose-500 px-2 py-0.5 rounded-full shrink-0">登録済み</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 追加ボタン */}
        {phase === 'results' && selected.size > 0 && (
          <div className="px-5 pb-24 pt-3 shrink-0 border-t border-rose-50">
            <button onClick={handleAdd} disabled={adding}
              className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold rounded-2xl py-3.5 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-200/50">
              <Plus size={18} />
              {adding ? '追加中...' : `${selected.size}件をリストに追加`}
            </button>
          </div>
        )}
      </div>

      {/* 隠しファイル入力 */}
      <input ref={fileRef} type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.bmp,.tif,.tiff,.avif,image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}
