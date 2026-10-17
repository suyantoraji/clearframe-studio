import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Generated components carry `data-ocid` markers; treat them as test ids so
// tests can target stable, intent-named hooks rather than CSS classes.
configure({ testIdAttribute: "data-ocid" });

// jsdom does not implement ResizeObserver, which Radix's Slider and Switch
// rely on. A no-op stub is enough for the component behavior under test.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom does not implement matchMedia either; several UI primitives read it.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

// Unmount anything a test rendered so the next one starts from a clean DOM.
afterEach(() => {
  cleanup();
});
