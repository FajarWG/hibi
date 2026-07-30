import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/phase-placeholder";

export const metadata: Metadata = { title: "Writing" };

export default function KakouPage() {
  return (
    <PhasePlaceholder
      title="Guided writing"
      phase="Phase 4"
      description="Practice grammar on paper, review your work, and see which patterns need another pass."
      scope={[
        "A reviewed static bank covering N5, N4, and later N3",
        "Automatic, paste-back, and no-AI review paths",
        "A grammar library with coverage and weakness status",
      ]}
    />
  );
}
