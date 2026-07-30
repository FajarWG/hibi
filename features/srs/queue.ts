import "server-only";

import { prisma } from "@/lib/db";
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
