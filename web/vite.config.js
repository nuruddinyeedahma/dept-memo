import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'บันทึกหนี้ร้านค้า',
        short_name: 'บันทึกหนี้',
        description: 'สมุดบัญชีหนี้ร้านค้า ทำงานออฟไลน์ในเครื่อง',
        theme_color: '#1F1A14',
        background_color: '#F7F2E7',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,png,svg}'],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
