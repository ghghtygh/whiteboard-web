import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // 기술 스택 아이콘(수백 개)은 data URL 로 JS 에 인라인되지 않도록 항상 별도 자산으로 내보낸다.
    assetsInlineLimit: (filePath) => (filePath.includes('/src/assets/stack-icons/') ? false : undefined),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.VITE_WS_URL ?? 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
