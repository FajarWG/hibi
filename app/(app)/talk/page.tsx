import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { aiEnabled } from "@/lib/env";
import { getSession } from "@/lib/session";
import { TALK_LEVELS, TALK_SCENARIOS } from "@/features/talk/scenarios";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Talk" };

export default async function TalkPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Conversation
        </h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          Real-time spoken practice. Pick a scenario and level. The API key
          stays on the server — the browser only gets a short-lived token.
        </p>
        {!aiEnabled && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            Conversation needs a Gemini API key on the server. Every other study
            feature works without it.
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {TALK_SCENARIOS.map((scenario) => (
          <article
            key={scenario.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
          >
            <div>
              <h2 className="font-medium">{scenario.title}</h2>
              <p className="text-sm text-muted-foreground">
                {scenario.description}
              </p>
            </div>
            <ol className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              {scenario.stages.map((stage, index) => (
                <li
                  key={stage}
                  className="rounded-full border border-border px-2 py-0.5"
                >
                  {index + 1}. {stage}
                </li>
              ))}
            </ol>
            <div className="mt-auto flex gap-2">
              {TALK_LEVELS.map((level) => (
                <Link
                  key={level.id}
                  href={`/talk/room?scenario=${scenario.id}&level=${level.id}`}
                  aria-disabled={!aiEnabled}
                  className={cn(
                    "inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted",
                    !aiEnabled && "pointer-events-none opacity-50",
                  )}
                >
                  {level.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
