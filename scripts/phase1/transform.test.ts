import { describe, expect, test } from "bun:test";

import {
  buildVocabSeeds,
  difficultyFromEase,
  normalizeMediaReference,
  resolveReviewSeeds,
  sanitizeSentence,
} from "@/scripts/phase1/transform";
import type {
  DekiruCard,
  LegacyAnkiCard,
  LegacyProgress,
} from "@/scripts/phase1/types";

const createdAt = new Date("2025-01-01T00:00:00.000Z");
const customCard: LegacyAnkiCard = {
  id: "note-42",
  deckName: "Imported",
  kanji: "日本",
  hiragana: "にほん",
  translation: "Jepang",
  romaji: "nihon",
  audio: "[sound:nihon.mp3]",
  sentence: '<script>alert(1)</script><ruby class="jp">日本<rt>にほん</rt></ruby>',
  sentenceTranslation: "Saya tinggal di Jepang.",
  sentenceAudio: "/anki-media/sentence.mp3",
  image: "anki-media/image.webp",
  createdAt,
};
const hyphenDekiru: DekiruCard = {
  cardKey: "Bab １-0---アメリカ",
  chapter: "Bab １",
  sectionIndex: 0,
  sourceOrder: 0,
  kanji: "-",
  hiragana: "アメリカ",
  romaji: "amerika",
  translation: "Amerika",
};

describe("legacy card identity", () => {
  test("keeps custom and Dekiru keys exactly, including literal hyphens", () => {
    const result = buildVocabSeeds(
      [customCard],
      [hyphenDekiru],
      new Date("2026-07-30T00:00:00.000Z"),
    );

    expect(result.cards.map((card) => card.legacyKey)).toEqual([
      "custom-note-42",
      "Bab １-0---アメリカ",
    ]);
    expect(result.byLegacyCardKey.get("Bab １-0---アメリカ")?.term).toBe("-");
    expect(result.byLegacyCardKey.get("custom-note-42")?.term).toBe("日本");
  });
});

describe("content safety", () => {
  test("sanitizes sentence HTML and strips sound markers", () => {
    expect(
      sanitizeSentence(
        '<p onclick="bad()">文[sound:x.mp3]</p><img src=x onerror=bad()><script>x</script>',
      ),
    ).toBe("<p>文</p>");
  });

  test("normalizes safe media and rejects traversal or absolute paths", () => {
    expect(normalizeMediaReference("[sound:folder\\音声.mp3]")).toBe(
      "folder/音声.mp3",
    );
    expect(normalizeMediaReference("/anki-media/picture.png")).toBe(
      "picture.png",
    );
    expect(normalizeMediaReference("../secret.txt")).toBeNull();
    expect(normalizeMediaReference("/etc/passwd")).toBeNull();
    expect(normalizeMediaReference("C:\\secret.txt")).toBeNull();
  });
});

describe("legacy review conversion", () => {
  test("preserves due date and legacy values verbatim", () => {
    const dueDate = new Date("2026-08-12T12:34:56.789Z");
    const progress: LegacyProgress = {
      id: 7,
      userId: 3,
      cardKey: "Bab １-0---アメリカ",
      chapter: "Bab １",
      sectionIndex: 0,
      interval: 8,
      ease: 2.5,
      repetitions: 4,
      dueDate,
      createdAt,
      updatedAt: new Date("2026-07-29T12:00:00.000Z"),
    };
    const vocab = buildVocabSeeds([], [hyphenDekiru], createdAt);
    const result = resolveReviewSeeds(
      [progress],
      new Map([[3, "user-3"]]),
      vocab.byLegacyCardKey,
      new Date("2026-07-30T12:00:00.000Z"),
    );

    expect(result.unmatched).toHaveLength(0);
    expect(result.reviews[0]).toMatchObject({
      legacyProgressId: 7,
      legacyCardKey: progress.cardKey,
      legacyInterval: 8,
      legacyEase: 2.5,
      legacyRepetitions: 4,
      stability: 8,
      difficulty: 5,
      state: 2,
      dueAt: dueDate,
    });
    expect(result.reviews[0].dueAt.getTime()).toBe(dueDate.getTime());
  });

  test("maps minimum SM-2 ease to maximum FSRS difficulty", () => {
    expect(difficultyFromEase(1.3)).toBe(10);
  });
});
