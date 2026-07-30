"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MotionConfig } from "motion/react";

import { Button } from "@/components/ui/button";
import { type ReviewGrade } from "@/features/srs/scheduler";
import { Flashcard } from "@/features/anki/Flashcard";
import { GradingBar } from "@/features/anki/GradingBar";
import { SessionSummary, type FlushState } from "@/features/anki/SessionSummary";
import { submitReview } from "@/features/anki/actions";
import {
  drainReviews,
  enqueueReview,
  removeReviews,
} from "@/features/anki/offline-queue";
import type { ReviewCardDto, ReviewSubmission } from "@/features/anki/types";

const ZERO: Record<ReviewGrade, number> = {
  AGAIN: 0,
  HARD: 0,
  GOOD: 0,
  EASY: 0,
};
const KEY_TO_GRADE: Record<string, ReviewGrade> = {
  "1": "AGAIN",
  "2": "HARD",
  "3": "GOOD",
  "4": "EASY",
};

export function ReviewSession({ cards }: { cards: ReviewCardDto[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [counts, setCounts] = useState<Record<ReviewGrade, number>>({ ...ZERO });
  const [flushState, setFlushState] = useState<FlushState>("idle");
  const shownAtRef = useRef<number>(0);

  const total = cards.length;
  const finished = index >= total;
  const current = cards[index];

  // Flush yang melacak status simpan, ditampilkan di ringkasan sesi. Hanya
  // dipanggil dari event handler (grade / tombol retry), bukan dari effect.
  const flush = useCallback(async () => {
    const { keys, subs } = await drainReviews();
    if (subs.length === 0) return;
    setFlushState("saving");
    try {
      await submitReview(subs);
      await removeReviews(keys);
      setFlushState("saved");
    } catch {
      setFlushState("error");
    }
  }, []);

  // Reset stopwatch tiap kartu berganti. Effect boleh memanggil fungsi impure.
  useEffect(() => {
    shownAtRef.current = Date.now();
  }, [index]);

  // Durabilitas latar: kirim sisa antrean dari sesi yang terputus, dan saat
  // tab disembunyikan/ditutup. Sengaja tidak menyentuh state agar tidak memicu
  // render berantai di dalam effect.
  useEffect(() => {
    let cancelled = false;
    const background = async () => {
      const { keys, subs } = await drainReviews();
      if (cancelled || subs.length === 0) return;
      try {
        await submitReview(subs);
        await removeReviews(keys);
      } catch {
        // biarkan tersimpan di IndexedDB untuk percobaan berikutnya
      }
    };
    void background();
    const onHide = () => {
      if (document.visibilityState === "hidden") void background();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, []);

  const grade = useCallback(
    async (value: ReviewGrade) => {
      if (!current) return;
      const sub: ReviewSubmission = {
        itemId: current.itemId,
        direction: current.direction,
        grade: value,
        reviewedAt: new Date().toISOString(),
        elapsedMs: Math.min(3_600_000, Date.now() - shownAtRef.current),
      };
      await enqueueReview(sub); // durabilitas: tersimpan sebelum kartu berganti
      setCounts((c) => ({ ...c, [value]: c[value] + 1 }));
      const next = index + 1;
      setIndex(next);
      setRevealed(false);
      if (next >= total) void flush();
    },
    [current, index, total, flush],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (finished) return;
      if (!revealed && (event.code === "Space" || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && KEY_TO_GRADE[event.key]) {
        event.preventDefault();
        void grade(KEY_TO_GRADE[event.key]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, finished, grade]);

  if (total === 0) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="font-heading text-xl font-semibold">All caught up</h2>
        <p className="text-sm text-muted-foreground">
          No cards are due right now. Come back later or add new material.
        </p>
        <Button asChild variant="default">
          <Link href="/today">Back to today</Link>
        </Button>
      </div>
    );
  }

  if (finished) {
    return (
      <SessionSummary counts={counts} flushState={flushState} onRetry={flush} />
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">
            {index + 1} / {total}
          </span>
          <Link href="/today" className="hover:text-foreground">
            End session
          </Link>
        </div>

        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={index}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>

        <Flashcard
          card={current}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
        />

        {revealed ? (
          <GradingBar state={current.state} onGrade={grade} />
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Press{" "}
            <kbd className="rounded border border-border px-1 font-mono">
              Space
            </kbd>{" "}
            to reveal, then{" "}
            <kbd className="rounded border border-border px-1 font-mono">1</kbd>–
            <kbd className="rounded border border-border px-1 font-mono">4</kbd>{" "}
            to grade.
          </p>
        )}
      </div>
    </MotionConfig>
  );
}
