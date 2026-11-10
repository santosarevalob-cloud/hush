import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// Production build is served from GitHub Pages at /hush/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/hush/' : '/',
  server: {
    host: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-180.png'],
      manifest: {
        name: 'Songwriting',
        short_name: 'Songwriting',
        description: 'Personal songwriting notebook: lyrics, rhymes, and BPM-locked loops.',
        theme_color: '#05060f',
        background_color: '#05060f',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
}))
