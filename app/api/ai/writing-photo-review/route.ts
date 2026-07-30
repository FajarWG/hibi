import { NextResponse } from "next/server";
import { z } from "zod";

import { aiEnabled } from "@/lib/env";
import { getSession } from "@/lib/session";
import { AiQuotaError, reviewWritingPhoto } from "@/lib/ai";

/**
 * Review tulisan tangan dari FOTO buku catatan (Kakou alur kertas). Auth
 * wajib; kunci Gemini tidak pernah ke client. Bila kuota AI kita habis,
 * balas 429 supaya UI menawarkan jalur manual (prompt + tempel JSON).
 */

const bodySchema = z.object({
  // base64 tanpa prefix data URL.
  imageBase64: z.string().min(1).max(12_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  pattern: z.string().max(200),
  meaning: z.string().max(500),
  parts: z.array(z.string().max(500)).max(10).default([]),
});

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
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
    const result = await reviewWritingPhoto(body);
    return NextResponse.json(result);
  } catch (cause) {
    if (cause instanceof AiQuotaError) {
      // Kuota AI kita habis → sinyal ke client untuk beralih ke mode manual.
      return NextResponse.json({ error: "quota_exhausted" }, { status: 429 });
    }
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
