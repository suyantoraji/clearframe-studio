import { afterEach, describe, expect, it, vi } from "vitest";

import {
  detectEncoderSupport,
  formatExtension,
  formatLabel,
} from "@/lib/render/encoder";

describe("formatLabel / formatExtension", () => {
  it("labels the MP4 container", () => {
    expect(formatLabel("mp4")).toBe("MP4");
    expect(formatExtension("mp4")).toBe("mp4");
  });

  it("labels the WebM container", () => {
    expect(formatLabel("webm")).toBe("WebM");
    expect(formatExtension("webm")).toBe("webm");
  });
});

describe("detectEncoderSupport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers MP4 when the browser can encode it", () => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (type: string) => type.startsWith("video/mp4"),
    });
    const support = detectEncoderSupport();
    expect(support.format).toBe("mp4");
    expect(support.audio).toBe(true);
  });

  it("falls back to WebM when MP4 is unavailable", () => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (type: string) => type.startsWith("video/webm"),
    });
    const support = detectEncoderSupport();
    expect(support.format).toBe("webm");
    expect(support.audio).toBe(true);
  });

  it("reports a silent WebM fallback when nothing is supported", () => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: () => false,
    });
    const support = detectEncoderSupport();
    expect(support.format).toBe("webm");
    expect(support.audio).toBe(false);
  });

  it("reports a silent WebM fallback when MediaRecorder is absent", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    const support = detectEncoderSupport();
    expect(support.format).toBe("webm");
    expect(support.audio).toBe(false);
  });
});
