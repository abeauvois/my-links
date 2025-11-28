import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import tanstackRouter from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'

/**
 * Vite Configuration for Trading Client
 * 
 * This configuration sets up:
 * 
 * 1. Plugins:
 *    - TanStack Router: Provides file-based routing with automatic code splitting
 *    - React: Enables React Fast Refresh and JSX support
 *    - Tailwind CSS: Integrates Tailwind CSS compilation
 * 
 * 2. Path Alias:
 *    - '@': Maps to './src' for cleaner imports (e.g., '@/components/Header')
 * 
 * 3. Development Server Proxy:
 *    - Forwards all '/api/*' requests to http://localhost:3001
 *    - Solves CORS issues during development by proxying backend API calls
 *    - changeOrigin: Modifies Host header to match target
 *    - secure: false - Allows HTTP connections (development only)
 * 
 * 4. Testing:
 *    - Uses jsdom environment for browser-like testing
 *    - Loads setup file for test configuration
 * 
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
