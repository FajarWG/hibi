import { describe, expect, test } from "bun:test";

import {
  elapsedSeconds,
  formatDuration,
  startOfDayInZone,
  type TimerRecord,
} from "@/features/timer/clock";

const base: TimerRecord = {
  id: "timer-1",
  status: "RUNNING",
  context: null,
  accumulatedSeconds: 30,
  lastStartedAt: new Date("2026-07-30T00:00:00.000Z"),
  startedAt: new Date("2026-07-30T00:00:00.000Z"),
  endedAt: null,
};

describe("elapsedSeconds", () => {
  test("adds current running time to accumulated time", () => {
    expect(
      elapsedSeconds(base, new Date("2026-07-30T00:01:30.000Z")),
    ).toBe(120);
  });

  test("does not advance a paused timer", () => {
    expect(
      elapsedSeconds(
        { ...base, status: "PAUSED", accumulatedSeconds: 75 },
        new Date("2026-07-30T00:10:00.000Z"),
      ),
    ).toBe(75);
  });

  test("clamps a clock skew into the future", () => {
    expect(elapsedSeconds(base, new Date("2026-07-29T23:59:00.000Z"))).toBe(30);
  });
});

describe("formatDuration", () => {
  test("formats durations below and above one hour", () => {
    expect(formatDuration(5)).toBe("00:05");
    expect(formatDuration(3599)).toBe("59:59");
    expect(formatDuration(3661)).toBe("1:01:01");
  });
});

describe("startOfDayInZone", () => {
  test("returns Tokyo midnight as a UTC instant", () => {
    expect(
      startOfDayInZone(
        new Date("2026-07-30T09:00:00.000Z"),
        "Asia/Tokyo",
      ).toISOString(),
    ).toBe("2026-07-29T15:00:00.000Z");
  });

  test("uses the named zone offset instead of a hardcoded JST offset", () => {
    expect(
      startOfDayInZone(
        new Date("2026-07-30T12:00:00.000Z"),
        "America/New_York",
      ).toISOString(),
    ).toBe("2026-07-30T04:00:00.000Z");
  });
});
