import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/phase-placeholder";

export const metadata: Metadata = { title: "Talk" };

export default function TalkPage() {
  return (
    <PhasePlaceholder
      title="AI conversation"
      phase="Phase 5"
      description="Practice real-time Japanese conversation with a retained, optimized 3D avatar."
      scope={[
        "The Gemini key stays on the server behind a rate-limited relay",
        "N5, N4, and N3 scenario controls",
        "Saved transcripts with corrections and vocabulary follow-up",
      ]}
    />
  );
}
