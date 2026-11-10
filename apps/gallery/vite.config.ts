import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      "hunter-charts": fileURLToPath(new URL("../../packages/charts/src/index.ts", import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true },
})
