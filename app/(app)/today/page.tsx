import type { Metadata } from "next";

import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Today" };

const NEXT_UP = [
  {
    title: "One review queue",
    detail:
      "Vocabulary, kanji, and grammar due today will share one FSRS schedule instead of three disconnected systems.",
    phase: "Phase 2",
  },
  {
    title: "Guided writing",
    detail:
      "Write from a reviewed grammar bank. If the AI quota runs out, paste-back and mechanical checks keep the session useful.",
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

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back, {session?.username}
        </h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          The foundation is ready: authentication, light and dark themes, and a study timer that follows you through the app.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Coming next</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NEXT_UP.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-border bg-card p-4"
            >
              <p className="font-mono text-[0.7rem] text-primary">{item.phase}</p>
              <h3 className="mt-1.5 font-medium">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
