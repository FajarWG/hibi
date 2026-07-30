import "server-only";

import { prisma } from "@/lib/db";

/**
 * Data untuk halaman Library: setiap GrammarPoint dengan status per pola
 * yang diturunkan dari ReviewState milik user. Ini tulang punggung Kakou —
 * peta cakupan sekaligus pintu masuk latihan (PLAN 7.2b).
 */

export type GrammarStatus =
  | "untouched"
  | "learning"
  | "mastered"
  | "struggling";

export type LibraryPoint = {
  id: string;
  pattern: string;
  meaningId: string;
  status: GrammarStatus;
};

export type LibraryLevel = {
  level: string;
  total: number;
  counts: Record<GrammarStatus, number>;
  points: LibraryPoint[];
};

const LEVEL_ORDER = ["N5", "N4", "N3", "N2", "N1"];

function deriveStatus(
  state: { state: number; lapses: number; reps: number } | undefined,
): GrammarStatus {
  if (!state || state.reps === 0) return "untouched";
  if (state.state === 3 || state.lapses >= 2) return "struggling"; // Relearning
  if (state.state === 2) return "mastered"; // Review
  return "learning"; // New / Learning
}

export async function getGrammarLibrary(
  userId: string,
): Promise<LibraryLevel[]> {
  const points = await prisma.grammarPoint.findMany({
    orderBy: [{ level: "asc" }, { chapter: "asc" }, { pattern: "asc" }],
    select: {
      id: true,
      level: true,
      pattern: true,
      meaningId: true,
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

  const byLevel = new Map<string, LibraryLevel>();
  for (const point of points) {
    const status = deriveStatus(point.reviewItem?.states[0]);
    const level = byLevel.get(point.level) ?? {
      level: point.level,
      total: 0,
      counts: { untouched: 0, learning: 0, mastered: 0, struggling: 0 },
      points: [],
    };
    level.total += 1;
    level.counts[status] += 1;
    level.points.push({
      id: point.id,
      pattern: point.pattern,
      meaningId: point.meaningId,
      status,
    });
    byLevel.set(point.level, level);
  }

  return [...byLevel.values()].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level),
  );
}
