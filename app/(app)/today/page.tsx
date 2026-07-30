import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CardsThreeIcon } from "@phosphor-icons/react/dist/ssr";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDueSummary } from "@/features/srs/queue";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Today" };

const COMING_NEXT = [
  {
    title: "Kanji Tamago",
    detail:
      "Stroke order, radical breakdown, and three quiz modes on the same schedule.",
    phase: "Phase 3",
  },
  {
    title: "Guided writing",
    detail:
      "Write from a reviewed grammar bank. Paste-back and mechanical checks keep it useful without AI.",
    phase: "Phase 4",
  },
  {
    title: "Conversation",
    detail:
      "Real-time voice practice with an optimized 3D avatar. The API key never leaves the server.",
    phase: "Phase 5",
  },
];

export default async function TodayPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { timezone: true },
  });
  const summary = await getDueSummary(
    session.userId,
    user?.timezone ?? "Asia/Tokyo",
  );

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back, {session.username}
        </h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          One review queue for everything due today.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CardsThreeIcon size={24} weight="duotone" />
          </div>
          <div>
            <p className="font-mono text-3xl font-semibold tabular-nums">
              {summary.total}
            </p>
            <p className="text-sm text-muted-foreground">
              {summary.total === 1 ? "item" : "items"} due
              {summary.byKind.vocab > 0
                ? ` · ${summary.byKind.vocab} vocab`
                : ""}
            </p>
          </div>
        </div>
        <Button
          asChild={summary.total > 0}
          size="lg"
          disabled={summary.total === 0}
        >
          {summary.total > 0 ? (
            <Link href="/anki/session">Start review</Link>
          ) : (
            <span>All caught up</span>
          )}
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Coming next
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMING_NEXT.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-border bg-card p-4"
            >
              <p className="font-mono text-[0.7rem] text-primary">
                {item.phase}
              </p>
              <h3 className="mt-1.5 font-medium">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
