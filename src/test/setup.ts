// Extends Vitest's `expect` with jest-dom matchers (toBeInTheDocument, etc.)
// Runs before every test file (see vitest.config.ts's `setupFiles`).
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement matchMedia, and GSAP/ScrollTrigger call it at import
// time. Report "no match" for every query, so media-query-driven animation
// never activates under test and components render in their final state.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom doesn't implement scrollIntoView (used by the roadmap journey to jump
// to a stage / the current course).
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}

// `globals` is off in vitest.config.ts, so React Testing Library can't
// register its own auto-cleanup — unmount rendered trees between tests.
afterEach(() => {
  cleanup();
});
