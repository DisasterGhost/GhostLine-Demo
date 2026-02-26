import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

// Write version.json on every build so the update-checker can detect new deploys
const versionPlugin = () => ({
  name: 'version-stamp',
  buildStart() {
    writeFileSync('public/version.json', JSON.stringify({ v: Date.now() }))
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
  base: '/GhostLine-Demo/',
})
