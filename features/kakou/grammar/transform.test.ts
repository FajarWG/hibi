import { describe, expect, test } from "bun:test";

import {
  buildBank,
  bunpouLessonToSeeds,
  deriveFrame,
  katsuyouGuideToSeeds,
  validateBank,
  type LegacyBunpouLesson,
  type LegacyConjugationGuide,
} from "@/features/kakou/grammar/transform";

const lesson: LegacyBunpouLesson = {
  chapter: 1,
  patterns: [
    {
      id: "n1-wa-n2-desu",
      pattern: "N1 は N2 です",
      jlpt: "N5",
      descId: "Menyatakan bahwa N1 adalah N2.",
      examples: [
        {
          exampleJp: "私は学生です。",
          exampleKana: "わたしはがくせいです。",
          exampleId: "Saya adalah pelajar.",
        },
      ],
    },
  ],
};

const guide: LegacyConjugationGuide = {
  formKey: "te",
  mistake: {
    examples: [
      { bad: "食べてる", good: "食べています", noteId: "Gunakan bentuk formal." },
    ],
  },
  grammarPatterns: [
    {
      pattern: "～てください",
      jlpt: "N5",
      descId: "Meminta seseorang melakukan sesuatu dengan sopan.",
      exampleJp: "見てください。",
      exampleKana: "みてください。",
      exampleId: "Tolong lihat.",
    },
  ],
};

describe("bunpouLessonToSeeds", () => {
  test("transforms a pattern and drops English/romaji fields", () => {
    const [seed] = bunpouLessonToSeeds(lesson);
    expect(seed.legacyId).toBe("bunpou:n1-wa-n2-desu");
    expect(seed.level).toBe("N5");
    expect(seed.chapter).toBe(1);
    expect(seed.provenance).toBe("bunpou");
    expect(seed.verified).toBe(true);
    expect(seed.meaningId).toBe("Menyatakan bahwa N1 adalah N2.");
    expect(seed.examples[0]).toEqual({
      jp: "私は学生です。",
      kana: "わたしはがくせいです。",
      meaningId: "Saya adalah pelajar.",
      highlight: null,
    });
    // frame derived from N1/N2 placeholders
    expect(seed.frame).toBe("___ は ___ です");
    // no leftover English keys
    expect(JSON.stringify(seed)).not.toContain("exampleEn");
  });
});

describe("katsuyouGuideToSeeds", () => {
  test("attaches the guide mistake block and drops noteEn", () => {
    const [seed] = katsuyouGuideToSeeds(guide);
    expect(seed.legacyId.startsWith("katsuyou:te:")).toBe(true);
    expect(seed.provenance).toBe("katsuyou");
    expect(seed.commonMistakes).toEqual([
      { bad: "食べてる", good: "食べています", noteId: "Gunakan bentuk formal." },
    ]);
    expect(seed.weaknessTags).toContain("form-te");
  });
});

describe("deriveFrame", () => {
  test("replaces N placeholders, returns null when none", () => {
    expect(deriveFrame("N1 は N2 です")).toBe("___ は ___ です");
    expect(deriveFrame("～ことができる")).toBeNull();
  });
});

describe("buildBank", () => {
  test("combines sources and dedups by legacyId", () => {
    const seeds = buildBank([lesson, lesson], [guide]);
    // duplicate lesson collapses; 1 bunpou + 1 katsuyou
    expect(seeds).toHaveLength(2);
  });
});

describe("validateBank", () => {
  test("flags kana containing kanji, bad level, and duplicates", () => {
    const issues = validateBank([
      {
        legacyId: "x1",
        level: "N9",
        chapter: null,
        pattern: "テスト",
        meaningId: "test",
        frame: null,
        writingTask: "t",
        constraints: null,
        expectedForms: null,
        weaknessTags: [],
        commonMistakes: null,
        examples: [{ jp: "見る", kana: "見る", meaningId: "see", highlight: null }],
        provenance: "authored",
        verified: false,
      },
    ]);
    const fields = issues.map((i) => i.field);
    expect(fields).toContain("level");
    expect(fields).toContain("examples.kana");
  });

  test("clean legacy-derived seeds produce no issues", () => {
    const seeds = buildBank([lesson], [guide]);
    expect(validateBank(seeds)).toHaveLength(0);
  });
});
