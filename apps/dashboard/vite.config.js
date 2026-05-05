import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    fs: {
      // Allow reading files from the monorepo root (needed for .claude/employees/bia.md?raw imports)
      allow: [path.resolve(__dirname, '../..')]
    }
  }
})
