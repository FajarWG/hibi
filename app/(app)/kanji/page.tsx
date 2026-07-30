import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { getKanjiLibrary, type KanjiStatus } from "@/features/kanji/library";
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

  const chapters = await getKanjiLibrary(session.userId);
  const total = chapters.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Kanji Tamago
        </h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{total}</span> kanji and
          vocabulary items across {chapters.length} chapters. Stroke order and
          quizzes come next; this is your coverage map.
        </p>
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
