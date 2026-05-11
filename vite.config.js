import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.API_TARGET || "http://127.0.0.1:8770";

export default defineConfig({
  plugins: [react()],
  root: "frontend",
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    port: 5174,
    strictPort: false,
    proxy: {
      "/api": apiTarget,
      "/audio": apiTarget
    }
  }
});
