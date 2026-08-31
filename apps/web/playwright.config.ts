import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  // Generous relative to a typical app — sign-in and document creation each
  // round-trip through Postgres and/or Liveblocks, which can be slow on a
  // cold serverless DB connection.
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  // Only spin up (and wait on) a dev server when we're not pointed at an
  // already-running one (e.g. `E2E_BASE_URL` set in CI against a deployed
  // preview) — same override pattern as the health check's own env vars.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
