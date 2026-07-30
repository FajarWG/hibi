"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import {
  previewGrades,
  REVIEW_GRADES,
  type ReviewGrade,
} from "@/features/srs/scheduler";
import { reviveState, type SrsStateDto } from "@/features/anki/types";

const GRADE_META: Record<
  ReviewGrade,
  { label: string; shortcut: string; dot: string; ring: string }
> = {
  AGAIN: { label: "Again", shortcut: "1", dot: "bg-grade-again", ring: "focus-visible:ring-grade-again/40" },
  HARD: { label: "Hard", shortcut: "2", dot: "bg-grade-hard", ring: "focus-visible:ring-grade-hard/40" },
  GOOD: { label: "Good", shortcut: "3", dot: "bg-grade-good", ring: "focus-visible:ring-grade-good/40" },
  EASY: { label: "Easy", shortcut: "4", dot: "bg-grade-easy", ring: "focus-visible:ring-grade-easy/40" },
};

type GradingBarProps = {
  state: SrsStateDto;
  onGrade: (grade: ReviewGrade) => void;
  disabled?: boolean;
};

export function GradingBar({ state, onGrade, disabled }: GradingBarProps) {
  // Interval dihitung dari engine murni yang sama dengan server, jadi label
  // yang dilihat user cocok dengan jadwal yang akan tersimpan.
  const intervals = useMemo(() => {
    const previews = previewGrades(reviveState(state));
    return Object.fromEntries(
      previews.map((p) => [p.grade, p.intervalLabel]),
    ) as Record<ReviewGrade, string>;
  }, [state]);

  return (
    <div
      role="group"
      aria-label="Rate how well you recalled this card"
      className="grid grid-cols-4 gap-2"
    >
      {REVIEW_GRADES.map((grade) => {
        const meta = GRADE_META[grade];
        return (
          <button
            key={grade}
            type="button"
            disabled={disabled}
            onClick={() => onGrade(grade)}
            aria-label={`${meta.label}, next review in ${intervals[grade]}`}
            aria-keyshortcuts={meta.shortcut}
            className={cn(
              "group flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-2 py-3",
              "text-sm font-medium transition-colors outline-none",
              "hover:bg-muted focus-visible:ring-3",
              "disabled:pointer-events-none disabled:opacity-50",
              meta.ring,
            )}
          >
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2", meta.dot)} aria-hidden />
              {meta.label}
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {intervals[grade]}
            </span>
            <span className="font-mono text-[0.65rem] text-muted-foreground/60">
              {meta.shortcut}
            </span>
          </button>
        );
      })}
    </div>
  );
}
