import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./public/manifest.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        welcome: path.resolve(__dirname, "welcome.html"),
        popup: path.resolve(__dirname, "src/popup/popup.html"),
      },
      output: {
        entryFileNames: "src/[name]/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
