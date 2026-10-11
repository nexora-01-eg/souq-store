import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Tailwind's Lightning CSS pass rewrites `backdrop-filter` to the
 * `-webkit-` alias only, which modern Chromium no longer recognizes —
 * killing every frosted-glass effect. Re-emit the standard property
 * in dev (transform) and on the final bundle (generateBundle).
 */
function standardizeBackdropFilter(): Plugin {
  const rewrite = (css: string) => css.replace(/-webkit-backdrop-filter:/g, 'backdrop-filter:')
  return {
    name: 'standardize-backdrop-filter',
    transform(code, id) {
      if (id.endsWith('.css')) return rewrite(code)
      return null
    },
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName.endsWith('.css') && typeof file.source === 'string') {
          file.source = rewrite(file.source)
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), standardizeBackdropFilter()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
  },
})
