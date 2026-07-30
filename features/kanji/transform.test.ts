import { describe, expect, test } from "bun:test";

import {
  buildKanjiBank,
  chapterToEntries,
  validateKanjiBank,
  type LegacyKanjiChapter,
} from "@/features/kanji/transform";

const chapter: LegacyKanjiChapter = {
  ka: 1,
  topik: "どうぞよろしく！",
  teishutsu_kanji: {
    kanji: [{ moji: "私", yomi: "わたし (watashi)", imi: "saya" }],
  },
  yomeru: {
    kata: [{ moji: "牛肉", yomi: "ぎゅうにく (gyuuniku)", imi: "daging sapi" }],
  },
};

describe("chapterToEntries", () => {
  test("flattens categories into entries with string chapter", () => {
    const entries = chapterToEntries(chapter, {
      私: [{ word: "私立", yomi: "しりつ", imi: "swasta" }],
    });
    expect(entries).toHaveLength(2);
    const teishutsu = entries.find((e) => e.category === "teishutsu_kanji")!;
    expect(teishutsu.chapter).toBe("1");
    expect(teishutsu.character).toBe("私");
    expect(teishutsu.readings).toBe("わたし (watashi)");
    expect(teishutsu.meaning).toBe("saya");
    expect(teishutsu.examples).toEqual([
      { word: "私立", yomi: "しりつ", imi: "swasta" },
    ]);
    const yomeru = entries.find((e) => e.category === "yomeru")!;
    expect(yomeru.character).toBe("牛肉");
    expect(yomeru.examples).toBeNull();
  });
});

describe("buildKanjiBank", () => {
  test("dedups by chapter+category+character", () => {
    expect(buildKanjiBank([chapter, chapter])).toHaveLength(2);
  });
});

describe("validateKanjiBank", () => {
  test("clean entries produce no issues", () => {
    expect(validateKanjiBank(buildKanjiBank([chapter]))).toHaveLength(0);
  });

  test("flags empty readings and bad category", () => {
    const issues = validateKanjiBank([
      {
        chapter: "1",
        topic: "t",
        category: "bogus",
        character: "字",
        readings: "",
        meaning: "m",
        examples: null,
      },
    ]);
    const fields = issues.map((i) => i.field);
    expect(fields).toContain("readings");
    expect(fields).toContain("category");
  });
});
