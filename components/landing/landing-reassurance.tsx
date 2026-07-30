"use client";

import { ArrowsClockwise, WifiSlash, ShieldCheck } from "@phosphor-icons/react";
import { motion, MotionConfig } from "motion/react";

const points = [
  {
    icon: ArrowsClockwise,
    title: "Anki data, preserved",
    description:
      "Import your existing collection. Due dates and intervals carry over intact, so you never restart from zero.",
  },
  {
    icon: WifiSlash,
    title: "Works without AI",
    description:
      "Core study features run without an API key. AI feedback is an enhancement, not a requirement.",
  },
  {
    icon: ShieldCheck,
    title: "Your keys stay safe",
    description:
      "API credentials remain on the server. Nothing sensitive is exposed to the browser.",
  },
] as const;

export function LandingReassurance() {
  return (
    <MotionConfig reducedMotion="user">
      <section
        className="border-t border-border bg-card"
        aria-labelledby="reassurance-heading"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <motion.h2
            id="reassurance-heading"
            className="text-2xl font-bold tracking-tight text-foreground md:text-3xl"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Built for real study habits
          </motion.h2>
          <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted-foreground md:text-base">
            Hibi is designed around data you already have and routines you
            already keep.
          </p>

          <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            {points.map((point, i) => (
              <motion.div
                key={point.title}
                className="flex flex-col gap-3"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <point.icon
                  size={24}
                  weight="duotone"
                  className="text-primary"
                  aria-hidden
                />
                <h3 className="text-base font-semibold text-foreground">
                  {point.title}
                </h3>
                <p className="max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
                  {point.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
