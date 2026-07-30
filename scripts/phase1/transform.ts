import { createHash } from "node:crypto";
import { posix } from "node:path";
import sanitizeHtml from "sanitize-html";

import type {
  DekiruCard,
  LegacyAnkiCard,
  LegacyProgress,
  ReviewItemSeed,
  ReviewSeed,
  UnmatchedProgress,
  VocabSeed,
} from "@/scripts/phase1/types";

const DAY_MS = 86_400_000;

export function stableId(prefix: string, source: string): string {
  const digest = createHash("sha256").update(source).digest("hex").slice(0, 28);
  return `${prefix}_${digest}`;
}

export function sanitizeSentence(value: string | null): string | null {
  if (!value?.trim()) return null;
  const withoutSound = value.replace(/\[sound:.+?\]/gi, "");
  const clean = sanitizeHtml(withoutSound, {
    allowedTags: [
      "br",
      "div",
      "p",
      "span",
      "ruby",
      "rt",
      "rp",
      "b",
      "strong",
      "i",
      "em",
      "u",
      "sub",
      "sup",
    ],
    allowedAttributes: {
      span: ["class"],
      ruby: ["class"],
    },
    allowedSchemes: [],
  }).trim();
  return clean || null;
}

export function normalizeMediaReference(value: string | null): string | null {
  if (!value?.trim()) return null;
  const sound = /^\[sound:(.+)]$/i.exec(value.trim());
  let candidate = (sound?.[1] ?? value).trim().replaceAll("\\", "/");
  candidate = candidate.replace(/^\/?anki-media\//, "").replace(/^\.\//, "");
  const normalized = posix.normalize(candidate);
  if (
    normalized === "." ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    /^[a-zA-Z]:\//.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function customSeed(card: LegacyAnkiCard): VocabSeed {
  const legacyKey = `custom-${card.id}`;
  return {
    id: stableId("vc", legacyKey),
    legacyKey,
    legacyAnkiId: card.id,
    source: "CUSTOM",
    deck: card.deckName,
    chapter: null,
    sectionIndex: 0,
    sourceOrder: null,
    term: card.kanji,
    reading: card.hiragana,
    meaning: card.translation,
    romaji: card.romaji || null,
    audioFile: normalizeMediaReference(card.audio),
    imageFile: normalizeMediaReference(card.image),
    sentence: sanitizeSentence(card.sentence),
    sentenceMeaning: card.sentenceTranslation || null,
    sentenceAudioFile: normalizeMediaReference(card.sentenceAudio),
    createdAt: card.createdAt,
  };
}

function dekiruSeed(card: DekiruCard, migratedAt: Date): VocabSeed {
  const legacyKey = card.cardKey;
  return {
    id: stableId("vc", legacyKey),
    legacyKey,
    legacyAnkiId: null,
    source: "DEKIRU",
    deck: "Dekiru Nihongo N5",
    chapter: card.chapter,
    sectionIndex: card.sectionIndex,
    sourceOrder: card.sourceOrder,
    term: card.kanji,
    reading: card.hiragana,
    meaning: card.translation,
    romaji: card.romaji,
    audioFile: null,
    imageFile: null,
    sentence: null,
    sentenceMeaning: null,
    sentenceAudioFile: null,
    createdAt: migratedAt,
  };
}

export function buildVocabSeeds(
  customCards: LegacyAnkiCard[],
  dekiruCards: DekiruCard[],
  migratedAt: Date,
): {
  cards: VocabSeed[];
  items: ReviewItemSeed[];
  byLegacyCardKey: Map<string, VocabSeed>;
} {
  const custom = customCards.map(customSeed);
  const dekiru = dekiruCards.map((card) => dekiruSeed(card, migratedAt));
  const cards = [...custom, ...dekiru];
  const byLegacyCardKey = new Map<string, VocabSeed>();

  for (const card of custom) {
    byLegacyCardKey.set(`custom-${card.legacyAnkiId}`, card);
  }
  for (let index = 0; index < dekiru.length; index += 1) {
    byLegacyCardKey.set(dekiruCards[index].cardKey, dekiru[index]);
  }

  return {
    cards,
    items: cards.map((card) => ({
      id: stableId("ri", card.id),
      vocabId: card.id,
    })),
    byLegacyCardKey,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Map SM-2 ease to FSRS difficulty: default 2.5 -> 5, minimum 1.3 -> 10. */
export function difficultyFromEase(ease: number): number {
  return Number(clamp(5 + (2.5 - ease) * (5 / 1.2), 1, 10).toFixed(6));
}

export function reviewSeed(
  progress: LegacyProgress,
  userId: string,
  itemId: string,
  migratedAt: Date,
): ReviewSeed {
  const hasSuccessfulReview = progress.repetitions > 0;
  return {
    id: stableId("rs", `${userId}:${itemId}:RECOGNIZE`),
    userId,
    itemId,
    legacyProgressId: progress.id,
    legacyCardKey: progress.cardKey,
    legacyInterval: progress.interval,
    legacyEase: progress.ease,
    legacyRepetitions: progress.repetitions,
    stability:
      progress.interval > 0 ? Math.max(0.1, progress.interval) : 0,
    difficulty: difficultyFromEase(progress.ease),
    state: hasSuccessfulReview ? 2 : 3,
    reps: Math.max(1, progress.repetitions),
    lapses: hasSuccessfulReview ? 0 : 1,
    scheduledDays: Math.max(0, progress.interval),
    elapsedDays: Math.max(
      0,
      Math.floor((migratedAt.getTime() - progress.updatedAt.getTime()) / DAY_MS),
    ),
    lastReviewedAt: progress.updatedAt,
    dueAt: progress.dueDate,
    createdAt: progress.createdAt,
  };
}

export function resolveReviewSeeds(
  progressRows: LegacyProgress[],
  legacyUserMap: Map<number, string>,
  byLegacyCardKey: Map<string, VocabSeed>,
  migratedAt: Date,
): { reviews: ReviewSeed[]; unmatched: UnmatchedProgress[] } {
  const reviews: ReviewSeed[] = [];
  const unmatched: UnmatchedProgress[] = [];

  for (const progress of progressRows) {
    const userId = legacyUserMap.get(progress.userId);
    if (!userId) {
      unmatched.push({
        progressId: progress.id,
        legacyUserId: progress.userId,
        cardKey: progress.cardKey,
        reason: "USER_NOT_FOUND",
      });
      continue;
    }

    const card = byLegacyCardKey.get(progress.cardKey);
    if (!card) {
      unmatched.push({
        progressId: progress.id,
        legacyUserId: progress.userId,
        cardKey: progress.cardKey,
        reason: progress.cardKey.startsWith("custom-")
          ? "CUSTOM_CARD_NOT_FOUND"
          : "DEKIRU_CARD_NOT_FOUND",
      });
      continue;
    }

    reviews.push(
      reviewSeed(progress, userId, stableId("ri", card.id), migratedAt),
    );
  }

  return { reviews, unmatched };
}
