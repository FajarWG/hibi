"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUserId } from "@/features/auth/actions";
import { elapsedSeconds } from "@/features/timer/clock";

/**
 * Semua aksi timer merevalidasi seluruh layout app karena dock timer
 * hadir di setiap halaman.
 */
function refreshShell(): void {
  revalidatePath("/", "layout");
}

async function findActive(userId: string) {
  return prisma.studyTimer.findUnique({
    where: { activeKey: userId },
  });
}

/** Start a new session only when no active timer exists. */
export async function startTimer(context?: string): Promise<void> {
  const userId = await requireUserId();
  const existing = await findActive(userId);
  if (existing) return;

  const now = new Date();
  try {
    await prisma.studyTimer.create({
      data: {
        userId,
        activeKey: userId,
        status: "RUNNING",
        context: context ?? null,
        lastStartedAt: now,
        startedAt: now,
      },
    });
  } catch (error) {
    // A second tab may win the unique activeKey race. If an active timer now
    // exists, that is the desired result; only rethrow genuine DB failures.
    if (!(await findActive(userId))) throw error;
  }

  refreshShell();
}

export async function pauseTimer(): Promise<void> {
  const userId = await requireUserId();
  const active = await findActive(userId);
  if (!active || active.status !== "RUNNING") return;

  const now = new Date();
  await prisma.studyTimer.update({
    where: { id: active.id },
    data: {
      accumulatedSeconds: elapsedSeconds(active, now),
      lastStartedAt: null,
      status: "PAUSED",
    },
  });

  refreshShell();
}

export async function resumeTimer(): Promise<void> {
  const userId = await requireUserId();
  const active = await findActive(userId);
  if (!active || active.status !== "PAUSED") return;

  await prisma.studyTimer.update({
    where: { id: active.id },
    data: { lastStartedAt: new Date(), status: "RUNNING" },
  });

  refreshShell();
}

export async function stopTimer(): Promise<void> {
  const userId = await requireUserId();
  const active = await findActive(userId);
  if (!active) return;

  const now = new Date();
  await prisma.studyTimer.update({
    where: { id: active.id },
    data: {
      activeKey: null,
      accumulatedSeconds: elapsedSeconds(active, now),
      lastStartedAt: null,
      status: "ENDED",
      endedAt: now,
    },
  });

  refreshShell();
}
