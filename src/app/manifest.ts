import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Shopping List',
    short_name: 'Shopping',
    description: 'Your smart grocery companion',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff1f2',
    theme_color: '#fb7185',
    icons: [
      {
        src: '/pwa-icon-192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-icon-512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
