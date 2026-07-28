/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/setupTests.ts",
        "**/*.d.ts",
        "**/*.stories.tsx",
        "**/index.ts",
      ],
      // Baseline medido em 28/07/2026 (statements 61.1 / branches 56.05 /
      // functions 53.88 / lines 65.51). Gate = baseline com folga mínima;
      // regra do time: só subir, nunca baixar (ratchet).
      thresholds: {
        lines: 65,
        functions: 53,
        branches: 55,
        statements: 60,
      },

    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
