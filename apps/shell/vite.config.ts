import path from "path"
import { federation } from "@module-federation/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { remoteSharedDeps, remotePorts, shellOptimizeInclude } from "../../federation.shared"



const backend = {
  authGateway: "http://localhost:8082",
  finance: "http://localhost:8090",
  media: "http://localhost:8092",
  workflow: "http://localhost:8093",
  crm: "http://localhost:8094",
  notification: "http://localhost:8095",
  hrm: "http://localhost:8097",
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const dev = command === "serve"
  const entry = (name: string) => (dev ? `http://localhost:${remotePorts[name as keyof typeof remotePorts]}/remoteEntry.js` : `/mfes/${name}/remoteEntry.js`)
  const remote = (name: string, envVar: string) => ({
    type: "module",
    name,
    entry: process.env[envVar] ?? entry(name),
    shareScope: "default",
  })

  return {
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: "shell",
        dts: false,
        shareStrategy: "loaded-first",
        remotes: {
          iam: remote("iam", "IAM_REMOTE_ENTRY"),
          platform: remote("platform", "PLATFORM_REMOTE_ENTRY"),
          finance: remote("finance", "FINANCE_REMOTE_ENTRY"),
          hrm: remote("hrm", "HRM_REMOTE_ENTRY"),
          account: remote("account", "ACCOUNT_REMOTE_ENTRY"),
          crm: remote("crm", "CRM_REMOTE_ENTRY"),
          workflow: remote("workflow", "WORKFLOW_REMOTE_ENTRY"),
        },
        shared: { ...remoteSharedDeps },
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
      proxy: {
        "/api/auth": { target: backend.authGateway, changeOrigin: true },
        "/api/kratos": { target: backend.authGateway, changeOrigin: true },
        "/api/iam": { target: backend.authGateway, changeOrigin: true },
        "/api/admin": { target: backend.authGateway, changeOrigin: true },
        "/api/platform": { target: backend.authGateway, changeOrigin: true },
        "/api/identity": { target: backend.authGateway, changeOrigin: true },
        "/api/finance": { target: backend.authGateway, changeOrigin: true },
        "/api/media": { target: backend.authGateway, changeOrigin: true },
        "/api/workflow": { target: backend.authGateway, changeOrigin: true },
        "/api/crm": { target: backend.authGateway, changeOrigin: true },
        "/api/hrm": { target: backend.authGateway, changeOrigin: true },
        "/api/notifications": { target: backend.authGateway, changeOrigin: true },
      },
    },
  }
})
