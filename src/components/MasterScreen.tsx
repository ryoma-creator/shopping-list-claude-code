'use client'
// マスターリスト画面
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { CategoryBadge } from '@/components/CategoryBadge'
import { MasterItemModal } from '@/components/MasterItemModal'
import { EmptyState } from '@/components/EmptyState'
import type { Category, MasterItem } from '@/types/database'

interface Props {
  onMasterItemsChange: (items: MasterItem[]) => void
}

export function MasterScreen({ onMasterItemsChange }: Props) {
  const [items, setItems] = useState<MasterItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<MasterItem | undefined>()

  // マスターアイテム一覧を取得
  const loadItems = useCallback(async () => {
    const { data } = await supabase
      .from('sl_master_items')
      .select('*')
      .order('category')
      .order('name')
    if (data) {
      setItems(data)
      onMasterItemsChange(data)
    }
  }, [onMasterItemsChange])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const openAdd = () => {
    setEditItem(undefined)
    setModalOpen(true)
  }

  const openEdit = (item: MasterItem) => {
    setEditItem(item)
    setModalOpen(true)
  }

  // カテゴリでグループ化
  const grouped = items.reduce<Record<string, MasterItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* ヘッダー */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-rose-800">📋 マスターリスト</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors"
        >
          <Plus size={16} />
          追加
        </button>
      </div>

      {/* アイテム一覧 */}
      <div className="px-4 space-y-5">
        {items.length === 0 && (
          <EmptyState
            icon={<Plus size={40} />}
            title="まだ登録されていません"
            subtitle="よく買う商品を登録しておくと、買い物リストに簡単に追加できます"
          />
        )}

        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <CategoryBadge category={cat as Category} className="mb-2" />
            <div className="space-y-1.5">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-white rounded-2xl border border-rose-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-rose-900">{item.name}</p>
                    <p className="text-xs text-rose-400">
                      ¥{item.default_price.toLocaleString()} × {item.default_qty}個
                    </p>
                  </div>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 text-rose-300 hover:text-rose-500 transition-colors"
                    aria-label="編集"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <MasterItemModal
        item={editItem}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={loadItems}
      />
    </div>
  )
}
