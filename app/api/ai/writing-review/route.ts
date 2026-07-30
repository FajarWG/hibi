import { NextResponse } from "next/server";
import { z } from "zod";

import { aiEnabled } from "@/lib/env";
import { getSession } from "@/lib/session";
import { reviewWriting } from "@/lib/ai";

/**
 * Proxy AI untuk review tulisan. Auth wajib; kunci Gemini tidak pernah ke
 * client. Rate limit sederhana per-user (per instance server) sebagai rem
 * kasar — bukan pengganti limiter terdistribusi.
 */

const bodySchema = z.object({
  text: z.string().min(1).max(5000),
  pattern: z.string().max(200),
  meaning: z.string().max(500),
});

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
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

  try {
    const result = await reviewWriting(body);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
