'use client'
// 全完了時の祝福演出コンポーネント（canvas-confetti使用）
import { useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'

interface Props {
  onDismiss: () => void
}

export function Celebration({ onDismiss }: Props) {
  // 紙吹雪を打ち上げる
  const fireConfetti = useCallback(() => {
    // 左から
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.15, y: 0.6 },
      colors: ['#fb7185', '#f9a8d4', '#fda4af', '#f472b6', '#fbbf24', '#a3e635', '#60a5fa'],
    })
    // 右から
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.85, y: 0.6 },
      colors: ['#fb7185', '#f9a8d4', '#fda4af', '#f472b6', '#fbbf24', '#a3e635', '#60a5fa'],
    })
    // 中央上から少し遅れて
    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#fb7185', '#f9a8d4', '#fbbf24', '#a3e635', '#60a5fa'],
      })
    }, 300)
  }, [])

  useEffect(() => {
    fireConfetti()
    // 1.5秒後にもう一回
    const timer = setTimeout(fireConfetti, 1500)
    return () => clearTimeout(timer)
  }, [fireConfetti])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      style={{ background: 'rgba(255,241,242,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onDismiss}
    >
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
