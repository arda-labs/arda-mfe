import path from "path"
import { federation } from "@module-federation/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import {
  remoteSharedDeps,
  remotePorts,
  shellOptimizeInclude,
} from "../../federation.shared"

// All /api/* paths route through the auth-gateway BFF, which handles
// authentication forwarding and service routing internally.
const BFF_GATEWAY = "http://localhost:8082"

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const dev = command === "serve"
  const entry = (name: string) =>
    dev
      ? `http://localhost:${remotePorts[name as keyof typeof remotePorts]}/remoteEntry.js`
      : `/mfes/${name}/remoteEntry.js`
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
          ai: remote("ai", "AI_REMOTE_ENTRY"),
          loan: remote("loan", "LOAN_REMOTE_ENTRY"),
          mdm: remote("mdm", "MDM_REMOTE_ENTRY"),
          deposit: remote("deposit", "DEPOSIT_REMOTE_ENTRY"),
          capital: remote("capital", "CAPITAL_REMOTE_ENTRY"),
          statistical: remote("statistical", "STATISTICAL_REMOTE_ENTRY"),
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
        "/api/auth": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/kratos": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/iam": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/admin": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/platform": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/identity": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/finance": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/media": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/workflow": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/crm": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/hrm": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/notifications": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/ai": { target: BFF_GATEWAY, changeOrigin: true },
        "/api/rag": { target: BFF_GATEWAY, changeOrigin: true },
      },
    },
  }
})
