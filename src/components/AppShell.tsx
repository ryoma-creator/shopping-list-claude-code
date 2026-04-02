'use client'
import { useState, useEffect, useCallback } from 'react'
import { TabBar, type TabId } from '@/components/TabBar'
import { TodayScreen } from '@/components/TodayScreen'
import { MasterScreen } from '@/components/MasterScreen'
import { TemplatesScreen } from '@/components/TemplatesScreen'
import { AuthScreen } from '@/components/AuthScreen'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { LogOut, ShoppingCart } from 'lucide-react'
import type { MasterItem } from '@/types/database'

export function AppShell() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth()
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

  // Load on mount (only when authenticated)
  useEffect(() => {
    if (user) loadMasterItems()
  }, [user, loadMasterItems])

  // Reload when switching to today tab
  useEffect(() => {
    if (user && activeTab === 'today') {
      loadMasterItems()
    }
  }, [user, activeTab, loadMasterItems])

  // PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // Loading splash
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center bg-rose-50" style={{ height: '100dvh' }}>
        <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200/50 animate-pulse">
          <ShoppingCart size={28} className="text-white" />
        </div>
      </div>
    )
  }

  // Not logged in → show auth screen
  if (!user) {
    return <AuthScreen onSignIn={signIn} onSignUp={signUp} />
  }

  return (
    <div className="flex flex-col bg-rose-50" style={{ height: '100dvh' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg flex items-center justify-center">
            <ShoppingCart size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-rose-800">Shopping List</span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-rose-100"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
        </button>
      </div>

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
