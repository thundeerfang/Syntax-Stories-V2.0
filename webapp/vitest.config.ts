import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@contracts": path.resolve(__dirname, "src/contracts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", ".next", ".next-desktop", "coverage"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/**/__tests__/**"],
      thresholds:
        process.env.ENFORCE_COVERAGE === "1"
          ? {
              branches: 80,
              functions: 80,
              lines: 80,
              statements: 80,
            }
          : undefined,
    },
  },
});
