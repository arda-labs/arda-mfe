import path from "path"
import { federation } from "@module-federation/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/mfes/platform/",
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "platform",
      filename: "remoteEntry.js",
      dts: false,
      exposes: {
        "./Routes": "./src/Routes.tsx",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    cors: true,
    origin: "http://localhost:5102",
  },
}))
