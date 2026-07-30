"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/db";
import { requireUserId } from "@/features/auth/actions";
import { newState, schedule, type SrsState } from "@/features/srs/scheduler";

/**
 * Menyimpan hasil review. PENTING soal keamanan: state FSRS baru dihitung ulang
 * di server dari state yang tersimpan di database. Grade dan waktu review dari
 * client dipakai sebagai input, tetapi state yang dikirim client TIDAK
 * dipercaya, jadi interval tidak bisa dimanipulasi dari browser.
 */

const submissionSchema = z.object({
  itemId: z.string().min(1).max(64),
  direction: z.enum(["RECOGNIZE", "RECALL"]),
  grade: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
  reviewedAt: z.iso.datetime(),
  elapsedMs: z.number().int().min(0).max(3_600_000),
});

const payloadSchema = z.array(submissionSchema).min(1).max(500);

export type SubmitReviewResult = { applied: number; skipped: number };

function toState(row: {
  stability: number;
  difficulty: number;
  state: number;
  reps: number;
  lapses: number;
  scheduledDays: number;
  elapsedDays: number;
  lastReviewedAt: Date | null;
  dueAt: Date;
}): SrsState {
  return {
    stability: row.stability,
    difficulty: row.difficulty,
    state: row.state,
    reps: row.reps,
    lapses: row.lapses,
    scheduledDays: row.scheduledDays,
    elapsedDays: row.elapsedDays,
    lastReviewedAt: row.lastReviewedAt,
    dueAt: row.dueAt,
  };
}

/** Batasi waktu review agar tidak bisa dicurangi ke masa depan. */
function clampReviewedAt(raw: string, now: Date): Date {
  const at = new Date(raw);
  if (Number.isNaN(at.getTime()) || at.getTime() > now.getTime()) return now;
  return at;
}

export async function submitReview(
  submissionsInput: unknown,
): Promise<SubmitReviewResult> {
  const userId = await requireUserId();
  const submissions = payloadSchema.parse(submissionsInput);
  const now = new Date();

  // Satu pembacaan untuk semua state yang relevan.
  const itemIds = [...new Set(submissions.map((s) => s.itemId))];
  const states = await prisma.reviewState.findMany({
    where: { userId, itemId: { in: itemIds } },
  });
  const byKey = new Map(states.map((s) => [`${s.itemId}:${s.direction}`, s]));

  // Pastikan itemId benar-benar milik ReviewItem yang valid sebelum membuat
  // state baru (mencegah baris dengan FK karangan dari client).
  const validItemIds = new Set(
    (
      await prisma.reviewItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true },
      })
    ).map((i) => i.id),
  );

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  let applied = 0;
  let skipped = 0;

  for (const sub of submissions) {
    const key = `${sub.itemId}:${sub.direction}`;
    const existing = byKey.get(key);
    const reviewedAt = clampReviewedAt(sub.reviewedAt, now);

    if (!existing && !validItemIds.has(sub.itemId)) {
      skipped += 1;
      continue;
    }

    const current = existing ? toState(existing) : newState(reviewedAt);
    const { state, log } = schedule(current, sub.grade, reviewedAt);

    const stateData = {
      stability: state.stability,
      difficulty: state.difficulty,
      state: state.state,
      reps: state.reps,
      lapses: state.lapses,
      scheduledDays: state.scheduledDays,
      elapsedDays: state.elapsedDays,
      lastReviewedAt: state.lastReviewedAt,
      dueAt: state.dueAt,
    };
    const logData = {
      rating: log.rating,
      state: log.state,
      stability: log.stability,
      difficulty: log.difficulty,
      elapsedDays: log.elapsedDays,
      scheduledDays: log.scheduledDays,
      dueAt: log.dueAt,
      elapsedMs: sub.elapsedMs,
      reviewedAt,
    };

    if (existing) {
      ops.push(
        prisma.reviewState.update({
          where: { id: existing.id },
          data: { ...stateData, logs: { create: logData } },
        }),
      );
    } else {
      ops.push(
        prisma.reviewState.create({
          data: {
            userId,
            itemId: sub.itemId,
            direction: sub.direction,
            ...stateData,
            logs: { create: logData },
          },
        }),
      );
    }
    applied += 1;
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }

  revalidatePath("/today");
  revalidatePath("/anki");

  return { applied, skipped };
}
