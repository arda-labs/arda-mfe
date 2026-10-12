import path from "path"
import { federation } from "@module-federation/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { remoteNames } from "../../federation.routes"
import {
  shellSharedDeps,
  shellOptimizeInclude,
  federationBuild,
  federationRemotes,
} from "../../federation.shared"

// All /api/* paths route through the auth-gateway BFF, which handles
// authentication forwarding and service routing internally.
const BFF_GATEWAY = "http://localhost:8082"

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const dev = command === "serve"

  return {
    build: federationBuild,
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: "shell",
        dts: false,
        shareStrategy: "loaded-first",
        // One remote per registry entry; <NAME>_REMOTE_ENTRY overrides a URL.
        remotes: federationRemotes(remoteNames, dev),
        shared: { ...shellSharedDeps },
      }),
    ],
    resolve: {
      alias: [
        { find: /^@\//, replacement: `${path.resolve(__dirname, "./src")}/` },
      ],
    },
    // Pre-bundle vendor lớn 1 lần ở boot — giảm độ trễ first navigation
    // tới một remote/page (triệu chứng "load lần đầu rất lâu").
    optimizeDeps: {
      include: shellOptimizeInclude,
    },
    preview: {
      allowedHosts: ["arda.io.vn", "www.arda.io.vn", "localhost"],
    },
    server: {
      // Every /api/ prefix goes to the BFF, as in production; listing them one
      // by one had already drifted (loan, deposit, capital, statistical and mdm
      // were missing).
      proxy: {
        "/api/": { target: BFF_GATEWAY, changeOrigin: true },
      },
    },
  }
})
