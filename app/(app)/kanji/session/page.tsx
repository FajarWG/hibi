import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getKanjiReviewQueue } from "@/features/srs/queue";
import { ReviewSession } from "@/features/anki/ReviewSession";

export const metadata: Metadata = { title: "Reviewing kanji" };

export default async function KanjiSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { mode } = await searchParams;
  const direction = mode === "recall" ? "RECALL" : "RECOGNIZE";
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { timezone: true },
  });
  const cards = await getKanjiReviewQueue(
    session.userId,
    user?.timezone ?? "Asia/Tokyo",
    { direction },
  );

  return (
    <div className="py-4">
      <ReviewSession cards={cards} />
    </div>
  );
}
