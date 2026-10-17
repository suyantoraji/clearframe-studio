import { afterEach, describe, expect, it, vi } from "vitest";

import {
  deleteStoredFile,
  isImageFilename,
  isVideoFilename,
} from "@/lib/storage";

describe("isVideoFilename", () => {
  it("accepts the supported video containers", () => {
    expect(isVideoFilename("clip.mp4")).toBe(true);
    expect(isVideoFilename("clip.webm")).toBe(true);
    expect(isVideoFilename("clip.mov")).toBe(true);
    expect(isVideoFilename("CLIP.MP4")).toBe(true);
  });

  it("rejects non-video files", () => {
    expect(isVideoFilename("notes.txt")).toBe(false);
    expect(isVideoFilename("photo.png")).toBe(false);
    expect(isVideoFilename("clip")).toBe(false);
  });
});

describe("isImageFilename", () => {
  it("accepts common still-image formats", () => {
    expect(isImageFilename("thumb.jpg")).toBe(true);
    expect(isImageFilename("thumb.webp")).toBe(true);
  });

  it("rejects a video file", () => {
    expect(isImageFilename("clip.mp4")).toBe(false);
  });
});

describe("deleteStoredFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves without a request for an empty reference", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteStoredFile("")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats an unsupported-method response as reclaimed by the platform", async () => {
    // The gateway has no per-blob DELETE route; 404/405/501 mean the backend
    // scrubber owns reclamation, so this is not a user-facing failure.
    for (const status of [404, 405, 501]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(null, { status })),
      );
      await expect(
        deleteStoredFile("https://gateway/blob/abc"),
      ).resolves.toBeUndefined();
    }
  });

  it("surfaces a genuine storage refusal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(null, { status: 403, statusText: "Forbidden" }),
      ),
    );

    await expect(deleteStoredFile("https://gateway/blob/abc")).rejects.toThrow(
      /403/,
    );
  });

  it("surfaces a network failure with a reachable message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection reset");
      }),
    );

    await expect(deleteStoredFile("https://gateway/blob/abc")).rejects.toThrow(
      /Could not reach storage/,
    );
  });
});
