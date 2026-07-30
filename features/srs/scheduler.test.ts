import { describe, expect, test } from "bun:test";

import {
  formatInterval,
  gradeToRating,
  isDue,
  newState,
  previewGrades,
  retrievability,
  REVIEW_GRADES,
  schedule,
  type SrsState,
} from "@/features/srs/scheduler";

const NOW = new Date("2026-07-30T00:00:00.000Z");

// State bergaya kartu Anki hasil migrasi: sudah pernah di-review, state Review.
const migrated: SrsState = {
  stability: 8,
  difficulty: 5,
  state: 2,
  reps: 4,
  lapses: 0,
  scheduledDays: 8,
  elapsedDays: 8,
  lastReviewedAt: new Date("2026-07-22T00:00:00.000Z"),
  dueAt: new Date("2026-07-30T00:00:00.000Z"),
};

describe("grade mapping", () => {
  test("maps the four visible grades to ts-fsrs ratings 1..4", () => {
    expect(REVIEW_GRADES.map(gradeToRating)).toEqual([1, 2, 3, 4]);
  });
});

describe("newState", () => {
  test("creates a New card due immediately", () => {
    const state = newState(NOW);
    expect(state.state).toBe(0);
    expect(state.reps).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.dueAt.getTime()).toBe(NOW.getTime());
  });
});

describe("schedule", () => {
  test("a Good review on a new card advances due date and reps", () => {
    const { state, log } = schedule(newState(NOW), "GOOD", NOW);
    expect(state.reps).toBe(1);
    expect(state.dueAt.getTime()).toBeGreaterThan(NOW.getTime());
    expect(log.rating).toBe(3);
    // log menyimpan snapshot SEBELUM transisi: state New = 0.
    expect(log.state).toBe(0);
    expect(log.reviewedAt.getTime()).toBe(NOW.getTime());
  });

  test("Again schedules sooner than Good on the same card", () => {
    const again = schedule(migrated, "AGAIN", NOW).state;
    const good = schedule(migrated, "GOOD", NOW).state;
    expect(again.dueAt.getTime()).toBeLessThan(good.dueAt.getTime());
  });

  test("Again on a Review card records a lapse", () => {
    const { state } = schedule(migrated, "AGAIN", NOW);
    expect(state.lapses).toBe(migrated.lapses + 1);
  });

  test("Good on a stable Review card extends stability", () => {
    const { state } = schedule(migrated, "GOOD", NOW);
    expect(state.stability).toBeGreaterThan(migrated.stability);
    expect(state.state).toBe(2);
  });

  test("does not mutate the input state", () => {
    const snapshot = structuredClone(migrated);
    schedule(migrated, "EASY", NOW);
    expect(migrated).toEqual(snapshot);
  });
});

describe("previewGrades", () => {
  test("returns four grades with non-decreasing intervals", () => {
    const previews = previewGrades(migrated, NOW);
    expect(previews.map((p) => p.grade)).toEqual([
      "AGAIN",
      "HARD",
      "GOOD",
      "EASY",
    ]);
    const dues = previews.map((p) => p.dueAt.getTime());
    expect(dues[0]).toBeLessThanOrEqual(dues[1]);
    expect(dues[1]).toBeLessThanOrEqual(dues[2]);
    expect(dues[2]).toBeLessThanOrEqual(dues[3]);
    for (const preview of previews) {
      expect(preview.intervalLabel).toMatch(/^\d/);
    }
  });

  test("preview matches what schedule would produce", () => {
    const previews = previewGrades(migrated, NOW);
    const good = previews.find((p) => p.grade === "GOOD")!;
    const scheduled = schedule(migrated, "GOOD", NOW).state;
    expect(good.dueAt.getTime()).toBe(scheduled.dueAt.getTime());
  });
});

describe("retrievability", () => {
  test("is near 1 right after review and decays over time", () => {
    const reviewed = schedule(migrated, "GOOD", NOW).state;
    const rNow = retrievability(reviewed, reviewed.lastReviewedAt ?? NOW);
    const rLater = retrievability(
      reviewed,
      new Date(reviewed.dueAt.getTime() + 30 * 86_400_000),
    );
    expect(rNow).toBeGreaterThan(0.85);
    expect(rLater).toBeLessThan(rNow);
  });
});

describe("isDue", () => {
  test("true when due date has passed, false otherwise", () => {
    expect(isDue(migrated, NOW)).toBe(true);
    const future = schedule(migrated, "EASY", NOW).state;
    expect(isDue(future, NOW)).toBe(false);
  });
});

describe("formatInterval", () => {
  test("renders minutes, hours, days, months and years", () => {
    expect(formatInterval(0)).toBe("1m");
    expect(formatInterval(10 / 1440)).toBe("10m");
    expect(formatInterval(2 / 24)).toBe("2h");
    expect(formatInterval(3)).toBe("3d");
    expect(formatInterval(60)).toBe("2mo");
    expect(formatInterval(730)).toBe("2.0y");
  });
});
