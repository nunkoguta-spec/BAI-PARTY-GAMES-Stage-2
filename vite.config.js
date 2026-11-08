import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    strictPort: true
  },
  preview: {
    host: "0.0.0.0",
    strictPort: true,
    port: 4173
  }
});
