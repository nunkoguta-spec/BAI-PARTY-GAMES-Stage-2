import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    strictPort: true,
    proxy: {
      "/socket.io": { target: "http://127.0.0.1:3001", ws: true },
      "/health": "http://127.0.0.1:3001"
    }
  },
  preview: {
    host: "0.0.0.0",
    strictPort: true,
    port: 4173
  }
});
