'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { TabBar, type TabId } from '@/components/TabBar'
import { TodayScreen } from '@/components/TodayScreen'
import { MasterScreen } from '@/components/MasterScreen'
import { TemplatesScreen } from '@/components/TemplatesScreen'
import { AuthScreen } from '@/components/AuthScreen'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { offlineCache } from '@/lib/offlineCache'
import { loadDeleteConfirmSetting, saveDeleteConfirmSetting } from '@/lib/userSettings'
import { LogOut, ShoppingCart, WifiOff, RefreshCw, Settings, X } from 'lucide-react'
import type { MasterItem } from '@/types/database'

export function AppShell() {
  const { user, loading: authLoading, displayName, signIn, signUp, signOut, resetPassword } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('today')
  const [showSettings, setShowSettings] = useState(false)
  const [deleteConfirmEnabled, setDeleteConfirmEnabled] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const syncingRef = useRef(false)
  const [masterItems, setMasterItems] = useState<MasterItem[]>(() => {
    return offlineCache.loadMasterItems<MasterItem[]>() ?? []
  })

  const loadMasterItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('sl_master_items')
      .select('*')
      .order('category')
      .order('name')
    if (error) {
      // Network error → keep cached master items
      console.error('loadMasterItems error (offline?):', error.message)
      return
    }
    if (data) {
      setMasterItems(data)
      offlineCache.saveMasterItems(data)
    }
  }, [])

  useEffect(() => {
    if (user) loadMasterItems()
  }, [user, loadMasterItems])

  useEffect(() => {
    setDeleteConfirmEnabled(loadDeleteConfirmSetting())
  }, [])

  useEffect(() => {
    if (user && activeTab === 'today') {
      loadMasterItems()
    }
  }, [user, activeTab, loadMasterItems])

  /** Flush pending offline operations to Supabase */
  const flushPendingOps = useCallback(async () => {
    const ops = offlineCache.loadPendingOps()
    if (ops.length === 0 || syncingRef.current) return
    syncingRef.current = true
    setIsSyncing(true)
    let synced = 0

    for (const op of ops) {
      try {
        if (op.type === 'insert_list_item') {
          const { error } = await supabase.from('sl_list_items').insert(op.payload)
          if (!error) {
            offlineCache.removePendingOp(op.id)
            // Remove temp item from cache
            const cached = offlineCache.loadTodayItems<{ id: string }[]>() ?? []
            offlineCache.saveTodayItems(cached.filter(i => i.id !== op.id))
            synced++
          } else {
            console.error('Sync failed for op:', op.id, error.message)
          }
        } else if (op.type === 'toggle_item') {
          const { error } = await supabase.from('sl_list_items')
            .update({ is_checked: op.payload.is_checked })
            .eq('id', op.payload.item_id)
          if (!error) offlineCache.removePendingOp(op.id)
        } else if (op.type === 'delete_item') {
          const { error } = await supabase.from('sl_list_items')
            .delete().eq('id', op.payload.item_id)
          if (!error) offlineCache.removePendingOp(op.id)
        }
      } catch {
        console.error('Sync exception for op:', op.id)
      }
    }
    syncingRef.current = false
    setIsSyncing(false)
    // Refresh data from server after sync
    if (synced > 0) loadMasterItems()
  }, [loadMasterItems])

  // Offline detection + auto-sync
  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => {
      setIsOffline(false)
      // Re-sync data & flush pending ops when back online
      if (user) {
        loadMasterItems()
        flushPendingOps()
      }
    }
    setIsOffline(!navigator.onLine)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [user, loadMasterItems, flushPendingOps])

  // Try to sync pending ops on mount (in case app was closed offline)
  useEffect(() => {
    if (user && navigator.onLine) flushPendingOps()
  }, [user, flushPendingOps])

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

  // Not logged in
  if (!user) {
    return <AuthScreen onSignIn={signIn} onSignUp={signUp} onResetPassword={resetPassword} />
  }

  return (
    <div className="flex flex-col bg-rose-50" style={{ height: '100dvh' }}>
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-semibold text-center py-1.5 px-4 flex items-center justify-center gap-1.5 shrink-0">
          <WifiOff size={12} />
          Offline — you can still check off &amp; add items
        </div>
      )}
      {/* Syncing banner */}
      {isSyncing && !isOffline && (
        <div className="bg-blue-500 text-white text-xs font-semibold text-center py-1.5 px-4 flex items-center justify-center gap-1.5 shrink-0">
          <RefreshCw size={12} className="animate-spin" />
          Syncing offline changes...
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg flex items-center justify-center">
            <ShoppingCart size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-rose-800">{displayName}&apos;s List</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-rose-100"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-rose-100"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col relative overflow-hidden pb-16">
        {activeTab === 'today' && (
          <TodayScreen masterItems={masterItems} userId={user.id} deleteConfirmEnabled={deleteConfirmEnabled} onMasterItemDeleted={loadMasterItems} />
        )}
        {activeTab === 'master' && (
          <MasterScreen onMasterItemsChange={setMasterItems} userId={user.id} deleteConfirmEnabled={deleteConfirmEnabled} />
        )}
        {activeTab === 'templates' && (
          <TemplatesScreen onUseTemplate={() => setActiveTab('today')} userId={user.id} />
        )}
      </main>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {showSettings && (
        <div className="fixed inset-0 z-[90] flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-3xl p-5 pb-8 mb-16 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-rose-800">Settings</p>
              <button onClick={() => setShowSettings(false)} className="text-rose-400">
                <X size={18} />
              </button>
            </div>
            <label className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-rose-50 border border-rose-100">
              <div>
                <p className="text-sm font-semibold text-rose-700">削除前の確認を表示</p>
                <p className="text-xs text-rose-400">オフにすると削除はすぐ実行されます</p>
              </div>
              <input
                type="checkbox"
                checked={deleteConfirmEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked
                  setDeleteConfirmEnabled(enabled)
                  saveDeleteConfirmSetting(enabled)
                }}
                className="w-5 h-5 accent-rose-500"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
