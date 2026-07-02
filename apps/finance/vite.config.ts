import path from "path"
import { federation } from "@module-federation/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

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
}

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/mfes/finance/",
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "finance",
      filename: "remoteEntry.js",
      dts: false,
      shareStrategy: "loaded-first",
      exposes: {
        "./Routes": "./src/Routes.tsx",
      },
      shared: sharedDependencies,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    cors: true,
    origin: "http://localhost:5103",
  },
}))
