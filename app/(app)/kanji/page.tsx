import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCapIcon } from "@phosphor-icons/react/dist/ssr";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getKanjiSessionCounts } from "@/features/srs/queue";
import { getKanjiLibrary, type KanjiStatus } from "@/features/kanji/library";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Kanji" };

const STATUS_DOT: Record<KanjiStatus, string> = {
  untouched: "bg-muted-foreground/30",
  learning: "bg-primary/50",
  mastered: "bg-primary",
  struggling: "bg-destructive",
};

export default async function KanjiPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { timezone: true },
  });
  const [chapters, counts] = await Promise.all([
    getKanjiLibrary(session.userId),
    getKanjiSessionCounts(session.userId, user?.timezone ?? "Asia/Tokyo"),
  ]);
  const total = chapters.reduce((sum, c) => sum + c.total, 0);
  const toReview = counts.due + counts.fresh;

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Kanji Tamago
        </h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{total}</span> kanji and
          vocabulary items across {chapters.length} chapters.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCapIcon size={24} weight="duotone" />
          </div>
          <div>
            <p className="font-mono text-3xl font-semibold tabular-nums">
              {toReview}
            </p>
            <p className="text-sm text-muted-foreground">
              {counts.due} due · {counts.fresh} new
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild={toReview > 0} size="lg" disabled={toReview === 0}>
            {toReview > 0 ? (
              <Link href="/kanji/session">Recognition</Link>
            ) : (
              <span>All caught up</span>
            )}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/kanji/session?mode=recall">Recall (write)</Link>
          </Button>
        </div>
      </section>

      {chapters.map((chapter) => (
        <section key={chapter.chapter} className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-heading text-lg font-semibold">
              <span className="text-muted-foreground">
                Chapter {chapter.chapter}
              </span>{" "}
              <span lang="ja" className="font-jp">
                {chapter.topic}
              </span>
            </h2>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {chapter.mastered}/{chapter.total}
            </span>
          </div>

          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {chapter.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <span
                  lang="ja"
                  className="font-jp text-2xl leading-none"
                  aria-hidden
                >
                  {item.character}
                </span>
                <div className="min-w-0 flex-1">
                  <p lang="ja" className="truncate font-jp text-xs">
                    {item.readings}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.meaning}
                  </p>
                </div>
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    STATUS_DOT[item.status],
                  )}
                  title={item.status}
                  aria-label={`Status: ${item.status}`}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
