import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/accounts": {
        target: "http://127.0.0.1:8000",
        changeOrigin: false,
      },
      "/courses": {
        target: "http://127.0.0.1:8000",
        changeOrigin: false,
      },
      "/admin": {
        target: "http://127.0.0.1:8000",
        changeOrigin: false,
      },
      "/static": {
        target: "http://127.0.0.1:8000",
        changeOrigin: false,
      },
    },
  },
});
