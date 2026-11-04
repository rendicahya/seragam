import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages menyajikan proyek ini di https://rendicahya.github.io/seragam/
  base: '/seragam/',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Pakai seragam apa hari ini?',
        short_name: 'Seragam',
        description: 'Cek seragam dinas FILKOM UB hari ini dan hari kerja berikutnya, juga saat offline.',
        lang: 'id',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#2b4acb',
        background_color: '#f6f4ef',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,svg,png}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
