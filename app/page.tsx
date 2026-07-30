import type { Metadata } from "next";

import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingReassurance } from "@/components/landing/landing-reassurance";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Hibi - Daily Japanese Practice",
  description:
    "Four focused practices in one calm space: spaced repetition, guided writing, kanji study, and AI conversation. Migrate your Anki data without losing progress.",
};

/**
 * Landing publik statis. Redirect untuk user yang sudah login ditangani di
 * proxy.ts (middleware), jadi halaman ini tidak membaca cookie dan bisa
 * dirender sebagai konten statis (disajikan dari CDN, tanpa serverless).
 */
export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingReassurance />
      </main>
      <LandingFooter />
    </>
  );
}
