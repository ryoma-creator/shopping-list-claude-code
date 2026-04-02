import type { MetadataRoute } from 'next'

// PWAマニフェスト
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'お買い物リスト',
    short_name: 'Shopping',
    description: '2人で共有できる買い物リスト',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff1f2',
    theme_color: '#fb7185',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
