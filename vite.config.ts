import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "./",
    plugins: [react()],
    build: {
      target: "esnext",
    },
    server: {
      host: "0.0.0.0",
      port: 4173,
      proxy: {
        "/reverb": {
          target: `${env.VITE_REVERB_SCHEME}://${env.VITE_REVERB_HOST}:${env.VITE_REVERB_PORT}`,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});