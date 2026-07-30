"use client";

import {
  Cards,
  PencilLine,
  Egg,
  Microphone,
} from "@phosphor-icons/react";
import { motion, MotionConfig } from "motion/react";

const practices = [
  {
    icon: Cards,
    title: "Spaced Repetition",
    description:
      "One unified FSRS schedule surfaces what is due today. Migrate your existing Anki data without losing progress.",
    accent: true,
  },
  {
    icon: PencilLine,
    title: "Kakou",
    description:
      "Guided writing with structured AI feedback and mechanical checks. Practice composition, not just recall.",
    accent: false,
  },
  {
    icon: Egg,
    title: "Kanji Tamago",
    description:
      "Stroke order, radical breakdown, and three quiz modes. Grow your kanji from egg to mastery.",
    accent: false,
  },
  {
    icon: Microphone,
    title: "Talk",
    description:
      "Real-time voice conversation with AI. Your API key never leaves the server.",
    accent: false,
  },
] as const;

export function LandingFeatures() {
  return (
    <MotionConfig reducedMotion="user">
      <section
        className="mx-auto max-w-6xl px-6 py-24 md:py-32"
        aria-labelledby="features-heading"
      >
        <motion.h2
          id="features-heading"
          className="text-2xl font-bold tracking-tight text-foreground md:text-3xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Four practices, one rhythm
        </motion.h2>

        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2">
          {practices.map((practice, i) => (
            <motion.article
              key={practice.title}
              className={`flex flex-col gap-3 bg-background p-8 md:p-10 ${
                practice.accent ? "bg-primary/[0.03]" : ""
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <practice.icon
                size={28}
                weight="duotone"
                className={
                  practice.accent ? "text-primary" : "text-foreground"
                }
                aria-hidden
              />
              <h3 className="text-lg font-semibold text-foreground">
                {practice.title}
              </h3>
              <p className="max-w-[50ch] text-sm leading-relaxed text-muted-foreground">
                {practice.description}
              </p>
            </motion.article>
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}
