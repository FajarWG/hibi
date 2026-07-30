import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/phase-placeholder";

export const metadata: Metadata = { title: "Cards" };

export default function AnkiPage() {
  return (
    <PhasePlaceholder
      title="Vocabulary cards"
      phase="Phase 2"
      description="Your existing Anki cards and review history will move here without resetting their due dates."
      scope={[
        "One shared FSRS schedule for vocabulary, kanji, and grammar",
        "Recognition and write-the-kanji directions tracked separately",
        "A local review queue that survives a closed tab",
      ]}
    />
  );
}
