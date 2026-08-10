import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const dirname = import.meta.dirname

// NOTE base path: repo's manifest.json/sw.js reference a stale "/almonner2/" path
// left over from a renamed repo (icons referenced there don't even exist in the
// repo). Actual production URL needs confirming before this ships — until then
// we default to root ('/') and allow override via VITE_BASE_PATH so it's a
// one-line change, not a re-architecture.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: resolve(dirname, 'index.html'),
        admin: resolve(dirname, 'admin.html'),
        landing: resolve(dirname, 'landing.html'),
      },
    },
  },
})
