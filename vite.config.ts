import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Set to '/<repo-name>/' when deploying to https://<user>.github.io/<repo-name>/
// Leave as '/' if this repo is deployed as a user/org page (https://<user>.github.io/).
const base = process.env.VITE_BASE_PATH || '/ai-rag-chat/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
