import "server-only";

import { prisma } from "@/lib/db";

/** Browse Kanji Tamago: entri dikelompokkan per bab, status per kanji dari
 *  ReviewState user (untouched/learning/mastered/struggling). */

export type KanjiStatus =
  | "untouched"
  | "learning"
  | "mastered"
  | "struggling";

export type KanjiLibraryItem = {
  id: string;
  character: string;
  readings: string;
  meaning: string;
  category: string;
  status: KanjiStatus;
};

export type KanjiChapter = {
  chapter: string;
  topic: string;
  total: number;
  mastered: number;
  items: KanjiLibraryItem[];
};

function deriveStatus(
  state: { state: number; lapses: number; reps: number } | undefined,
): KanjiStatus {
  if (!state || state.reps === 0) return "untouched";
  if (state.state === 3 || state.lapses >= 2) return "struggling";
  if (state.state === 2) return "mastered";
  return "learning";
}

export async function getKanjiLibrary(userId: string): Promise<KanjiChapter[]> {
  const entries = await prisma.kanjiEntry.findMany({
    orderBy: [{ chapter: "asc" }, { category: "asc" }, { character: "asc" }],
    select: {
      id: true,
      chapter: true,
      topic: true,
      category: true,
      character: true,
      readings: true,
      meaning: true,
      reviewItem: {
        select: {
          states: {
            where: { userId, direction: "RECOGNIZE" },
            select: { state: true, lapses: true, reps: true },
            take: 1,
          },
        },
      },
    },
  });

  const byChapter = new Map<string, KanjiChapter>();
  for (const entry of entries) {
    const status = deriveStatus(entry.reviewItem?.states[0]);
    const chapter = byChapter.get(entry.chapter) ?? {
      chapter: entry.chapter,
      topic: entry.topic,
      total: 0,
      mastered: 0,
      items: [],
    };
    chapter.total += 1;
    if (status === "mastered") chapter.mastered += 1;
    chapter.items.push({
      id: entry.id,
      character: entry.character,
      readings: entry.readings,
      meaning: entry.meaning,
      category: entry.category,
      status,
    });
    byChapter.set(entry.chapter, chapter);
  }

  return [...byChapter.values()].sort(
    (a, b) => Number(a.chapter) - Number(b.chapter),
  );
}
