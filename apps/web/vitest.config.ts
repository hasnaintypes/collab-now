import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Playwright owns `e2e/` — keep the two runners from ever picking up
    // each other's spec files.
    exclude: ["e2e/**", "node_modules/**"],
  },
});
