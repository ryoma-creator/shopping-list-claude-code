'use client'
import { useState, useEffect, useCallback } from 'react'
import { TabBar, type TabId } from '@/components/TabBar'
import { TodayScreen } from '@/components/TodayScreen'
import { MasterScreen } from '@/components/MasterScreen'
import { TemplatesScreen } from '@/components/TemplatesScreen'
import { supabase } from '@/lib/supabase/client'
import type { MasterItem } from '@/types/database'

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('today')
  const [masterItems, setMasterItems] = useState<MasterItem[]>([])

  const loadMasterItems = useCallback(async () => {
    const { data } = await supabase
      .from('sl_master_items')
      .select('*')
      .order('category')
      .order('name')
    if (data) setMasterItems(data)
  }, [])

  // Load on mount
  useEffect(() => {
    loadMasterItems()
  }, [loadMasterItems])

  // Reload master items every time we switch TO today tab
  // so newly added items in My Items are always available
  useEffect(() => {
    if (activeTab === 'today') {
      loadMasterItems()
    }
  }, [activeTab, loadMasterItems])

  // PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <div className="flex flex-col bg-rose-50" style={{ height: '100dvh' }}>
      {/* Decorative hearts */}
      <div className="fixed top-0 left-0 right-0 max-w-[430px] mx-auto pointer-events-none z-0">
        <div className="absolute top-4 right-6 text-rose-200 text-2xl">♥</div>
        <div className="absolute top-12 left-4 text-rose-100 text-lg">♥</div>
      </div>

      <main className="flex-1 flex flex-col relative overflow-hidden pb-16">
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

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
