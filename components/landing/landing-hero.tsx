"use client";

import Link from "next/link";
import { motion, MotionConfig } from "motion/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
            <p className="mb-4 font-heading text-xs font-bold tracking-[0.2em] text-primary">
              Daily Japanese practice
            </p>
            <h1 className="font-heading text-4xl font-bold leading-[1.02] tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Study a little,{" "}
              <span lang="ja" className="font-jp normal-case">
                日々
              </span>
            </h1>
            <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-muted-foreground md:text-lg">
              Four focused practices in one plain space. Spaced repetition,
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

          {/* Right: exposed color-block grid of the four practices */}
          <motion.div
            className="relative hidden items-center justify-center lg:flex"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
            aria-hidden
          >
            <div className="grid w-full max-w-md grid-cols-2 border-2 border-foreground shadow-brutal">
              {(
                [
                  ["Cards", "SRS", "bg-primary text-primary-foreground"],
                  ["Writing", "書こう", "bg-background text-foreground"],
                  ["Kanji", "漢字", "bg-background text-foreground"],
                  ["Talk", "話す", "bg-primary text-primary-foreground"],
                ] as const
              ).map(([label, sub, fill], i) => (
                <div
                  key={label}
                  className={cn(
                    "flex aspect-square flex-col justify-between border-foreground p-4",
                    i % 2 === 0 && "border-r-2",
                    i < 2 && "border-b-2",
                    fill,
                  )}
                >
                  <span className="font-heading text-sm font-bold tracking-wide">
                    {label}
                  </span>
                  <span lang="ja" className="font-jp text-2xl font-bold">
                    {sub}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}
