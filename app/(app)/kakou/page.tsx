import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import {
  getGrammarLibrary,
  type GrammarStatus,
} from "@/features/kakou/library";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Writing" };

const STATUS_META: Record<
  GrammarStatus,
  { label: string; badge: string }
> = {
  untouched: {
    label: "New",
    badge: "border border-border text-muted-foreground",
  },
  learning: { label: "Learning", badge: "bg-primary/10 text-primary" },
  mastered: { label: "Mastered", badge: "bg-primary text-primary-foreground" },
  struggling: {
    label: "Needs work",
    badge: "bg-destructive/10 text-destructive",
  },
};

function pct(part: number, total: number): string {
  return total === 0 ? "0%" : `${((part / total) * 100).toFixed(1)}%`;
}

export default async function KakouPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const library = await getGrammarLibrary(session.userId);
  const grandTotal = library.reduce((sum, level) => sum + level.total, 0);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Grammar library
        </h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          Every pattern in your writing bank, with your progress on each.{" "}
          <span className="font-mono tabular-nums">{grandTotal}</span> patterns
          from the reviewed Bunpou and Katsuyou sources.
        </p>
        <Link
          href="/kakou/reinforce"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Vocabulary reinforcement →
        </Link>
      </section>

      {library.map((level) => (
        <section key={level.level} className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-heading text-lg font-semibold">
              {level.level}
            </h2>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {level.counts.mastered}/{level.total} mastered
            </span>
          </div>

          <div
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${level.level}: ${level.counts.mastered} mastered, ${level.counts.learning} learning, ${level.counts.struggling} need work, ${level.counts.untouched} new`}
          >
            <div
              className="bg-primary"
              style={{ width: pct(level.counts.mastered, level.total) }}
            />
            <div
              className="bg-primary/40"
              style={{ width: pct(level.counts.learning, level.total) }}
            />
            <div
              className="bg-destructive/60"
              style={{ width: pct(level.counts.struggling, level.total) }}
            />
          </div>

          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {level.points.map((point) => (
              <li key={point.id}>
                <Link
                  href={`/kakou/practice/${point.id}`}
                  className="flex items-center justify-between gap-4 bg-card px-4 py-2.5 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p lang="ja" className="truncate font-jp text-sm">
                      {point.pattern}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {point.meaningId}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_META[point.status].badge,
                    )}
                  >
                    {STATUS_META[point.status].label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
