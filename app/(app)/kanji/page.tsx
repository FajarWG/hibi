import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/phase-placeholder";

export const metadata: Metadata = { title: "Kanji" };

export default function KanjiPage() {
  return (
    <PhasePlaceholder
      title="Kanji Tamago"
      phase="Phase 3"
      description="Learn each character through recall, recognition, reading, and visible stroke order."
      scope={[
        "KanjiVG stroke animation available before and after an attempt",
        "Radical breakdowns and cached mnemonics",
        "Three quiz directions on the shared FSRS schedule",
      ]}
    />
  );
}
