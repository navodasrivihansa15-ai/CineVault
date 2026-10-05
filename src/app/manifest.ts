import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CineVault Premium',
    short_name: 'CineVault',
    description: 'Premium Movie and TV Show Streaming',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0C10',
    theme_color: '#0B0C10',
    icons: [
      {
        src: '/launchericon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/launchericon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
  }
}
