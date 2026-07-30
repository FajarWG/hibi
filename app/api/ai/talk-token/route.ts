import { NextResponse } from "next/server";
import { z } from "zod";

import { aiEnabled } from "@/lib/env";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createTalkToken, TALK_MODEL } from "@/lib/ai";
import { getReinforcementWords } from "@/features/kakou/reinforce";
import { buildSystemPrompt, getScenario } from "@/features/talk/scenarios";

/**
 * Mints a short-lived Gemini Live token. The real API key never leaves the
 * server; the browser only ever receives an ephemeral token locked to a brief
 * expiry. Auth required; lightly rate limited per user.
 */

const bodySchema = z.object({
  scenario: z.string().max(40),
  level: z.enum(["N5", "N4", "N3"]),
});

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(userId, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!aiEnabled) {
    return NextResponse.json({ error: "ai_disabled" }, { status: 503 });
  }
  if (rateLimited(session.userId)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const scenario = getScenario(body.scenario);
  if (!scenario) {
    return NextResponse.json({ error: "unknown_scenario" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { timezone: true },
  });
  const words = (
    await getReinforcementWords(
      session.userId,
      user?.timezone ?? "Asia/Tokyo",
      6,
    )
  ).map((word) => word.term);
  const systemInstruction = buildSystemPrompt(body.level, scenario, words);

  try {
    const token = await createTalkToken();
    return NextResponse.json({ token, model: TALK_MODEL, systemInstruction });
  } catch {
    return NextResponse.json({ error: "token_failed" }, { status: 502 });
  }
}
