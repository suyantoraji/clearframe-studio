import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

/**
 * Vitest configuration for the frontend suite.
 *
 * It reuses the app's own Vite config so the `@` and `declarations` aliases and
 * the React plugin resolve exactly as they do in the app build. The DOM
 * environment is supplied by the `test` script (`--environment jsdom`); the
 * setup module registers jest-dom matchers and clears the DOM between tests.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/__tests__/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      css: false,
      // Pin the worker bounds explicitly. The container can export worker
      // limits that conflict (min > max), which Tinypool rejects before any
      // test runs; a single fork keeps the suite deterministic and cheap.
      pool: "forks",
      poolOptions: {
        forks: {
          minForks: 1,
          maxForks: 1,
        },
      },
    },
  }),
);
