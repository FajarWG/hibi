"use client";

import Link from "next/link";
import { motion, MotionConfig } from "motion/react";

import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <MotionConfig reducedMotion="user">
      <section className="relative flex min-h-[100dvh] items-center pt-16">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-2 lg:gap-16">
          {/* Left: copy */}
          <motion.div
            className="flex flex-col justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="mb-4 text-sm font-medium tracking-wide text-primary">
              Daily Japanese practice
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tighter text-foreground md:text-5xl lg:text-6xl">
              Study a little,{" "}
              <span lang="ja" className="font-jp">
                日々
              </span>
            </h1>
            <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-muted-foreground md:text-lg">
              Four focused practices in one calm space. Spaced repetition,
              writing, kanji, and conversation.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/register">Get started</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </motion.div>

          {/* Right: ambient visual */}
          <motion.div
            className="relative hidden items-center justify-center lg:flex"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            aria-hidden
          >
            <div className="relative aspect-square w-full max-w-sm">
              {/* Concentric rings representing the four practices */}
              <div className="absolute inset-0 rounded-full border border-border/60" />
              <div className="absolute inset-6 rounded-full border border-border/50" />
              <div className="absolute inset-12 rounded-full border border-border/40" />
              <div className="absolute inset-18 rounded-full border border-primary/20" />
              {/* Center mark */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-3 rounded-full bg-primary/60" />
              </div>
              {/* Floating labels on the rings */}
              <span className="absolute left-1/2 top-3 -translate-x-1/2 text-xs font-medium text-muted-foreground">
                Cards
              </span>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground">
                Kanji
              </span>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                Writing
              </span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                Talk
              </span>
            </div>
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}
