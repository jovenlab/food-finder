import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The setup Next.js documents for Vitest.
//
//   react                 - compiles JSX
//   jsdom                 - a fake browser: document, DOM events, localStorage
//   resolve.tsconfigPaths - makes the "@/..." import alias work in tests
//
// The docs suggest the `vite-tsconfig-paths` plugin for that last point; Vite
// now supports it natively and says so on startup, so we use the built-in.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.tsx", "tests/**/*.test.ts"],
  },
});
