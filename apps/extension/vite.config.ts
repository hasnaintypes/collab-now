import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Minimal MV3 build: popup + options pages, plus a background service worker
// and a content script, each emitted as a flat file at the dist root so
// manifest.json (copied verbatim from public/) can reference them directly.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        options: resolve(__dirname, "options.html"),
        background: resolve(__dirname, "src/background.ts"),
        "content-script": resolve(__dirname, "src/content-script.ts"),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "background" || chunk.name === "content-script"
            ? "[name].js"
            : "assets/[name]-[hash].js",
      },
    },
  },
});
