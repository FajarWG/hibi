import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getVocabReviewQueue } from "@/features/srs/queue";
import { ReviewSession } from "@/features/anki/ReviewSession";

export const metadata: Metadata = { title: "Reviewing" };

export default async function AnkiSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { deck } = await searchParams;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { timezone: true },
  });

  const cards = await getVocabReviewQueue(
    session.userId,
    user?.timezone ?? "Asia/Tokyo",
    { deck },
  );

  return (
    <div className="py-4">
      <ReviewSession cards={cards} />
    </div>
  );
}
