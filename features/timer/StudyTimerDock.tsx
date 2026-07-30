"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Pause, Play, Stop, Timer } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration, type TimerView } from "@/features/timer/clock";
import {
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
} from "@/features/timer/actions";

/** Diam berapa lama sebelum dock menciut sendiri saat timer berjalan. */
const AUTO_COLLAPSE_MS = 8000;
const STORAGE_KEY = "hibi.timer.collapsed";

type Props = {
  timer: TimerView | null;
  todaySeconds: number;
};

export function StudyTimerDock({ timer, todaySeconds }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [pending, startAction] = useTransition();

  const [collapsed, setCollapsed] = useState(false);
  const [display, setDisplay] = useState(timer?.elapsedSeconds ?? 0);
  const [interactionTick, setInteractionTick] = useState(0);

  const isRunning = timer?.status === "RUNNING";
  const isPaused = timer?.status === "PAUSED";

  // Baca localStorage setelah hydration. Callback requestAnimationFrame
  // menjaga effect sebagai subscription, bukan rangkaian render sinkron.
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const setCollapsedPersisted = useCallback((next: boolean) => {
    setCollapsed(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }, []);

  const noteInteraction = useCallback(() => {
    setInteractionTick((value) => value + 1);
  }, []);

  // Nilai awal berasal dari server. Layout memberi komponen key baru setiap
  // status timer berubah, jadi state ini diinisialisasi ulang setelah action.
  // Effect hanya mendaftarkan interval dan tidak menulis state secara sinkron.
  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      setDisplay((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  // Tab yang lama tidak aktif akan menyimpang; sinkronkan ulang saat kembali.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  // Menciut sendiri hanya saat berjalan, supaya tidak menghalangi layar.
  useEffect(() => {
    if (!isRunning || collapsed) return;
    const id = window.setTimeout(() => {
      setCollapsedPersisted(true);
    }, AUTO_COLLAPSE_MS);
    return () => window.clearTimeout(id);
  }, [isRunning, collapsed, interactionTick, setCollapsedPersisted]);

  const run = useCallback(
    (action: () => Promise<void>) => {
      noteInteraction();
      startAction(async () => {
        await action();
      });
    },
    [noteInteraction, startAction],
  );

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 30 };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 sm:p-6"
      onPointerDown={noteInteraction}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {collapsed ? (
          <motion.button
            key="collapsed"
            layoutId="study-timer"
            type="button"
            onClick={() => {
              noteInteraction();
              setCollapsedPersisted(false);
            }}
            initial={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
            transition={transition}
            aria-label={
              isRunning
                ? `Study timer running, ${formatDuration(display)}. Open timer controls`
                : "Open study timer controls"
            }
            className="pointer-events-auto flex items-center gap-2 border-2 border-foreground bg-card py-2 pr-3 pl-2.5 shadow-brutal focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Timer
              className={cn("size-4", isRunning ? "text-primary" : "text-muted-foreground")}
              weight="duotone"
              aria-hidden
            />
            <span className="font-mono text-xs tabular-nums">
              {formatDuration(display)}
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            layoutId="study-timer"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            transition={transition}
            role="group"
            aria-label="Study timer"
            className="pointer-events-auto flex items-center gap-3 border-2 border-foreground bg-card p-2 pl-3.5 shadow-brutal"
          >
            <div className="flex flex-col leading-tight">
              <span
                className="font-mono text-sm tabular-nums"
                aria-live="off"
              >
                {formatDuration(display)}
              </span>
              <span className="text-[0.7rem] text-muted-foreground">
                Today {formatDuration(todaySeconds)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {!timer && (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => startTimer())}
                >
                  <Play weight="fill" aria-hidden />
                  Start
                </Button>
              )}

              {isRunning && (
                <Button
                  size="icon-sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(pauseTimer)}
                  aria-label="Pause study timer"
                >
                  <Pause weight="fill" aria-hidden />
                </Button>
              )}

              {isPaused && (
                <Button
                  size="icon-sm"
                  disabled={pending}
                  onClick={() => run(resumeTimer)}
                  aria-label="Resume study timer"
                >
                  <Play weight="fill" aria-hidden />
                </Button>
              )}

              {timer && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(stopTimer)}
                  aria-label="End study session"
                >
                  <Stop weight="fill" aria-hidden />
                </Button>
              )}

              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  noteInteraction();
                  setCollapsedPersisted(true);
                }}
                aria-label="Hide timer"
              >
                <span aria-hidden className="text-muted-foreground">
                  &rsaquo;
                </span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
