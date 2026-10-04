import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
      zustand: path.resolve(__dirname, "node_modules/zustand"),
      zod: path.resolve(__dirname, "node_modules/zod"),
    },
    mainFields: ["module", "main"],
    conditions: ["import", "module", "browser", "default"],
  },
  server: {
    port: 5173,
    fs: { allow: [".."] },
  },
});
