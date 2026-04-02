/** Simple localStorage cache + offline queue for offline access */

const KEYS = {
  todayList: 'sl_cache_todayList',
  todayItems: 'sl_cache_todayItems',
  masterItems: 'sl_cache_masterItems',
  pendingOps: 'sl_pending_ops',
} as const

function save(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* storage full — ignore */ }
}

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}

// ── Pending operations queue ────────────────────────────────
export interface PendingInsertListItem {
  id: string
  type: 'insert_list_item'
  payload: {
    list_id: string
    master_item_id: string | null
    name: string
    price: number
    qty: number
    is_checked: boolean
    sort_order: number
  }
  createdAt: number
}

export interface PendingToggleItem {
  id: string
  type: 'toggle_item'
  payload: { item_id: string; is_checked: boolean }
  createdAt: number
}

export interface PendingDeleteItem {
  id: string
  type: 'delete_item'
  payload: { item_id: string }
  createdAt: number
}

export type PendingOp = PendingInsertListItem | PendingToggleItem | PendingDeleteItem

function loadPendingOps(): PendingOp[] {
  return load<PendingOp[]>(KEYS.pendingOps) ?? []
}

function savePendingOps(ops: PendingOp[]) {
  save(KEYS.pendingOps, ops)
}

function addPendingOp(op: PendingOp) {
  const ops = loadPendingOps()
  ops.push(op)
  savePendingOps(ops)
}

function removePendingOp(opId: string) {
  const ops = loadPendingOps().filter(o => o.id !== opId)
  savePendingOps(ops)
}

// ─────────────────────────────────────────────────────────────

export const offlineCache = {
  saveTodayList: (list: unknown) => save(KEYS.todayList, list),
  loadTodayList: <T>() => load<T>(KEYS.todayList),

  saveTodayItems: (items: unknown) => save(KEYS.todayItems, items),
  loadTodayItems: <T>() => load<T>(KEYS.todayItems),

  saveMasterItems: (items: unknown) => save(KEYS.masterItems, items),
  loadMasterItems: <T>() => load<T>(KEYS.masterItems),

  // Pending ops queue
  addPendingOp,
  removePendingOp,
  loadPendingOps,
  clearPendingOps: () => savePendingOps([]),
  hasPendingOps: () => loadPendingOps().length > 0,

  /** Clear all cached data (call on sign-out / user switch) */
  clear: () => {
    try {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
    } catch { /* ignore */ }
  },
}
