'use client'
// アプリのルートコンポーネント（タブ管理）
import { useState, useEffect } from 'react'
import { TabBar, type TabId } from '@/components/TabBar'
import { TodayScreen } from '@/components/TodayScreen'
import { MasterScreen } from '@/components/MasterScreen'
import { TemplatesScreen } from '@/components/TemplatesScreen'
import type { MasterItem } from '@/types/database'

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('today')
  const [masterItems, setMasterItems] = useState<MasterItem[]>([])

  // Service Worker を登録（PWA対応）
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service Worker 登録失敗は無視
      })
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-rose-50">
      {/* ハートデコレーション */}
      <div className="fixed top-0 left-0 right-0 max-w-[430px] mx-auto pointer-events-none z-0">
        <div className="absolute top-4 right-6 text-rose-200 text-2xl">♥</div>
        <div className="absolute top-12 left-4 text-rose-100 text-lg">♥</div>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col relative z-10">
        {activeTab === 'today' && (
          <TodayScreen masterItems={masterItems} />
        )}
        {activeTab === 'master' && (
          <MasterScreen onMasterItemsChange={setMasterItems} />
        )}
        {activeTab === 'templates' && (
          <TemplatesScreen onUseTemplate={() => setActiveTab('today')} />
        )}
      </main>

      {/* ボトムナビ */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
