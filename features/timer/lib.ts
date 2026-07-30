import "server-only";

import { prisma } from "@/lib/db";
import {
  elapsedSeconds,
  startOfDayInZone,
  toTimerView,
  type TimerView,
} from "@/features/timer/clock";

export async function getActiveTimer(userId: string): Promise<TimerView | null> {
  const record = await prisma.studyTimer.findUnique({
    where: { activeKey: userId },
  });
  return record ? toTimerView(record) : null;
}

export async function getTodaySeconds(
  userId: string,
  timezone: string,
): Promise<number> {
  const dayStart = startOfDayInZone(new Date(), timezone);
  const records = await prisma.studyTimer.findMany({
    where: { userId, startedAt: { gte: dayStart } },
  });
  const now = new Date();
  return records.reduce((total, record) => total + elapsedSeconds(record, now), 0);
}
