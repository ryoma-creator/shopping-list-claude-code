export type ScanLanguage = 'en' | 'ja' | 'it' | 'es' | 'fr' | 'ko'

const KEY_PREFIX = 'scan_language_'

function mapLocaleToScanLanguage(locale: string): ScanLanguage {
  const l = locale.toLowerCase()
  if (l.startsWith('ja')) return 'ja'
  if (l.startsWith('it')) return 'it'
  if (l.startsWith('es')) return 'es'
  if (l.startsWith('fr')) return 'fr'
  if (l.startsWith('ko')) return 'ko'
  return 'en'
}

export function getInitialScanLanguage(userId: string): ScanLanguage {
  if (typeof window === 'undefined') return 'en'
  try {
    const saved = localStorage.getItem(`${KEY_PREFIX}${userId}`) as ScanLanguage | null
    if (saved) return saved
  } catch { /* ignore */ }
  return mapLocaleToScanLanguage(navigator.language || 'en')
}

export function saveScanLanguage(userId: string, language: ScanLanguage): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(`${KEY_PREFIX}${userId}`, language) } catch { /* ignore */ }
}
