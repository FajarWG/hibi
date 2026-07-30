"use client";

import Link from "next/link";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { REVIEW_GRADES, type ReviewGrade } from "@/features/srs/scheduler";

const LABEL: Record<ReviewGrade, { label: string; dot: string }> = {
  AGAIN: { label: "Again", dot: "bg-grade-again" },
  HARD: { label: "Hard", dot: "bg-grade-hard" },
  GOOD: { label: "Good", dot: "bg-grade-good" },
  EASY: { label: "Easy", dot: "bg-grade-easy" },
};

export type FlushState = "idle" | "saving" | "saved" | "error";

type SessionSummaryProps = {
  counts: Record<ReviewGrade, number>;
  flushState: FlushState;
  onRetry: () => void;
};

export function SessionSummary({
  counts,
  flushState,
  onRetry,
}: SessionSummaryProps) {
  const total = REVIEW_GRADES.reduce((sum, g) => sum + counts[g], 0);

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-xl border border-border bg-card p-6 text-center sm:p-8">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold">Session complete</h2>
        <p className="text-sm text-muted-foreground">
          You reviewed{" "}
          <span className="font-mono tabular-nums">{total}</span>{" "}
          {total === 1 ? "card" : "cards"}.
        </p>
      </div>

      <dl className="grid grid-cols-4 gap-2">
        {REVIEW_GRADES.map((grade) => (
          <div
            key={grade}
            className="flex flex-col items-center gap-1 rounded-lg border border-border py-3"
          >
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2 rounded-full", LABEL[grade].dot)} aria-hidden />
              {LABEL[grade].label}
            </dt>
            <dd className="font-mono text-lg tabular-nums">{counts[grade]}</dd>
          </div>
        ))}
      </dl>

      <div aria-live="polite" className="text-sm">
        {flushState === "saving" && (
          <p className="text-muted-foreground">Saving progress…</p>
        )}
        {flushState === "saved" && (
          <p className="flex items-center justify-center gap-1.5 text-grade-good">
            <CheckCircleIcon weight="fill" /> Progress saved
          </p>
        )}
        {flushState === "error" && (
          <div className="space-y-2">
            <p className="flex items-center justify-center gap-1.5 text-destructive">
              <WarningCircleIcon weight="fill" /> Couldn&apos;t save yet. Your
              answers are stored locally.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry save
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2">
        <Button asChild variant="default">
          <Link href="/today">Back to today</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/anki">Review more</Link>
        </Button>
      </div>
    </div>
  );
}
