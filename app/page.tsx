import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
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

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/today");

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
