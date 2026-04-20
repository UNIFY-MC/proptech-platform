import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5171,
    strictPort: true,  // falha se a porta estiver ocupada (em vez de saltar para outra)
    host: true,
  },
});