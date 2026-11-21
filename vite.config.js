import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    strictPort: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        controller: resolve(process.cwd(), "client-play/index.html")
      }
    }
  },
  preview: {
    host: "0.0.0.0",
    strictPort: true,
    port: 4173
  }
});
