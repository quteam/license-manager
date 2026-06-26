import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    proxy: {
      "/api": "http://localhost:8787"
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
