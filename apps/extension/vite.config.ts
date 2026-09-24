import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Minimal MV3 build: popup + options pages, plus a background service
// worker, each emitted as a flat file at the dist root so manifest.json
// (copied verbatim from public/) can reference them directly.
//
// No content-script build target (P2-6 removed the stub's one, see
// manifest.json) — tab detection only needs the active tab's URL
// (`chrome.tabs.query`, `activeTab` permission), which the popup can read
// directly without injecting anything into the page itself. Injecting a
// script into every page (the stub's `<all_urls>` content script) to get a
// URL the extension already has for free is unnecessary permission surface.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        options: resolve(__dirname, "options.html"),
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "background" ? "[name].js" : "assets/[name]-[hash].js",
      },
    },
  },
});
