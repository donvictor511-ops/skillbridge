import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // OAuth providers return to the website origin, which forwards the
      // callback into the local API just like Vercel does in production.
      "/api/v1": "http://localhost:4000",
    },
  },
});
