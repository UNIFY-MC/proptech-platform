import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy para o "App Shell" — quando o iframe pede /embed/<slug>/<path>,
// Vite encaminha para o dev server da app correspondente.
// Source-of-truth: system.apps.dev_url no Supabase (BD-driven).
// Mantemos hardcoded aqui só porque vite.config.js corre em build-time/cold-start
// e não pode fazer await Supabase fetch. Em mudança de port, actualizar aqui +
// UPDATE system.apps SET dev_url = ... WHERE slug = ...

// Naming convention: porta = 51XX onde XX = número da vertical (v2 → 5172, v3 → 5173, etc.)
const EMBED_TARGETS = {
  v2: 'http://localhost:5172',
  v3: 'http://localhost:5173',
  v4: 'http://localhost:5174',
  v5: 'http://localhost:5175',
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: Object.fromEntries(
      Object.entries(EMBED_TARGETS).map(([slug, target]) => ([
        `/embed/${slug}`,
        {
          target,
          changeOrigin: true,
          ws: true,                                  // HMR WebSocket
          rewrite: (p) => p.replace(new RegExp(`^/embed/${slug}`), ''),
        },
      ]))
    ),
  },
})
