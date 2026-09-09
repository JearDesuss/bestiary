import { defineConfig } from "vite";
export default defineConfig({
  server: { host: "127.0.0.1", port: 8790, strictPort: true },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/node_modules/three/") &&
            !id.includes("/exporters/") &&
            !id.includes("/loaders/GLTFLoader")
          )
            return "three";
        },
      },
    },
  },
});
