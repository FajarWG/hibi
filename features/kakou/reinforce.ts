import "server-only";

import { getVocabReviewQueue } from "@/features/srs/queue";

/**
 * Mode "Vocabulary Reinforcement" (PLAN 7.2.4): ambil beberapa kata yang sedang
 * jatuh tempo di SRS, lalu minta user menulis kalimat memakainya. Inilah yang
 * mengikat Anki dan Kakou menjadi satu sistem.
 */

export type ReinforcementWord = {
  term: string;
  reading: string;
  meaning: string;
};

export async function getReinforcementWords(
  userId: string,
  timezone: string,
  count = 5,
): Promise<ReinforcementWord[]> {
  const cards = await getVocabReviewQueue(userId, timezone, { limit: count });
  return cards
    .filter((card) => card.vocab)
    .slice(0, count)
    .map((card) => ({
      term: card.vocab!.term,
      reading: card.vocab!.reading,
      meaning: card.vocab!.meaning,
    }));
}
