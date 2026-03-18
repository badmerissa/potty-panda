import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Enable SPA fallback so all routes serve index.html in dev
  server: {
    historyApiFallback: true,
  },

  build: {
    rollupOptions: {
      output: {
        // Split vendor code into separate chunks for better caching
        manualChunks(id) {
          if (id.includes('react-router-dom')) return 'router';
          if (id.includes('react-helmet-async')) return 'helmet';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor';
        },
      },
    },
  },
})
