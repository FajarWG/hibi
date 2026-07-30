"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/features/auth/actions";

/**
 * Simpan sesi tulis Kakou + hasil review, lalu perbarui tabel Weakness.
 * Ini feedback loop yang tidak ada di Nihongo Flow: koreksi yang berkategori
 * menaikkan hitungan titik lemah, yang nanti dipakai untuk prompt adaptif.
 */

const correctionSchema = z.object({
  span: z.string().max(200).optional(),
  issue: z.string().min(1).max(500),
  suggestion: z.string().max(500).optional(),
  category: z.string().max(64).optional(),
});

const submitSchema = z.object({
  grammarId: z.string().min(1).max(64),
  text: z.string().max(5000),
  tier: z.enum(["mechanical", "paste-back"]),
  corrections: z.array(correctionSchema).max(50).default([]),
  scores: z
    .object({
      accuracy: z.number().min(0).max(100),
      complexity: z.number().min(0).max(100),
      naturalness: z.number().min(0).max(100),
    })
    .nullable()
    .default(null),
  flaggedWeak: z.boolean().default(false),
});

export type SubmitWritingResult = {
  sessionId: string;
  weaknessesUpdated: number;
};

export async function submitWriting(
  input: unknown,
): Promise<SubmitWritingResult> {
  const userId = await requireUserId();
  const data = submitSchema.parse(input);

  const grammar = await prisma.grammarPoint.findUnique({
    where: { id: data.grammarId },
    select: { pattern: true, writingTask: true, weaknessTags: true, level: true },
  });
  if (!grammar) throw new Error("Grammar point not found");

  const session = await prisma.writingSession.create({
    data: {
      userId,
      grammarId: data.grammarId,
      mode: "grammar",
      level: grammar.level,
      prompt: {
        pattern: grammar.pattern,
        writingTask: grammar.writingTask,
      } as Prisma.InputJsonValue,
      text: data.text,
      status: "COMPLETED",
      completedAt: new Date(),
      reviews: {
        create: {
          tier: data.tier,
          corrections: data.corrections as unknown as Prisma.InputJsonValue,
          scores: data.scores
            ? (data.scores as Prisma.InputJsonValue)
            : Prisma.DbNull,
        },
      },
    },
    select: { id: true },
  });

  // Kumpulkan kategori titik lemah: dari koreksi yang berkategori, dan dari
  // tag pola bila user menandai masih kesulitan pada self-review.
  const tags = new Set<string>();
  for (const correction of data.corrections) {
    if (correction.category) tags.add(correction.category);
  }
  if (data.flaggedWeak) {
    for (const tag of grammar.weaknessTags as string[]) tags.add(tag);
  }

  const now = new Date();
  for (const category of tags) {
    await prisma.weakness.upsert({
      where: { userId_category: { userId, category } },
      update: { hits: { increment: 1 }, lastSeen: now },
      create: { userId, category },
    });
  }

  revalidatePath("/kakou");
  return { sessionId: session.id, weaknessesUpdated: tags.size };
}
