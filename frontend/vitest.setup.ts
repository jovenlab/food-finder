// Runs before every test file.
//
// jest-dom adds readable assertions about the DOM, so a test can say
// `expect(button).toBeDisabled()` instead of inspecting attributes by hand.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount anything a test rendered. Without this, components pile up in the
// fake document and the next test finds two copies of everything.
afterEach(() => {
  cleanup();
  // The language provider persists the chosen language, and that store lives
  // outside React - so it survives between tests unless cleared.
  window.localStorage.clear();
});
