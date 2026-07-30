import "server-only";

import { prisma } from "@/lib/db";
import { newState } from "@/features/srs/scheduler";
import { startOfDayInZone } from "@/features/timer/clock";
import type {
  ReviewCardDto,
  ReviewDirection,
  SrsStateDto,
} from "@/features/anki/types";

/**
 * Antrean review terpadu. Sekarang hanya kind VOCAB yang punya data; KANJI dan
 * GRAMMAR menempel ke `ReviewItem` yang sama di fase berikutnya, jadi `/today`
 * cukup memperluas query ini tanpa mengganti arsitektur.
 */

const DAY_MS = 86_400_000;

/** Awal hari esok di zona user: batas "jatuh tempo hari ini" ala Anki. */
export function endOfTodayInZone(now: Date, timeZone: string): Date {
  return startOfDayInZone(new Date(now.getTime() + DAY_MS), timeZone);
}

function serializeState(state: {
  stability: number;
  difficulty: number;
  state: number;
  reps: number;
  lapses: number;
  scheduledDays: number;
  elapsedDays: number;
  lastReviewedAt: Date | null;
  dueAt: Date;
}): SrsStateDto {
  return {
    stability: state.stability,
    difficulty: state.difficulty,
    state: state.state,
    reps: state.reps,
    lapses: state.lapses,
    scheduledDays: state.scheduledDays,
    elapsedDays: state.elapsedDays,
    lastReviewedAt: state.lastReviewedAt?.toISOString() ?? null,
    dueAt: state.dueAt.toISOString(),
  };
}

export type ReviewQueueOptions = {
  deck?: string;
  direction?: ReviewDirection;
  limit?: number;
};

/** Kartu vocab yang jatuh tempo hingga akhir hari ini, tertua dulu. */
export async function getVocabReviewQueue(
  userId: string,
  timezone: string,
  options: ReviewQueueOptions = {},
): Promise<ReviewCardDto[]> {
  const cutoff = endOfTodayInZone(new Date(), timezone);
  const rows = await prisma.reviewState.findMany({
    where: {
      userId,
      direction: options.direction ?? "RECOGNIZE",
      dueAt: { lt: cutoff },
      item: {
        kind: "VOCAB",
        vocab: options.deck ? { deck: options.deck } : undefined,
      },
    },
    orderBy: { dueAt: "asc" },
    take: options.limit ?? 200,
    include: { item: { include: { vocab: true } } },
  });

  return rows.flatMap((row) => {
    const vocab = row.item.vocab;
    if (!vocab) return [];
    return [
      {
        stateId: row.id,
        itemId: row.itemId,
        kind: "VOCAB",
        direction: row.direction,
        vocab: {
          deck: vocab.deck,
          term: vocab.term,
          reading: vocab.reading,
          meaning: vocab.meaning,
          sentence: vocab.sentence,
          sentenceMeaning: vocab.sentenceMeaning,
          audioFile: vocab.audioFile,
          imageFile: vocab.imageFile,
        },
        state: serializeState(row),
      } satisfies ReviewCardDto,
    ];
  });
}

export type DeckDueCount = { deck: string; due: number };

export type DueSummary = {
  total: number;
  byKind: { vocab: number; kanji: number; grammar: number };
  decks: DeckDueCount[];
};

