import type { Client } from "pg";

import type {
  ReviewItemSeed,
  ReviewSeed,
  VocabSeed,
} from "@/scripts/phase1/types";

const BATCH_SIZE = 250;

function batches<T>(rows: T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    result.push(rows.slice(index, index + BATCH_SIZE));
  }
  return result;
}

function placeholders(rowCount: number, columnCount: number): string {
  return Array.from({ length: rowCount }, (_, row) => {
    const values = Array.from(
      { length: columnCount },
      (_, column) => `$${row * columnCount + column + 1}`,
    );
    return `(${values.join(", ")})`;
  }).join(",\n");
}

export async function applyVocabCards(
  client: Client,
  cards: VocabSeed[],
): Promise<void> {
  for (const batch of batches(cards)) {
    const columns = 19;
    const values = batch.flatMap((card) => [
      card.id,
      card.legacyKey,
      card.legacyAnkiId,
      card.source,
      card.deck,
      card.chapter,
      card.sectionIndex,
      card.sourceOrder,
      card.term,
      card.reading,
      card.meaning,
      card.romaji,
      card.audioFile,
      card.imageFile,
      card.sentence,
      card.sentenceMeaning,
      card.sentenceAudioFile,
      card.createdAt,
      new Date(),
    ]);
    await client.query(
      `INSERT INTO "hibi_vocab_card"
        ("id", "legacyKey", "legacyAnkiId", "source", "deck", "chapter",
         "sectionIndex", "sourceOrder", "term", "reading", "meaning", "romaji",
         "audioFile", "imageFile", "sentence", "sentenceMeaning",
         "sentenceAudioFile", "createdAt", "updatedAt")
       VALUES ${placeholders(batch.length, columns)}
       ON CONFLICT ("legacyKey") DO UPDATE SET
         "legacyAnkiId" = EXCLUDED."legacyAnkiId",
         "source" = EXCLUDED."source",
         "deck" = EXCLUDED."deck",
         "chapter" = EXCLUDED."chapter",
         "sectionIndex" = EXCLUDED."sectionIndex",
         "sourceOrder" = EXCLUDED."sourceOrder",
         "term" = EXCLUDED."term",
         "reading" = EXCLUDED."reading",
         "meaning" = EXCLUDED."meaning",
         "romaji" = EXCLUDED."romaji",
         "audioFile" = EXCLUDED."audioFile",
         "imageFile" = EXCLUDED."imageFile",
         "sentence" = EXCLUDED."sentence",
         "sentenceMeaning" = EXCLUDED."sentenceMeaning",
         "sentenceAudioFile" = EXCLUDED."sentenceAudioFile",
         "updatedAt" = NOW()`,
      values,
    );
  }
}

export async function applyReviewItems(
  client: Client,
  items: ReviewItemSeed[],
): Promise<void> {
  for (const batch of batches(items)) {
    const values = batch.flatMap((item) => [
      item.id,
      "VOCAB",
      item.vocabId,
      new Date(),
      new Date(),
    ]);
    await client.query(
      `INSERT INTO "hibi_review_item"
        ("id", "kind", "vocabId", "createdAt", "updatedAt")
       VALUES ${placeholders(batch.length, 5)}
       ON CONFLICT ("vocabId") DO UPDATE SET
         "kind" = EXCLUDED."kind",
         "updatedAt" = NOW()`,
      values,
    );
  }
}

/**
 * Review state is insert-once. Re-running ETL must never reset reviews that
 * happened in Hibi after cutover. Legacy values remain in dedicated columns.
 */
export async function applyReviewStates(
  client: Client,
  reviews: ReviewSeed[],
): Promise<void> {
  for (const batch of batches(reviews)) {
    const values = batch.flatMap((review) => [
      review.id,
      review.userId,
      review.itemId,
      "RECOGNIZE",
      review.legacyProgressId,
      review.legacyCardKey,
      review.legacyInterval,
      review.legacyEase,
      review.legacyRepetitions,
      review.stability,
      review.difficulty,
      review.state,
      review.reps,
      review.lapses,
      review.scheduledDays,
      review.elapsedDays,
      review.lastReviewedAt,
      review.dueAt,
      review.createdAt,
      new Date(),
    ]);
    await client.query(
      `INSERT INTO "hibi_review_state"
        ("id", "userId", "itemId", "direction", "legacyProgressId",
         "legacyCardKey", "legacyInterval", "legacyEase", "legacyRepetitions",
         "stability", "difficulty", "state", "reps", "lapses",
         "scheduledDays", "elapsedDays", "lastReviewedAt", "dueAt",
         "createdAt", "updatedAt")
       VALUES ${placeholders(batch.length, 20)}
       ON CONFLICT DO NOTHING`,
      values,
    );
  }
}
