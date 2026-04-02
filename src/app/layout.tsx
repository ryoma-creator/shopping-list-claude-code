import type { Metadata, Viewport } from 'next'
import './globals.css'

// PWAメタデータ
export const metadata: Metadata = {
  title: 'お買い物リスト',
  description: '2人で共有できる可愛い買い物リスト',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'お買い物リスト',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#fb7185',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
