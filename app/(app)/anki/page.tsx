import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CardsThreeIcon } from "@phosphor-icons/react/dist/ssr";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDueSummary } from "@/features/srs/queue";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Cards" };

export default async function AnkiPage() {
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
  const vocabDue = summary.byKind.vocab;

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Vocabulary
        </h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          Your migrated Anki cards, now on one FSRS schedule. Due dates were
          preserved during migration.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CardsThreeIcon size={24} weight="duotone" />
          </div>
          <div>
            <p className="font-mono text-3xl font-semibold tabular-nums">
              {vocabDue}
            </p>
            <p className="text-sm text-muted-foreground">
              {vocabDue === 1 ? "card" : "cards"} due today
            </p>
          </div>
        </div>
        <Button
          asChild={vocabDue > 0}
          size="lg"
          disabled={vocabDue === 0}
          variant="default"
        >
          {vocabDue > 0 ? (
            <Link href="/anki/session">Start review</Link>
          ) : (
            <span>Nothing due</span>
          )}
        </Button>
      </section>

      {summary.decks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            By deck
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {summary.decks.map((deck) => (
              <li
                key={deck.deck}
                className="flex items-center justify-between gap-4 bg-card px-4 py-3"
              >
                <span lang="ja" className="font-jp text-sm">
                  {deck.deck}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {deck.due}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/anki/session?deck=${encodeURIComponent(deck.deck)}`}
                    >
                      Review
                    </Link>
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
