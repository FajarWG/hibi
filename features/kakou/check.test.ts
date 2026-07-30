import { describe, expect, test } from "bun:test";

import {
  checkWriting,
  passedAll,
  passedCount,
  type GrammarForCheck,
} from "@/features/kakou/check";

const plain: GrammarForCheck = { pattern: "N1 は N2 です", expectedForms: null };
const withForms: GrammarForCheck = {
  pattern: "～を〜ます",
  expectedForms: [{ kind: "particle", match: "を", label: "partikel を" }],
};

describe("checkWriting", () => {
  test("all base checks pass for a valid Japanese sentence", () => {
    const checks = checkWriting("わたしは学生です。", plain);
    expect(passedAll(checks)).toBe(true);
  });

  test("flags empty, non-Japanese, short, and unpunctuated text", () => {
    const checks = checkWriting("hi", plain);
    const byId = Object.fromEntries(checks.map((c) => [c.id, c.passed]));
    expect(byId.content).toBe(true);
    expect(byId.japanese).toBe(false);
    expect(byId.length).toBe(false);
    expect(byId["sentence-end"]).toBe(false);
    expect(passedAll(checks)).toBe(false);
  });

  test("adds expectedForms checks and detects presence/absence", () => {
    const has = checkWriting("パンを食べます。", withForms);
    expect(has.find((c) => c.id === "form-particle")?.passed).toBe(true);
    const missing = checkWriting("パンは食べます。", withForms);
    expect(missing.find((c) => c.id === "form-particle")?.passed).toBe(false);
  });

  test("passedCount reports how many checks passed", () => {
    expect(passedCount(checkWriting("あ", plain))).toBeGreaterThanOrEqual(2);
  });
});
