import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
// defineConfig de 'vitest/config' amplía la de Vite con el bloque `test`
export default defineConfig({
  plugins: [
    react(),
    // PWA instalable: manifest + service worker generado por Workbox
    VitePWA({
      strategies: 'generateSW',
      // El SW nuevo se activa solo y recarga la app, sin preguntar al usuario
      registerType: 'autoUpdate',
      // Inyecta el script de registro en index.html (no hace falta tocar main.tsx)
      injectRegister: 'auto',
      // Los iconos ya entran por workbox.globPatterns; así no se duplican en el precache
      includeManifestIcons: false,
      manifest: {
        name: 'NutriPapa',
        short_name: 'NutriPapa',
        description:
          'Apunta de forma rápida y sencilla lo que comes cada semana y compártelo con tu nutricionista.',
        lang: 'es',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        background_color: '#F5EFE6',
        theme_color: '#9CAF88',
        // Iconos provisionales: se regeneran con `pnpm icons`
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precachea todo lo que sale de la build para funcionar sin conexión
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    // Entorno de navegador simulado para testear componentes
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
