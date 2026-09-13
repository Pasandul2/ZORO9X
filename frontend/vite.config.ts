import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false, // optional: disables error overlay
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    allowedHosts: ['zoro9x.com', 'www.zoro9x.com'],
  },
  resolve: {
    alias: {
      // Optional, but helps if you're using path aliases
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['.git'], // 🔑 Exclude .git from dependency analysis
  },
})
