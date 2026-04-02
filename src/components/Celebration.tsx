'use client'
// 全完了時の祝福演出コンポーネント
import { useMemo } from 'react'

const COLORS = ['#fb7185', '#f9a8d4', '#fda4af', '#f472b6', '#fbbf24', '#a3e635', '#60a5fa']

interface Piece {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  size: number
  isCircle: boolean
}

function useConfetti(count: number): Piece[] {
  return useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.8,
      duration: 2.2 + Math.random() * 1.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 7 + Math.random() * 9,
      isCircle: i % 3 === 0,
    })),
  [count])
}

interface Props {
  onDismiss: () => void
}

export function Celebration({ onDismiss }: Props) {
  const pieces = useConfetti(70)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      style={{ background: 'rgba(255,241,242,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onDismiss}
    >
      {/* 紙吹雪 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {pieces.map((p) => (
          <div
            key={p.id}
            className="absolute top-0 animate-confetti"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.isCircle ? '50%' : '2px',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* メッセージ */}
      <div className="text-center space-y-3 animate-bounce-in px-8">
        <div className="text-7xl" style={{ animation: 'bounce 0.8s infinite' }}>🎉</div>
        <h2 className="text-5xl font-black text-rose-500 tracking-tight drop-shadow-sm">
          All Done!
        </h2>
        <p className="text-rose-400 font-semibold text-lg">Shopping complete! ✨</p>
        <p className="text-rose-300 text-sm pt-4">Tap anywhere to continue</p>
      </div>
    </div>
  )
}
