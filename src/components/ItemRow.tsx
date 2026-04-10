'use client'
import { useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ListItem, MasterItem } from '@/types/database'

const EMOJI: Record<string, string> = {
  meat: '🥩', fish: '🐟', dairy: '🥛', fruits: '🍎',
  vegetables: '🥦', frozen: '🧊', bakery: '🍞', drinks: '🥤',
  snacks: '🍿', other: '📦',
}

const SWIPE_THRESHOLD = 100

interface Props {
  item: ListItem
  masterItem?: MasterItem
  onToggle: (id: string, checked: boolean) => void
  onDeleteRequest: (id: string) => void
  isLeaving?: boolean
}

export function ItemRow({ item, masterItem, onToggle, onDeleteRequest, isLeaving }: Props) {
  const imageUrl = masterItem?.image_url
  const categoryEmoji = masterItem ? (EMOJI[masterItem.category] ?? '🛒') : '🛒'
  const dragX = useMotionValue(0)
  const bgOpacity = useTransform(dragX, [0, SWIPE_THRESHOLD], [0, 1])
  const bgScale = useTransform(dragX, [0, SWIPE_THRESHOLD], [0.5, 1])
  const isDragging = useRef(false)

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    isDragging.current = false
    if (info.offset.x > SWIPE_THRESHOLD && !item.is_checked) {
      onToggle(item.id, true)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={
        isLeaving
          ? {
              opacity: 0,
              scale: 0.3,
              rotateZ: 8,
              height: 0,
              marginBottom: 0,
              paddingTop: 0,
              paddingBottom: 0,
              transition: { duration: 0.45, ease: [0.4, 0, 0.8, 0.6] },
            }
          : {
              opacity: 1,
              y: 0,
              scale: 1,
              rotateZ: 0,
              transition: { duration: 0.22, ease: 'easeOut' },
            }
      }
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Swipe background — green checkmark */}
      <motion.div
        className="absolute inset-0 bg-emerald-400 rounded-2xl flex items-center pl-5"
        style={{ opacity: bgOpacity }}
      >
        <motion.div style={{ scale: bgScale }} className="flex items-center gap-2">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-white text-sm font-bold">In Cart</span>
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag={item.is_checked ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        dragDirectionLock
        onDragStart={() => { isDragging.current = true }}
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 bg-white rounded-2xl border border-rose-100 relative',
          item.is_checked && 'opacity-40'
        )}
      >
        {/* Slash effect */}
        {isLeaving && (
          <motion.div
            initial={{ left: '-100%', opacity: 1 }}
            animate={{ left: '120%', opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeIn' }}
            className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-rose-300 via-rose-500 to-rose-300 -skew-x-12 z-20 pointer-events-none"
            style={{ filter: 'blur(1px)', boxShadow: '0 0 12px 4px rgba(251,113,133,0.5)' }}
          />
        )}

        {/* Thumbnail / check button */}
        <button
          onClick={(e) => {
            if (isDragging.current) { e.preventDefault(); return }
            onToggle(item.id, !item.is_checked)
          }}
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 overflow-hidden relative',
            item.is_checked
              ? 'ring-2 ring-rose-400'
              : 'ring-1 ring-rose-100'
          )}
          aria-label={item.is_checked ? 'Uncheck' : 'Check off'}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">{categoryEmoji}</span>
          )}

          {item.is_checked && (
            <div className="absolute inset-0 bg-rose-400/70 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-rose-900 truncate">{item.name}</p>
          <p className="text-[11px] text-rose-400">×{item.qty}</p>
        </div>

        {/* Price */}
        <span className="text-sm font-bold text-rose-700 flex-shrink-0">
          ¥{(item.price * item.qty).toLocaleString()}
        </span>

        {/* Delete */}
        <button
          onClick={() => onDeleteRequest(item.id)}
          className="p-1 text-rose-200 hover:text-rose-500 transition-colors flex-shrink-0 active:scale-90"
          aria-label="Delete"
        >
          <Trash2 size={14} />
        </button>
      </motion.div>
    </motion.div>
  )
}
