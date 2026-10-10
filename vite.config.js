import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import regionHeads from './scripts/vite-plugin-region-heads.mjs'

export default defineConfig({
  plugins: [react(), regionHeads()],
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vite's preload helper must not land in vendor-pdf, or every page
          // (incl. the landing) preloads the 136 KB-gzip PDF library.
          if (id.includes('vite/preload-helper'))         return 'vendor-react'
          if (id.includes('node_modules/exceljs'))        return 'vendor-excel'
          if (id.includes('node_modules/jspdf'))          return 'vendor-pdf'
          if (id.includes('node_modules/html2canvas'))    return 'vendor-html2canvas'
          if (id.includes('node_modules/@supabase'))      return 'vendor-supabase'
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/'))         return 'vendor-react'
          if (id.includes('node_modules/@marsidev') ||
              id.includes('node_modules/@hcaptcha'))      return 'vendor-captcha'
        },
      },
    },
  },
})
