import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getReinforcementWords } from "@/features/kakou/reinforce";
import { ReinforcePanel } from "@/features/kakou/ReinforcePanel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Reinforcement" };

export default async function ReinforcePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { timezone: true },
  });
  const words = await getReinforcementWords(
    session.userId,
    user?.timezone ?? "Asia/Tokyo",
  );
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/kakou"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon /> Library
      </Link>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Vocabulary reinforcement
      </h1>

      {words.length === 0 ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No vocabulary is due right now, so there is nothing to reinforce yet.
            Review some cards first.
          </p>
          <Button asChild variant="outline">
            <Link href="/anki">Go to cards</Link>
          </Button>
        </div>
      ) : (
        <ReinforcePanel words={words} />
      )}
    </div>
  );
}
