import path from "path"
import { federation } from "@module-federation/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const backend = {
  authGateway: "http://localhost:8082",
  finance: "http://localhost:8090",
  media: "http://localhost:8092",
  workflow: "http://localhost:8093",
  crm: "http://localhost:8094",
  notification: "http://localhost:8095",
  hrm: "http://localhost:8097",
}

const sharedDependencies = {
  react: { singleton: true },
  "react-dom": { singleton: true },
  "react-dom/client": { singleton: true },
  "react/jsx-runtime": { singleton: true },
  "react/jsx-dev-runtime": { singleton: true },
  "@tanstack/react-query": { singleton: true },
  nuqs: { singleton: true },
  "nuqs/adapters/react": { singleton: true },
  "@workspace/i18n": { singleton: true },
  "@workspace/i18n/": { singleton: true },
  "@workspace/theme": { singleton: true },
  "@workspace/auth": { singleton: true },
  "@workspace/auth/store": { singleton: true },
  "@workspace/auth/step-up-channel": { singleton: true },
  "@workspace/notifications": { singleton: true },
  "@workspace/notifications/": { singleton: true },
  "react-toastify": { singleton: true },
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "shell",
      dts: false,
      shareStrategy: "loaded-first",
      remotes: {
        iam: {
          type: "module",
          name: "iam",
          entry:
            process.env.IAM_REMOTE_ENTRY ??
            (command === "serve"
              ? "http://localhost:5101/remoteEntry.js"
              : "/mfes/iam/remoteEntry.js"),
          shareScope: "default",
        },
        platform: {
          type: "module",
          name: "platform",
          entry:
            process.env.PLATFORM_REMOTE_ENTRY ??
            (command === "serve"
              ? "http://localhost:5102/remoteEntry.js"
              : "/mfes/platform/remoteEntry.js"),
          shareScope: "default",
        },
        finance: {
          type: "module",
          name: "finance",
          entry:
            process.env.FINANCE_REMOTE_ENTRY ??
            (command === "serve"
              ? "http://localhost:5103/remoteEntry.js"
              : "/mfes/finance/remoteEntry.js"),
          shareScope: "default",
        },
        hrm: {
          type: "module",
          name: "hrm",
          entry:
            process.env.HRM_REMOTE_ENTRY ??
            (command === "serve"
              ? "http://localhost:5105/remoteEntry.js"
              : "/mfes/hrm/remoteEntry.js"),
          shareScope: "default",
        },
        account: {
          type: "module",
          name: "account",
          entry:
            process.env.ACCOUNT_REMOTE_ENTRY ??
            (command === "serve"
              ? "http://localhost:5104/remoteEntry.js"
              : "/mfes/account/remoteEntry.js"),
          shareScope: "default",
        },
        crm: {
          type: "module",
          name: "crm",
          entry:
            process.env.CRM_REMOTE_ENTRY ??
            (command === "serve"
              ? "http://localhost:5107/remoteEntry.js"
              : "/mfes/crm/remoteEntry.js"),
          shareScope: "default",
        },
        workflow: {
          type: "module",
          name: "workflow",
          entry:
            process.env.WORKFLOW_REMOTE_ENTRY ??
            (command === "serve"
              ? "http://localhost:5106/remoteEntry.js"
              : "/mfes/workflow/remoteEntry.js"),
          shareScope: "default",
        },
      },
      shared: sharedDependencies,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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
}))
