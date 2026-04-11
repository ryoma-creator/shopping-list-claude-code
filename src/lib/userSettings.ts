const KEY_DELETE_CONFIRM = 'sl_setting_delete_confirm'

export function loadDeleteConfirmSetting(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = localStorage.getItem(KEY_DELETE_CONFIRM)
    if (raw === null) return true
    return raw === '1'
  } catch { return true }
}

export function saveDeleteConfirmSetting(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY_DELETE_CONFIRM, enabled ? '1' : '0') } catch { /* ignore */ }
}
