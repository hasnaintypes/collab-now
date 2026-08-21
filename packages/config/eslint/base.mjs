import { defineConfig, globalIgnores } from "eslint/config";

/**
 * Shared base ESLint config for all CollabNow apps/packages.
 */
export const baseConfig = defineConfig([
  globalIgnores([
    "**/.next/**",
    "**/dist/**",
    "**/build/**",
    "**/out/**",
    "**/node_modules/**",
    "**/.turbo/**",
    "next-env.d.ts",
  ]),
]);

export default baseConfig;
