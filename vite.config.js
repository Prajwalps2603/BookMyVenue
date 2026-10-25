import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `vite build --mode static` builds the GitHub Pages demo: served from /BookMyVenue/,
// with an in-browser mock API instead of the Express server (see .env.static)
export default defineConfig(({ mode }) => ({
  base: mode === 'static' ? '/BookMyVenue/' : '/',
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:5000' },
  },
  test: { include: ['server/**/*.test.js', 'src/**/*.test.js'] },
}))
