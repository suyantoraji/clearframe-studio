import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clamp,
  formatBytes,
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  formatTimecode,
  timestampToDate,
} from "@/lib/format";

const NANOS_PER_MS = 1_000_000n;

describe("timestampToDate", () => {
  it("converts a nanosecond bigint into a Date", () => {
    const date = timestampToDate(1_700_000_000_000n * NANOS_PER_MS);
    expect(date?.getTime()).toBe(1_700_000_000_000);
  });

  it("returns null for an invalid timestamp", () => {
    expect(
      timestampToDate(BigInt(Number.MAX_SAFE_INTEGER) * NANOS_PER_MS),
    ).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats sub-hour durations as m:ss", () => {
    expect(formatDuration(65_000n)).toBe("1:05");
    expect(formatDuration(5_000)).toBe("0:05");
  });

  it("formats hour-plus durations as h:mm:ss", () => {
    expect(formatDuration(3_725_000n)).toBe("1:02:05");
  });

  it("clamps negative durations to zero", () => {
    expect(formatDuration(-1000n)).toBe("0:00");
  });
});

describe("formatTimecode", () => {
  it("formats a broadcast timecode with frames", () => {
    expect(formatTimecode(3_661_500n, 30)).toBe("01:01:01:15");
  });
});

describe("formatBytes", () => {
  it("formats byte counts compactly", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("clamp", () => {
  it("clamps into the inclusive range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T14:05:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports recent timestamps as just now", () => {
    const now = BigInt(Date.now()) * NANOS_PER_MS;
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("reports minutes, hours, and days", () => {
    const base = Date.now();
    expect(formatRelativeTime(BigInt(base - 5 * 60_000) * NANOS_PER_MS)).toBe(
      "5 min ago",
    );
    expect(
      formatRelativeTime(BigInt(base - 3 * 3_600_000) * NANOS_PER_MS),
    ).toBe("3 hr ago");
    expect(
      formatRelativeTime(BigInt(base - 2 * 86_400_000) * NANOS_PER_MS),
    ).toBe("2 days ago");
  });
});

describe("formatDateTime", () => {
  it("returns a non-empty absolute label", () => {
    const label = formatDateTime(1_700_000_000_000n * NANOS_PER_MS);
    expect(label).not.toBe("unknown");
    expect(label.length).toBeGreaterThan(0);
  });
});
