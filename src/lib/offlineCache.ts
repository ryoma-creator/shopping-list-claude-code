/** Simple localStorage cache for offline access */

const KEYS = {
  todayList: 'sl_cache_todayList',
  todayItems: 'sl_cache_todayItems',
  masterItems: 'sl_cache_masterItems',
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

export const offlineCache = {
  saveTodayList: (list: unknown) => save(KEYS.todayList, list),
  loadTodayList: <T>() => load<T>(KEYS.todayList),

  saveTodayItems: (items: unknown) => save(KEYS.todayItems, items),
  loadTodayItems: <T>() => load<T>(KEYS.todayItems),

  saveMasterItems: (items: unknown) => save(KEYS.masterItems, items),
  loadMasterItems: <T>() => load<T>(KEYS.masterItems),
}
