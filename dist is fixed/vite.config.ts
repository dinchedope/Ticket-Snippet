import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";

export default defineConfig({
  plugins: [vue(), crx({ manifest })],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      input: {
        index: "index.html",
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
