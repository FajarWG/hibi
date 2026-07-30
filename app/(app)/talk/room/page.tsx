import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { aiEnabled } from "@/lib/env";
import { getSession } from "@/lib/session";
import { getScenario, type TalkLevel } from "@/features/talk/scenarios";
import { TalkRoom } from "@/features/talk/TalkRoom";

export const metadata: Metadata = { title: "Conversation" };

export default async function TalkRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; level?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!aiEnabled) redirect("/talk");

  const { scenario: scenarioId, level } = await searchParams;
  const scenario = scenarioId ? getScenario(scenarioId) : undefined;
  const validLevel = level === "N5" || level === "N4" || level === "N3";
  if (!scenario || !validLevel) redirect("/talk");

  return (
    <div className="mx-auto max-w-2xl py-2">
      <TalkRoom
        scenario={scenario.id}
        level={level as TalkLevel}
        title={scenario.title}
      />
    </div>
  );
}
