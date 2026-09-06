import { defineConfig } from "vitest/config";

// The backend runs on Node, not in a browser, so tests use the "node"
// environment. No React, no DOM, no jsdom needed here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Our API tests start a real Express server on a random port. Running files
    // in parallel would let two of them fight over ports and over the mocked
    // modules, so we run one file at a time. The whole suite still takes seconds.
    fileParallelism: false,
  },
});
