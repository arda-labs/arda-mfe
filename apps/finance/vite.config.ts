import path from "path"
import { federation } from "@module-federation/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { remoteSharedDeps, remotePorts } from "../../federation.shared"

const name = "finance"
const port = remotePorts[name]

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : `/mfes/${name}/`,
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name,
      filename: "remoteEntry.js",
      dts: false,
      shareStrategy: "loaded-first",
      exposes: { "./Routes": "./src/Routes.tsx" },
      shared: { ...remoteSharedDeps },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port,
    // strictPort: port cố định match shell entry — lệch port = shell
    // timeout/rettry → cảm giác "load lần đầu rất lâu".
    strictPort: true,
    cors: true,
    origin: `http://localhost:${port}`,
    host: "0.0.0.0",
  },
}))