/** Ringkasan jumlah jatuh tempo untuk dashboard `/today` dan pemilih deck. */
export async function getDueSummary(
  userId: string,
  timezone: string,
): Promise<DueSummary> {
  const cutoff = endOfTodayInZone(new Date(), timezone);
  const dueWhere = {
    userId,
    direction: "RECOGNIZE" as const,
    dueAt: { lt: cutoff },
  };

  const [vocab, kanji, grammar, deckRows] = await Promise.all([
    prisma.reviewState.count({
      where: { ...dueWhere, item: { kind: "VOCAB" } },
    }),
    prisma.reviewState.count({
      where: { ...dueWhere, item: { kind: "KANJI" } },
    }),
    prisma.reviewState.count({
      where: { ...dueWhere, item: { kind: "GRAMMAR" } },
    }),
    prisma.reviewState.findMany({
      where: { ...dueWhere, item: { kind: "VOCAB" } },
      select: { item: { select: { vocab: { select: { deck: true } } } } },
    }),
  ]);

  const deckCounts = new Map<string, number>();
  for (const row of deckRows) {
    const deck = row.item.vocab?.deck;
    if (!deck) continue;
    deckCounts.set(deck, (deckCounts.get(deck) ?? 0) + 1);
  }

  return {
    total: vocab + kanji + grammar,
    byKind: { vocab, kanji, grammar },
    decks: [...deckCounts.entries()]
      .map(([deck, due]) => ({ deck, due }))
      .sort((a, b) => b.due - a.due),
  };
}


// ─────────────────────────────────────────
// Kanji review queue (kind KANJI)
//
// Berbeda dari vocab: kanji hasil seed belum punya ReviewState, jadi antrean
// juga memunculkan item BARU (belum pernah dilihat), bukan hanya yang due.
// submitReview membuat ReviewState pada review pertama.
// ─────────────────────────────────────────

type KanjiRow = {
  character: string;
  readings: string;
  meaning: string;
  chapter: string;
  topic: string;
  category: string;
  examples: unknown;
};

function kanjiCard(
  itemId: string,
  stateId: string,
  kanji: KanjiRow,
  state: SrsStateDto,
  direction: ReviewDirection,
): ReviewCardDto {
  return {
    stateId,
    itemId,
    kind: "KANJI",
    direction,
    kanji: {
      character: kanji.character,
      readings: kanji.readings,
      meaning: kanji.meaning,
      chapter: kanji.chapter,
      topic: kanji.topic,
      category: kanji.category,
      examples:
        (kanji.examples as
          | { word: string; yomi: string; imi: string }[]
          | null) ?? null,
    },
    state,
  };
}

export async function getKanjiReviewQueue(
  userId: string,
  timezone: string,
  options: {
    limit?: number;
    newLimit?: number;
    direction?: ReviewDirection;
  } = {},
): Promise<ReviewCardDto[]> {
  const direction = options.direction ?? "RECOGNIZE";
  const cutoff = endOfTodayInZone(new Date(), timezone);

  const dueStates = await prisma.reviewState.findMany({
    where: {
      userId,
      direction,
      dueAt: { lt: cutoff },
      item: { kind: "KANJI" },
    },
    orderBy: { dueAt: "asc" },
    take: options.limit ?? 30,
    include: { item: { include: { kanji: true } } },
  });
  const due = dueStates.flatMap((row) =>
    row.item.kanji
      ? [
          kanjiCard(
            row.itemId,
            row.id,
            row.item.kanji,
            serializeState(row),
            direction,
          ),
        ]
      : [],
  );

  const freshState = serializeState(newState(new Date()));
  const newItems = await prisma.reviewItem.findMany({
    where: {
      kind: "KANJI",
      kanji: { isNot: null },
      states: { none: { userId, direction } },
    },
    orderBy: { createdAt: "asc" },
    take: options.newLimit ?? 15,
    include: { kanji: true },
  });
  const fresh = newItems.flatMap((item) =>
    item.kanji
      ? [kanjiCard(item.id, `new:${item.id}`, item.kanji, freshState, direction)]
      : [],
  );

  return [...due, ...fresh];
}

export async function getKanjiSessionCounts(
  userId: string,
  timezone: string,
  direction: ReviewDirection = "RECOGNIZE",
): Promise<{ due: number; fresh: number }> {
  const cutoff = endOfTodayInZone(new Date(), timezone);
  const [due, fresh] = await Promise.all([
    prisma.reviewState.count({
      where: { userId, direction, dueAt: { lt: cutoff }, item: { kind: "KANJI" } },
    }),
    prisma.reviewItem.count({
      where: { kind: "KANJI", states: { none: { userId, direction } } },
    }),
  ]);
  return { due, fresh };
}
