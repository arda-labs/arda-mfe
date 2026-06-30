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
