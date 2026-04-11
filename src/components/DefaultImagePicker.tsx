'use client'
import { X } from 'lucide-react'
import { FOOD_IMAGE_OPTIONS } from '@/lib/foodImageOptions'

interface Props {
  isOpen: boolean
  currentUrl: string | null
  onSelect: (url: string) => void
  onClose: () => void
}

export function DefaultImagePicker({ isOpen, currentUrl, onSelect, onClose }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[95] flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl overflow-hidden max-h-[75vh] flex flex-col">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-rose-50">
          <p className="text-sm font-bold text-rose-800">Choose default image</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* 画像グリッド */}
        <div className="overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {FOOD_IMAGE_OPTIONS.map(opt => {
              const isSelected = currentUrl === opt.url
              return (
                <button key={opt.url} onClick={() => { onSelect(opt.url); onClose() }}
                  className={`rounded-2xl overflow-hidden border-2 transition-all active:scale-95
                    ${isSelected
                      ? 'border-rose-400 ring-2 ring-rose-300 shadow-lg shadow-rose-200/50'
                      : 'border-transparent hover:border-rose-200'
                    }`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={opt.url} alt={opt.label} className="w-full aspect-square object-cover" />
                  <div className={`py-1.5 text-center text-[10px] font-semibold leading-tight px-1
                    ${isSelected ? 'bg-rose-400 text-white' : 'bg-rose-50 text-rose-600'}`}>
                    {opt.label}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
