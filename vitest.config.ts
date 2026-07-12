import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// The "@/..." import alias mirrors tsconfig's paths so tests import the same
// modules the app does.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
