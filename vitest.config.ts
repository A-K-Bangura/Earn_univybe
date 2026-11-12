import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Kept separate from vite.config.ts (which also configures vite-plugin-pwa,
// unnecessary and occasionally noisy for unit-test collection).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    passWithNoTests: true,
  },
});
