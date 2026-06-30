import path from "path"
import { federation } from "@module-federation/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "shell",
      dts: false,
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
      },
      shared: ["react", "react-dom"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
