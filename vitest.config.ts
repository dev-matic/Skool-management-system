import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Makes TEST_DATABASE_* from .env.local available to integration tests.
// Variables already set (e.g. in CI) take precedence.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig(() => {
  return {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        // `server-only` throws outside Next.js server bundles; tests run server code directly.
        "server-only": fileURLToPath(new URL("./tests/support/empty-module.ts", import.meta.url)),
      },
    },
    test: {
      projects: [
        {
          extends: true,
          test: { name: "unit", include: ["src/**/*.test.ts"], environment: "node" },
        },
        {
          extends: true,
          test: {
            name: "integration",
            include: ["tests/integration/**/*.test.ts"],
            environment: "node",
            globalSetup: ["tests/integration/global-setup.ts"],
            setupFiles: ["tests/integration/setup.ts"],
            fileParallelism: false,
            testTimeout: 20_000,
          },
        },
      ],
    },
  };
});
