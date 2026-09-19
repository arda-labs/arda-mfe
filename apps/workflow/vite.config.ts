import path from "path"
import { federation } from "@module-federation/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { remoteSharedDeps, remotePorts } from "../../federation.shared"
import { federationBuild, federationRemote } from "../../federation.shared"

const name = "workflow"
const port = remotePorts[name]

export default defineConfig(({ command }) => ({
  build: federationBuild,
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
      // Form host (P1.6): the workbench renders task forms owned by the domain
      // remotes (server `formKey` → `./taskForms`). Only remotes that already
      // registered forms are declared here; add the owner when a form lands.
      remotes: {
        deposit: federationRemote("deposit", "DEPOSIT_REMOTE_ENTRY", command === "serve"),
        capital: federationRemote("capital", "CAPITAL_REMOTE_ENTRY", command === "serve"),
        loan: federationRemote("loan", "LOAN_REMOTE_ENTRY", command === "serve"),
        statistical: federationRemote("statistical", "STATISTICAL_REMOTE_ENTRY", command === "serve"),
        hrm: federationRemote("hrm", "HRM_REMOTE_ENTRY", command === "serve"),
        finance: federationRemote("finance", "FINANCE_REMOTE_ENTRY", command === "serve"),
      },
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
    proxy: {
      "/api/workflow": { target: "http://localhost:8082", changeOrigin: true },
      "/api/crm": { target: "http://localhost:8094", changeOrigin: true },
      "/api/finance": { target: "http://localhost:8082", changeOrigin: true },
      "/api/hrm": { target: "http://localhost:8082", changeOrigin: true },
      "/api/auth": { target: "http://localhost:8082", changeOrigin: true },
      "/api/admin": { target: "http://localhost:8082", changeOrigin: true },
    },
  },
}))
